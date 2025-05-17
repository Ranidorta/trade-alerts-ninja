
"""
Data fetcher module for retrieving market data from exchanges.
"""

import json
import pandas as pd
import requests
import os
from datetime import datetime
from typing import Optional

# Load configuration
config_path = os.path.join(os.path.dirname(__file__), '../config.json')
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    config = {
        "api_key": "",
        "api_secret": "",
        "testnet": False,
        "category": "linear",
        "symbol": "BTCUSDT",
        "interval": 60
    }

try:
    from pybit.unified_trading import HTTP
    
    session = HTTP(
        testnet=config.get("testnet", False),
        api_key=config.get("api_key", ""),
        api_secret=config.get("api_secret", "")
    )
except ImportError:
    print("Warning: pybit not installed. Will use direct HTTP requests.")
    session = None

def get_historical_data(symbol=None, start=None, end=None, interval=None):
    """
    Fetch historical candlestick data from Bybit.
    
    Args:
        symbol: Trading pair symbol (default: from config)
        start: Start time in milliseconds
        end: End time in milliseconds
        interval: Candlestick interval (default: from config)
        
    Returns:
        DataFrame with OHLCV data
    """
    symbol = symbol or config["symbol"]
    interval = interval or config["interval"]
    
    params = {
        "category": config["category"],
        "symbol": symbol,
        "interval": str(interval)
    }
    if start is not None:
        params["start"] = start
    if end is not None:
        params["end"] = end
    
    try:
        if session:
            res = session.get_kline(**params)
        else:
            # Fallback to direct HTTP request if pybit is not available
            url = "https://api.bybit.com/v5/market/kline"
            res = requests.get(url, params=params).json()
            
        data = res.get('result', {}).get('list', [])
        
        if not data:
            print(f"No data returned for {symbol}")
            return pd.DataFrame()
            
        df = pd.DataFrame(data)
        
        # Bybit kline endpoint returns data in different formats depending on the API version
        if len(df.columns) >= 7:
            df.columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume', 'turnover']
        else:
            # Adjust column names based on what's returned
            default_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
            df.columns = default_columns[:len(df.columns)]
            
        # Convert numeric columns
        numeric_cols = ['open', 'high', 'low', 'close', 'volume']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col])
                
        # Convert timestamp
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'].astype(float), unit='ms')
            
        return df
        
    except Exception as e:
        print(f"Error fetching historical data: {str(e)}")
        return pd.DataFrame()

def get_current_price(symbol=None):
    """
    Get the latest price for a symbol.
    
    Args:
        symbol: Trading pair symbol (default: from config)
        
    Returns:
        Current price as float
    """
    symbol = symbol or config["symbol"]
    
    try:
        if session:
            res = session.get_tickers(
                category=config["category"],
                symbol=symbol
            )
        else:
            # Fallback to direct HTTP request
            url = "https://api.bybit.com/v5/market/tickers"
            params = {"category": config["category"], "symbol": symbol}
            res = requests.get(url, params=params).json()
            
        items = res.get('result', {}).get('list', [])
        
        if items:
            return float(items[0].get('lastPrice', 0))
        return 0.0
        
    except Exception as e:
        print(f"Error fetching current price: {str(e)}")
        return 0.0

def get_symbols():
    """
    Get a list of available trading symbols.
    
    Returns:
        List of symbol strings
    """
    url = "https://api.bybit.com/v5/market/instruments-info"
    params = {"category": "linear", "status": "Trading", "limit": 1000}
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        symbols = []
        
        if data.get("retCode") == 0 and "result" in data:
            for item in data["result"].get("list", []):
                if item.get("quoteCoin") == "USDT":
                    symbols.append(item["symbol"])
                    
        return symbols
        
    except Exception as e:
        print(f"Error fetching symbols: {str(e)}")
        return ["BTCUSDT", "ETHUSDT", "SOLUSDT"]  # Return default symbols as fallback
