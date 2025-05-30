
"""
Simplified data fetcher for monster signals API
"""

import pandas as pd
import requests
from datetime import datetime
import time
from typing import Optional

def fetch_data(symbol: str, timeframe: str, limit: int = 200) -> pd.DataFrame:
    """
    Fetch candlestick data from Binance API directly
    
    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')
        timeframe: Timeframe (e.g., '15m', '1h')
        limit: Number of candles to fetch
        
    Returns:
        DataFrame with OHLCV data
    """
    try:
        # Convert timeframe to Binance format
        interval_map = {
            '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
            '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
            '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M'
        }
        
        interval = interval_map.get(timeframe, '15m')
        
        # Binance API endpoint
        url = "https://api.binance.com/api/v3/klines"
        
        params = {
            'symbol': symbol,
            'interval': interval,
            'limit': limit
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if not data:
            print(f"No data returned for {symbol} {timeframe}")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(data, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_asset_volume', 'number_of_trades',
            'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
        ])
        
        # Convert numeric columns
        numeric_cols = ['open', 'high', 'low', 'close', 'volume']
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col])
        
        # Convert timestamp to datetime
        df['timestamp'] = pd.to_datetime(df['timestamp'].astype(int), unit='ms')
        
        # Keep only essential columns
        df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
        
        print(f"Successfully fetched {len(df)} candles for {symbol} {timeframe}")
        return df
        
    except Exception as e:
        print(f"Error fetching data for {symbol} {timeframe}: {str(e)}")
        return generate_mock_data(symbol, limit)

def generate_mock_data(symbol: str, limit: int = 200) -> pd.DataFrame:
    """
    Generate mock OHLCV data for testing when API fails
    """
    import numpy as np
    
    # Base price based on symbol
    base_prices = {
        'BTCUSDT': 45000,
        'ETHUSDT': 2800,
        'SOLUSDT': 120,
        'DOGEUSDT': 0.08,
        'ADAUSDT': 0.45,
        'BNBUSDT': 320,
        'XRPUSDT': 0.55,
        'MATICUSDT': 0.85,
        'LINKUSDT': 15,
        'AVAXUSDT': 28
    }
    
    base_price = base_prices.get(symbol, 100)
    
    # Generate realistic price movement
    dates = pd.date_range(end=datetime.now(), periods=limit, freq='15T')
    
    # Random walk with trend
    returns = np.random.normal(0, 0.02, limit)
    prices = base_price * np.exp(np.cumsum(returns))
    
    data = []
    for i, (date, price) in enumerate(zip(dates, prices)):
        volatility = np.random.uniform(0.5, 2.0) / 100
        high = price * (1 + volatility)
        low = price * (1 - volatility)
        open_price = prices[i-1] if i > 0 else price
        close_price = price
        volume = np.random.uniform(1000, 10000)
        
        data.append({
            'timestamp': date,
            'open': open_price,
            'high': high,
            'low': low,
            'close': close_price,
            'volume': volume
        })
    
    return pd.DataFrame(data)
