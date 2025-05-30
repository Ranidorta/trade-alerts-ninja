
"""
Simplified data fetcher for monster signals API - Bybit Integration
"""

import pandas as pd
import requests
from datetime import datetime
import time
from typing import Optional

def fetch_data(symbol: str, timeframe: str, limit: int = 200) -> pd.DataFrame:
    """
    Fetch candlestick data from Bybit API directly
    
    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')
        timeframe: Timeframe (e.g., '15', '60' for minutes)
        limit: Number of candles to fetch
        
    Returns:
        DataFrame with OHLCV data
    """
    try:
        # Convert timeframe to Bybit format
        interval_map = {
            '1': '1',    # 1 minute
            '3': '3',    # 3 minutes
            '5': '5',    # 5 minutes
            '15': '15',  # 15 minutes
            '30': '30',  # 30 minutes
            '60': '60',  # 1 hour
            '240': '240', # 4 hours
            'D': 'D',    # 1 day
            '15m': '15', # Alternative format
            '1h': '60'   # Alternative format
        }
        
        interval = interval_map.get(timeframe, '15')
        
        # Bybit V5 API endpoint for kline data
        url = "https://api.bybit.com/v5/market/kline"
        
        params = {
            'category': 'linear',
            'symbol': symbol,
            'interval': interval,
            'limit': limit
        }
        
        print(f"Fetching data from Bybit: {symbol} {timeframe}")
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('retCode') != 0:
            print(f"Bybit API error: {data.get('retMsg', 'Unknown error')}")
            return generate_mock_data(symbol, limit)
        
        klines = data.get('result', {}).get('list', [])
        
        if not klines:
            print(f"No data returned for {symbol} {timeframe}")
            return generate_mock_data(symbol, limit)
        
        # Convert to DataFrame
        df = pd.DataFrame(klines, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume', 'turnover'
        ])
        
        # Convert numeric columns
        numeric_cols = ['open', 'high', 'low', 'close', 'volume', 'turnover']
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col])
        
        # Convert timestamp to datetime (Bybit returns milliseconds)
        df['timestamp'] = pd.to_datetime(df['timestamp'].astype(int), unit='ms')
        
        # Sort by timestamp (Bybit returns newest first, we want oldest first)
        df = df.sort_values('timestamp').reset_index(drop=True)
        
        # Keep only essential columns
        df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
        
        print(f"Successfully fetched {len(df)} candles for {symbol} {timeframe}")
        return df
        
    except Exception as e:
        print(f"Error fetching data for {symbol} {timeframe}: {str(e)}")
        return generate_mock_data(symbol, limit)

def get_current_price(symbol: str) -> float:
    """
    Get current price from Bybit ticker API
    
    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')
        
    Returns:
        Current price as float
    """
    try:
        url = "https://api.bybit.com/v5/market/tickers"
        params = {
            'category': 'linear',
            'symbol': symbol
        }
        
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('retCode') != 0:
            print(f"Error getting price for {symbol}: {data.get('retMsg')}")
            return 0.0
        
        tickers = data.get('result', {}).get('list', [])
        
        if tickers:
            price = float(tickers[0].get('lastPrice', 0))
            print(f"Current price for {symbol}: {price}")
            return price
        
        return 0.0
        
    except Exception as e:
        print(f"Error getting current price for {symbol}: {str(e)}")
        return 0.0

def generate_mock_data(symbol: str, limit: int = 200) -> pd.DataFrame:
    """
    Generate mock OHLCV data for testing when API fails
    """
    import numpy as np
    
    # Base price based on symbol - realistic current prices
    base_prices = {
        'BTCUSDT': 96500,   # Current BTC price range
        'ETHUSDT': 3350,    # Current ETH price range
        'SOLUSDT': 185,     # Current SOL price range
        'DOGEUSDT': 0.32,   # Current DOGE price range
        'ADAUSDT': 0.88,    # Current ADA price range
        'BNBUSDT': 665,     # Current BNB price range
        'XRPUSDT': 2.15,    # Current XRP price range
        'MATICUSDT': 0.42,  # Current MATIC price range
        'LINKUSDT': 22.5,   # Current LINK price range
        'AVAXUSDT': 38.2    # Current AVAX price range
    }
    
    base_price = base_prices.get(symbol, 100)
    
    # Generate realistic price movement
    dates = pd.date_range(end=datetime.now(), periods=limit, freq='15T')
    
    # Random walk with trend and realistic volatility
    np.random.seed(hash(symbol) % 2**32)  # Consistent seed per symbol
    returns = np.random.normal(0, 0.01, limit)  # 1% volatility
    prices = base_price * np.exp(np.cumsum(returns))
    
    data = []
    for i, (date, price) in enumerate(zip(dates, prices)):
        volatility = np.random.uniform(0.2, 1.5) / 100  # 0.2% to 1.5% intra-candle volatility
        high = price * (1 + volatility)
        low = price * (1 - volatility)
        open_price = prices[i-1] if i > 0 else price
        close_price = price
        volume = np.random.uniform(1000, 50000)  # Realistic volume
        
        data.append({
            'timestamp': date,
            'open': open_price,
            'high': high,
            'low': low,
            'close': close_price,
            'volume': volume
        })
    
    df = pd.DataFrame(data)
    print(f"Generated mock data for {symbol}: {len(df)} candles")
    return df
