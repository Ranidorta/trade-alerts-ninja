
"""
Data validation utilities for trading signals.

This module provides functions to validate input data, check for required columns,
and ensure data quality before processing.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Union


def validate_ohlcv_data(df: pd.DataFrame) -> bool:
    """
    Validate OHLCV data for basic quality checks.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        True if valid, False otherwise
    """
    required_columns = ['open', 'high', 'low', 'close', 'volume']
    
    # Check if all required columns exist
    if not all(col in df.columns for col in required_columns):
        print("Error: Missing required columns. Need open, high, low, close, volume.")
        return False
    
    # Check for missing values
    if df[required_columns].isnull().any().any():
        print("Warning: Dataset contains NaN values.")
        return False
    
    # Check for negative values in volume
    if (df['volume'] < 0).any():
        print("Error: Volume contains negative values.")
        return False
    
    # Check that high is >= low
    if not (df['high'] >= df['low']).all():
        print("Error: Found high price lower than low price.")
        return False
    
    # Check that high is >= open and close
    if not ((df['high'] >= df['open']) & (df['high'] >= df['close'])).all():
        print("Error: Found high price lower than open or close.")
        return False
    
    # Check that low is <= open and close
    if not ((df['low'] <= df['open']) & (df['low'] <= df['close'])).all():
        print("Error: Found low price higher than open or close.")
        return False
    
    return True


def validate_indicators(df: pd.DataFrame, required_indicators: List[str]) -> bool:
    """
    Validate that required technical indicators are present in the DataFrame.
    
    Args:
        df: DataFrame with indicators
        required_indicators: List of required indicator column names
        
    Returns:
        True if all indicators are present, False otherwise
    """
    # Check if all required indicators exist
    if not all(ind in df.columns for ind in required_indicators):
        missing = [ind for ind in required_indicators if ind not in df.columns]
        print(f"Error: Missing required indicators: {missing}")
        return False
    
    return True


def ensure_datetime_index(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensure DataFrame has a datetime index.
    
    Args:
        df: DataFrame to check
        
    Returns:
        DataFrame with datetime index
    """
    result = df.copy()
    
    # If the index is not a DatetimeIndex but a 'timestamp' column exists
    if not isinstance(result.index, pd.DatetimeIndex) and 'timestamp' in result.columns:
        # Try to convert and set the index
        try:
            # First try direct conversion
            result['timestamp'] = pd.to_datetime(result['timestamp'])
            result.set_index('timestamp', inplace=True)
            result.sort_index(inplace=True)
        except Exception as e:
            print(f"Warning: Could not convert timestamp to datetime index: {e}")
    
    return result


def validate_strategy_input(symbol: str, timeframe: str, limit: int) -> Dict[str, Any]:
    """
    Validate strategy input parameters and return a validated dict.
    
    Args:
        symbol: Trading symbol (e.g., 'BTCUSDT')
        timeframe: Timeframe (e.g., '1h', '4h', '1d')
        limit: Number of candles to fetch
        
    Returns:
        Dictionary with validated parameters
    """
    # Validate symbol
    if not isinstance(symbol, str) or len(symbol) < 2:
        raise ValueError("Symbol must be a valid string")
    
    # Validate timeframe
    valid_timeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M']
    if timeframe not in valid_timeframes:
        raise ValueError(f"Timeframe must be one of {valid_timeframes}")
    
    # Validate limit
    limit = int(limit)  # Convert to int if possible
    if limit < 10 or limit > 1000:
        limit = min(max(100, limit), 1000)  # Clamp between 100 and 1000
    
    return {
        'symbol': symbol.upper(),  # Convert to uppercase
        'timeframe': timeframe,
        'limit': limit
    }


def clean_dataframe(df: pd.DataFrame, remove_duplicates: bool = True, fillna: bool = False) -> pd.DataFrame:
    """
    Clean a DataFrame by removing duplicates and optionally filling NaN values.
    
    Args:
        df: DataFrame to clean
        remove_duplicates: Whether to remove duplicate rows
        fillna: Whether to fill NaN values
        
    Returns:
        Cleaned DataFrame
    """
    result = df.copy()
    
    # Remove duplicates if requested
    if remove_duplicates and len(result) > 0:
        result = result.drop_duplicates()
    
    # Fill NaN values if requested
    if fillna:
        # For numeric columns, use forward fill then backward fill
        numeric_cols = result.select_dtypes(include=[np.number]).columns
        result[numeric_cols] = result[numeric_cols].fillna(method='ffill').fillna(method='bfill')
    
    return result
