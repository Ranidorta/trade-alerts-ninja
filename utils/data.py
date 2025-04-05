
"""
Data utilities for retrieving cryptocurrency price data.

This module provides functions to fetch and preprocess historical price data
from various exchanges, primarily Binance.
"""

import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta
import time
import os

def get_binance_data(symbol='BTCUSDT', interval='1h', limit=1000):
    """
    Fetch historical candlestick data from Binance API.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        interval: Candlestick interval (e.g., "1h", "4h", "1d")
        limit: Number of candles to retrieve (max 1000)
        
    Returns:
        DataFrame with OHLCV data and timestamp
    """
    base_url = "https://api.binance.com/api/v3/klines"
    
    params = {
        'symbol': symbol,
        'interval': interval,
        'limit': limit
    }
    
    try:
        # Make API request with retry mechanism
        max_retries = 3
        for attempt in range(max_retries):
            response = requests.get(base_url, params=params)
            
            if response.status_code == 200:
                break
                
            if attempt < max_retries - 1:
                time.sleep(1)  # Wait before retrying
        
        # Check if request was successful
        if response.status_code != 200:
            raise Exception(f"API request failed with status {response.status_code}: {response.text}")
            
        # Process the response data
        data = response.json()
        
        # Create DataFrame
        df = pd.DataFrame(data, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_asset_volume', 'number_of_trades',
            'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
        ])
        
        # Convert string values to appropriate types
        numeric_columns = ['open', 'high', 'low', 'close', 'volume']
        df[numeric_columns] = df[numeric_columns].astype(float)
        
        # Convert timestamp from milliseconds to datetime
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        
        # Calculate some basic technical indicators
        df['sma_50'] = df['close'].rolling(window=50).mean()
        df['sma_200'] = df['close'].rolling(window=200).mean()
        df['volume_ma_20'] = df['volume'].rolling(window=20).mean()
        
        # Calculate RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # Calculate MACD
        ema12 = df['close'].ewm(span=12, adjust=False).mean()
        ema26 = df['close'].ewm(span=26, adjust=False).mean()
        df['macd'] = ema12 - ema26
        df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
        
        print(f"✅ Dados obtidos: {len(df)} candles de {symbol} ({interval})")
        return df
        
    except Exception as e:
        print(f"❌ Erro ao buscar dados: {str(e)}")
        
        # Return empty DataFrame with expected columns
        return pd.DataFrame(columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'sma_50', 'sma_200', 'volume_ma_20', 'rsi', 'macd'
        ])

def save_data_to_csv(df, symbol='BTCUSDT', interval='1h'):
    """Save data to CSV file."""
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Generate filename
    filename = f"data/{symbol}_{interval}_{datetime.now().strftime('%Y%m%d')}.csv"
    
    # Save to CSV
    df.to_csv(filename, index=False)
    print(f"✅ Dados salvos em {filename}")
    
    return filename
