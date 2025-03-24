
"""
Optimized indicator calculations using Numba.

This module provides high-performance implementations of common
technical indicators using Numba's just-in-time compilation.
"""

import numpy as np
from numba import jit, prange
import pandas as pd

@jit(nopython=True)
def rsi_numba(prices, window=14):
    """
    Calculate RSI using Numba optimization.
    
    Args:
        prices: Array of price values
        window: RSI calculation window (default: 14)
        
    Returns:
        Array of RSI values
    """
    deltas = np.diff(prices)
    seed = deltas[:window]
    up = seed[seed >= 0].sum()/window
    down = -seed[seed < 0].sum()/window
    
    if down == 0:  # Handle division by zero
        rs = np.inf
    else:
        rs = up/down
    
    rsi = np.zeros_like(prices)
    rsi[:window] = 100. - 100./(1.+rs)
    
    for i in range(window, len(prices)):
        delta = deltas[i-1]
        if delta > 0:
            upval = delta
            downval = 0
        else:
            upval = 0
            downval = -delta
            
        up = (up*(window-1) + upval)/window
        down = (down*(window-1) + downval)/window
        
        if down == 0:  # Handle division by zero
            rs = np.inf
        else:
            rs = up/down
            
        rsi[i] = 100. - 100./(1.+rs)
        
    return rsi

@jit(nopython=True)
def bollinger_bands_numba(prices, window=20, num_std=2.0):
    """
    Calculate Bollinger Bands using Numba optimization.
    
    Args:
        prices: Array of price values
        window: Moving average window (default: 20)
        num_std: Number of standard deviations (default: 2.0)
        
    Returns:
        Tuple of (upper_band, middle_band, lower_band)
    """
    middle_band = np.zeros_like(prices)
    upper_band = np.zeros_like(prices)
    lower_band = np.zeros_like(prices)
    
    # For the initial window, we have incomplete data
    for i in range(window-1):
        middle_band[i] = np.nan
        upper_band[i] = np.nan
        lower_band[i] = np.nan
    
    # Calculate moving average and std for each window
    for i in range(window-1, len(prices)):
        window_slice = prices[i-window+1:i+1]
        middle_band[i] = np.mean(window_slice)
        std = np.std(window_slice)
        upper_band[i] = middle_band[i] + (std * num_std)
        lower_band[i] = middle_band[i] - (std * num_std)
    
    return upper_band, middle_band, lower_band

@jit(nopython=True, parallel=True)
def atr_numba(high, low, close, window=14):
    """
    Calculate ATR (Average True Range) using Numba optimization.
    
    Args:
        high: Array of high prices
        low: Array of low prices
        close: Array of close prices
        window: ATR window (default: 14)
        
    Returns:
        Array of ATR values
    """
    n = len(high)
    tr = np.zeros(n)
    atr = np.zeros(n)
    
    # Calculate True Range
    tr[0] = high[0] - low[0]  # First TR is simply high - low
    
    for i in range(1, n):
        tr[i] = max(
            high[i] - low[i],
            abs(high[i] - close[i-1]),
            abs(low[i] - close[i-1])
        )
    
    # Calculate ATR with Wilder's smoothing
    atr[window-1] = np.mean(tr[:window])
    
    for i in range(window, n):
        atr[i] = (atr[i-1] * (window-1) + tr[i]) / window
    
    return atr

def apply_optimized_indicators(df):
    """
    Apply all optimized indicators to a DataFrame.
    
    Args:
        df: DataFrame with OHLC price data
        
    Returns:
        DataFrame with added indicator columns
    """
    # Make a copy to avoid modifying the original
    result = df.copy()
    
    # Extract numpy arrays for Numba functions
    close_array = result['close'].values.astype(np.float64)
    high_array = result['high'].values.astype(np.float64)
    low_array = result['low'].values.astype(np.float64)
    
    # Calculate indicators
    result['rsi'] = rsi_numba(close_array)
    upper, middle, lower = bollinger_bands_numba(close_array)
    result['upper_band'] = upper
    result['middle_band'] = middle 
    result['lower_band'] = lower
    result['atr'] = atr_numba(high_array, low_array, close_array)
    
    return result

def parallel_backtest(df_dict, strategy_func, **kwargs):
    """
    Run backtests in parallel across multiple symbols.
    
    Args:
        df_dict: Dictionary of {symbol: dataframe}
        strategy_func: Strategy function to apply
        **kwargs: Additional arguments for the strategy
        
    Returns:
        Dictionary of results by symbol
    """
    from joblib import Parallel, delayed
    
    def process_single(symbol, df):
        """Process a single symbol"""
        result_df = strategy_func(df.copy(), **kwargs)
        return symbol, result_df
    
    # Run in parallel
    results = Parallel(n_jobs=-1)(
        delayed(process_single)(symbol, df) 
        for symbol, df in df_dict.items()
    )
    
    # Combine results
    return dict(results)
