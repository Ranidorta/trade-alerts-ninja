
"""
Backtesting and optimization tools for trading strategies.

This module provides functions for backtesting trading strategies and
optimizing strategy parameters using vectorbt.
"""

import numpy as np
import pandas as pd
import vectorbt as vbt
from strategies.core import SignalGenerator


def backtest_strategy(df):
    """
    Backtest a trading strategy using the SignalGenerator and vectorbt.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        Portfolio statistics
    """
    # Generate signals with scores
    signal_generator = SignalGenerator(df)
    df_signals = signal_generator.generate_signal()
    
    # Define entries and exits based on signal score
    entries = df_signals['signal_score'] >= 70
    exits = df_signals['signal_score'] < 30
    
    # Run backtest with vectorbt
    pf = vbt.Portfolio.from_signals(
        df_signals['close'],
        entries,
        exits,
        fees=0.001,
        freq='1h'
    )
    
    return pf.stats()


def optimize_params(df):
    """
    Optimize strategy parameters by testing different SMA combinations.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        Dict with best parameters and performance stats
    """
    best_sharpe = -np.inf
    best_signal = None
    best_stats = None
    
    # Test different SMA combinations
    for short in range(10, 20):
        for long in range(30, 50):
            # Calculate SMAs for this parameter set
            df_test = df.copy()
            df_test['sma_short'] = df_test['close'].rolling(short).mean()
            df_test['sma_long'] = df_test['close'].rolling(long).mean()
            
            # Generate entry/exit signals
            entries = df_test['sma_short'] > df_test['sma_long']
            exits = df_test['sma_short'] < df_test['sma_long']
            
            # Run backtest
            pf = vbt.Portfolio.from_signals(
                df_test['close'], 
                entries, 
                exits, 
                fees=0.001
            )
            
            # Check if this is the best parameter set so far
            sharpe = pf.stats().get('Sharpe Ratio', 0)
            if sharpe and sharpe > best_sharpe:
                best_sharpe = sharpe
                best_signal = (short, long)
                best_stats = pf.stats()
    
    # Return the best parameters and stats
    return {
        'best_short': best_signal[0] if best_signal else None,
        'best_long': best_signal[1] if best_signal else None,
        'best_sharpe': best_sharpe,
        'stats': best_stats
    }
