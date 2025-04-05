
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
    Optimize strategy parameters by testing different combinations of 
    SMA, RSI, and MACD parameters.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        Dict with best parameters and performance stats
    """
    best_sharpe = -np.inf
    best_params = None
    best_stats = None
    
    # Define the parameter ranges to test
    sma_short_range = range(10, 21)  # 10 to 20
    sma_long_range = range(30, 51)  # 30 to 50
    rsi_periods = range(10, 31, 5)  # 10, 15, 20, 25, 30
    macd_fast_periods = [8, 12]
    macd_slow_periods = [21, 26]
    
    total_combos = len(sma_short_range) * len(sma_long_range[:5])  # Limit to first 5 long values for sample
    processed = 0
    
    print(f"Testing {total_combos} parameter combinations...")
    
    # Test different parameter combinations
    for sma_short in sma_short_range:
        for sma_long in sma_long_range[:5]:  # Limiting to first 5 for efficiency
            if sma_short >= sma_long:
                continue  # Skip invalid combinations
                
            for rsi_period in rsi_periods:
                for macd_fast in macd_fast_periods:
                    for macd_slow in macd_slow_periods:
                        if macd_fast >= macd_slow:
                            continue  # Skip invalid combinations
                            
                        # Update progress
                        processed += 1
                        if processed % 10 == 0:
                            print(f"Progress: {processed}/{total_combos} combinations tested")
                            
                        try:
                            # Calculate SMAs for this parameter set
                            df_test = df.copy()
                            df_test['sma_short'] = df_test['close'].rolling(sma_short).mean()
                            df_test['sma_long'] = df_test['close'].rolling(sma_long).mean()
                            
                            # Calculate RSI for this parameter set
                            delta = df_test['close'].diff()
                            gain = (delta.where(delta > 0, 0)).rolling(window=rsi_period).mean()
                            loss = (-delta.where(delta < 0, 0)).rolling(window=rsi_period).mean()
                            rs = gain / loss
                            df_test['rsi'] = 100 - (100 / (1 + rs))
                            
                            # Calculate MACD for this parameter set
                            ema_fast = df_test['close'].ewm(span=macd_fast, adjust=False).mean()
                            ema_slow = df_test['close'].ewm(span=macd_slow, adjust=False).mean()
                            df_test['macd'] = ema_fast - ema_slow
                            df_test['macd_signal'] = df_test['macd'].ewm(span=9, adjust=False).mean()
                            
                            # Generate entry/exit signals
                            entries = (df_test['sma_short'] > df_test['sma_long']) & \
                                     (df_test['rsi'] > 30) & \
                                     (df_test['macd'] > df_test['macd_signal'])
                            exits = (df_test['sma_short'] < df_test['sma_long']) | \
                                   (df_test['rsi'] > 70) | \
                                   (df_test['macd'] < df_test['macd_signal'])
                            
                            # Run backtest
                            pf = vbt.Portfolio.from_signals(
                                df_test['close'], 
                                entries, 
                                exits, 
                                fees=0.001
                            )
                            
                            # Check if this is the best parameter set so far
                            stats = pf.stats()
                            sharpe = stats.get('Sharpe Ratio', 0)
                            if sharpe and sharpe > best_sharpe:
                                best_sharpe = sharpe
                                best_params = {
                                    'sma_short': sma_short,
                                    'sma_long': sma_long,
                                    'rsi_period': rsi_period,
                                    'macd_fast': macd_fast,
                                    'macd_slow': macd_slow
                                }
                                best_stats = stats
                                
                                print(f"New best parameters found: {best_params}, Sharpe: {best_sharpe:.2f}")
                                
                        except Exception as e:
                            # Skip this combination if there's an error
                            print(f"Error with parameters (SMA:{sma_short}/{sma_long}, RSI:{rsi_period}, MACD:{macd_fast}/{macd_slow}): {str(e)}")
                            continue
    
    # Return the best parameters and stats
    return {
        'best_short': best_params['sma_short'] if best_params else None,
        'best_long': best_params['sma_long'] if best_params else None,
        'best_rsi': best_params['rsi_period'] if best_params else None,
        'best_macd_fast': best_params['macd_fast'] if best_params else None,
        'best_macd_slow': best_params['macd_slow'] if best_params else None,
        'best_sharpe': best_sharpe,
        'stats': best_stats
    }
