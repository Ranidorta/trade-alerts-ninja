"""
Bybit API integration module.

This module provides functions to interact with the Bybit API
for fetching historical data and executing trades.
"""

import pandas as pd
import numpy as np
import requests
import time
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Union

# Try to import pybit, but don't fail if not installed
try:
    from pybit import usdt_perpetual
    from pybit.unified_trading import HTTP as UnifiedHTTP
except ImportError:
    print("Warning: pybit not installed. Some functions may not work.")

# API Configuration
API_KEY = os.getenv("BYBIT_API_KEY", "")
API_SECRET = os.getenv("BYBIT_API_SECRET", "")
TESTNET = os.getenv("USE_TESTNET", "True").lower() in ("true", "1", "t")

class BybitAPI:
    """Bybit API wrapper class."""
    
    def __init__(self, api_key: str = API_KEY, api_secret: str = API_SECRET, testnet: bool = TESTNET):
        """
        Initialize Bybit API client.
        
        Args:
            api_key: Bybit API key
            api_secret: Bybit API secret
            testnet: Whether to use testnet (default: True)
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        
        try:
            # Initialize legacy API client for backward compatibility
            self.client = usdt_perpetual.HTTP(
                endpoint="https://api-testnet.bybit.com" if testnet else "https://api.bybit.com",
                api_key=api_key,
                api_secret=api_secret
            )
            
            # Initialize unified API client for v5 API
            self.unified_client = UnifiedHTTP(
                testnet=testnet,
                api_key=api_key, 
                api_secret=api_secret
            )
        except Exception as e:
            print(f"Error initializing Bybit client: {e}")
            self.client = None
            self.unified_client = None
    
    def get_kline_data(self, symbol: str, interval: str = "60", limit: int = 200,
                     start_time: Optional[int] = None) -> pd.DataFrame:
        """
        Get historical kline (candlestick) data.
        
        Args:
            symbol: Trading pair symbol (e.g., "BTCUSDT")
            interval: Kline interval in minutes (1, 3, 5, 15, 30, 60, 240, D, W, M)
            limit: Number of candles to fetch (max 200)
            start_time: Start time in milliseconds
            
        Returns:
            DataFrame with OHLCV data
        """
        if not self.client:
            print("Bybit client not initialized")
            return pd.DataFrame()
        
        try:
            # Prepare parameters
            params = {
                "symbol": symbol,
                "interval": interval,
                "limit": limit
            }
            
            if start_time:
                params["start_time"] = start_time
            
            # Make API request
            response = self.client.query_kline(**params)
            
            if "result" not in response or not response["result"]:
                print(f"No data returned for {symbol}")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df = pd.DataFrame(response["result"])
            
            # Convert string columns to numeric
            numeric_columns = ["open", "high", "low", "close", "volume", "turnover"]
            for col in numeric_columns:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col])
            
            # Convert timestamp to datetime
            if "open_time" in df.columns:
                df["time"] = pd.to_datetime(df["open_time"], unit="s")
                df.set_index("time", inplace=True)
            
            return df
            
        except Exception as e:
            print(f"Error fetching kline data: {e}")
            return pd.DataFrame()
    
    def get_ticker(self, symbol: str) -> Dict:
        """
        Get latest ticker data for a symbol.
        
        Args:
            symbol: Trading pair symbol (e.g., "BTCUSDT")
            
        Returns:
            Dictionary with ticker data
        """
        if not self.client:
            return {}
            
        try:
            response = self.client.latest_information_for_symbol(symbol=symbol)
            
            if "result" not in response or not response["result"]:
                return {}
                
            for item in response["result"]:
                if item["symbol"] == symbol:
                    return item
                    
            return {}
            
        except Exception as e:
            print(f"Error fetching ticker: {e}")
            return {}
    
    def place_order(self, symbol: str, side: str, qty: float, price: Optional[float] = None,
                   order_type: str = "Market", time_in_force: str = "GoodTillCancel",
                   reduce_only: bool = False, close_on_trigger: bool = False) -> Dict:
        """
        Place an order on Bybit.
        
        Args:
            symbol: Trading pair symbol
            side: Order side ("Buy" or "Sell")
            qty: Order quantity
            price: Order price (required for Limit orders)
            order_type: Order type ("Market" or "Limit")
            time_in_force: Time in force ("GoodTillCancel" or "ImmediateOrCancel" or "FillOrKill")
            reduce_only: Whether the order should only reduce position
            close_on_trigger: Whether to close the position on a triggered order
            
        Returns:
            Order response dictionary
        """
        if not self.client or not self.api_key:
            print("API credentials not provided")
            return {"success": False, "message": "API credentials required"}
            
        try:
            params = {
                "symbol": symbol,
                "side": side,
                "qty": qty,
                "order_type": order_type,
                "time_in_force": time_in_force,
                "reduce_only": reduce_only,
                "close_on_trigger": close_on_trigger
            }
            
            if order_type == "Limit" and price is not None:
                params["price"] = price
                
            response = self.client.place_active_order(**params)
            
            return response
            
        except Exception as e:
            return {"success": False, "message": str(e)}


    def get_ticker_v5(self, symbol: str) -> Dict:
        """
        Get latest ticker data for a symbol using V5 API.
        
        Args:
            symbol: Trading pair symbol (e.g., "BTCUSDT")
            
        Returns:
            Dictionary with ticker data
        """
        if not self.unified_client:
            return {}
            
        try:
            response = self.unified_client.get_tickers(
                category="linear",
                symbol=symbol
            )
            
            if response.get("retCode") != 0 or "result" not in response or "list" not in response["result"]:
                return {}
                
            ticker_data = response["result"]["list"][0]
            
            return {
                "symbol": ticker_data["symbol"],
                "price": float(ticker_data["lastPrice"]),
                "bid": float(ticker_data["bid1Price"]),
                "ask": float(ticker_data["ask1Price"]),
                "timestamp": int(time.time()),  # Server doesn't provide timestamp
                "volume": float(ticker_data["volume24h"]),
                "high": float(ticker_data["highPrice24h"]),
                "low": float(ticker_data["lowPrice24h"])
            }
            
        except Exception as e:
            print(f"Error fetching ticker: {e}")
            return {}


def get_candles(symbol: str, interval: str = "60", limit: int = 200) -> pd.DataFrame:
    """
    Fetch candle data from Bybit and convert to DataFrame.
    
    This is a simplified function that creates a BybitAPI instance
    and fetches candle data for the specified symbol.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        interval: Kline interval
        limit: Number of candles to fetch
        
    Returns:
        DataFrame with OHLCV data
    """
    try:
        api = BybitAPI()
        df = api.get_kline_data(symbol, interval, limit)
        
        if df.empty:
            print(f"No data available for {symbol}")
            return pd.DataFrame()
            
        # Ensure we have required columns
        required_columns = ["open", "high", "low", "close", "volume"]
        for col in required_columns:
            if col not in df.columns:
                print(f"Missing required column: {col}")
                return pd.DataFrame()
                
        # Keep only needed columns and sort by time
        df = df[required_columns]
        df.sort_index(inplace=True)
        
        return df
        
    except Exception as e:
        print(f"Error in get_candles: {e}")
        return pd.DataFrame()


def mock_candles(symbol: str, days: int = 30, interval: str = "60") -> pd.DataFrame:
    """
    Generate mock candle data for testing.
    
    This function is useful for testing when no API connection is available.
    
    Args:
        symbol: Trading pair symbol (for naming only)
        days: Number of days of data to generate
        interval: Candle interval (used to determine number of candles)
        
    Returns:
        DataFrame with mock OHLCV data
    """
    # Calculate number of candles
    minutes_per_day = 24 * 60
    minutes_per_candle = int(interval) if interval.isdigit() else 1440  # Default to daily
    candles_per_day = minutes_per_day / minutes_per_candle
    num_candles = int(days * candles_per_day)
    
    # Generate timestamps
    end_time = datetime.now()
    start_time = end_time - timedelta(minutes=minutes_per_candle * num_candles)
    timestamps = pd.date_range(start=start_time, end=end_time, periods=num_candles)
    
    # Generate random price data with trend and volatility
    np.random.seed(42)  # For reproducibility
    
    # Base price and trend
    base_price = 1000 if "BTC" in symbol else 100
    trend = np.random.choice([-1, 1]) * 0.0001  # Small upward or downward trend
    
    # Generate close prices with random walk
    volatility = base_price * 0.01  # 1% daily volatility
    returns = np.random.normal(trend, volatility, num_candles) / np.sqrt(candles_per_day)
    close_prices = base_price * (1 + np.cumsum(returns))
    
    # Generate OHLC based on close prices
    candle_range = volatility * np.random.random(num_candles) * np.sqrt(1/candles_per_day)
    
    high_prices = close_prices + candle_range
    low_prices = close_prices - candle_range
    open_prices = close_prices - candle_range * np.random.random(num_candles) * 2 + candle_range
    
    # Generate volumes
    avg_volume = base_price * 10
    volumes = avg_volume * (1 + 0.5 * np.random.random(num_candles))
    
    # Create DataFrame
    df = pd.DataFrame({
        'open': open_prices,
        'high': high_prices,
        'low': low_prices,
        'close': close_prices,
        'volume': volumes
    }, index=timestamps)
    
    return df

def get_ticker(symbol: str) -> Dict:
    """
    Get the latest ticker data for a symbol.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        
    Returns:
        Dictionary with ticker data including current price and timestamp
    """
    try:
        api = BybitAPI()
        
        # Try to use V5 API first
        ticker = api.get_ticker_v5(symbol)
        
        if ticker:
            return ticker
            
        # Fallback to the older API if needed
        if api.client:
            response = api.client.latest_information_for_symbol(symbol=symbol)
            
            if "result" not in response or not response["result"]:
                return {}
                
            for item in response["result"]:
                if item["symbol"] == symbol:
                    return {
                        "symbol": item["symbol"],
                        "price": float(item["last_price"]),
                        "timestamp": time.time(),  # Use local time as fallback
                    }
                    
        return {}
            
    except Exception as e:
        print(f"Error in get_ticker: {e}")
        return {}
