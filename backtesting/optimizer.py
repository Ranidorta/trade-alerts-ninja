"""
Backtesting and optimization tools for trading strategies.

This module provides functions for backtesting trading strategies and
optimizing strategy parameters using vectorbt.
"""

import numpy as np
import pandas as pd
import vectorbt as vbt
from strategies.core import SignalGenerator
from ta.momentum import RSIIndicator
from ta.trend import MACDIndicator
from backtesting import Backtest, Strategy


class SimpleStrategy(Strategy):
    """
    A simple trading strategy using SMA, RSI, and MACD indicators.
    
    Parameters:
        sma_short: Short SMA period
        sma_long: Long SMA period
        rsi_period: RSI calculation period
        macd_fast: MACD fast period
        macd_slow: MACD slow period
    """
    sma_short = 10
    sma_long = 30
    rsi_period = 14
    macd_fast = 12
    macd_slow = 26

    def init(self):
        close = self.data.Close
        self.sma_short = self.I(lambda x: x.rolling(self.sma_short).mean(), close)
        self.sma_long = self.I(lambda x: x.rolling(self.sma_long).mean(), close)
        self.rsi = self.I(RSIIndicator(close, window=self.rsi_period).rsi)
        macd_line = close.ewm(span=self.macd_fast).mean() - close.ewm(span=self.macd_slow).mean()
        self.macd = self.I(lambda x: macd_line, close)

    def next(self):
        if self.sma_short[-1] > self.sma_long[-1] and self.rsi[-1] > 30 and self.macd[-1] > 0:
            self.buy()
        elif self.sma_short[-1] < self.sma_long[-1] or self.rsi[-1] > 70:
            self.position.close()


def walk_forward_optimization(df):
    """
    Perform walk-forward optimization on the SimpleStrategy.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        Stats from the optimization
    """
    df_bt = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']].copy()
    df_bt.columns = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume']
    df_bt.set_index('Date', inplace=True)
    df_bt.index = pd.to_datetime(df_bt.index)

    bt = Backtest(df_bt, SimpleStrategy, cash=10000, commission=0.001)
    stats, heatmap = bt.optimize(
        sma_short=range(10, 20, 2),
        sma_long=range(30, 50, 4),
        rsi_period=range(10, 30, 5),
        macd_fast=[8, 12],
        macd_slow=[21, 26],
        maximize='Sharpe Ratio',
        return_heatmap=True
    )
    return stats


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


def benchmark(df):
    """
    Create a benchmark portfolio that simply holds the asset for the entire period.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        Portfolio statistics for the buy and hold strategy
    """
    # Create a portfolio that holds the asset for the entire period
    pf = vbt.Portfolio.from_holding(df['close'], fees=0.001, freq='1h')
    
    # Return the portfolio statistics
    return pf.stats()


def compare_strategy_vs_benchmark(df):
    """
    Compare the optimized strategy performance with a buy-and-hold benchmark.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        Dict with comparison metrics between strategy and benchmark
    """
    print("Optimizing strategy parameters...")
    strategy_results = optimize_params(df)
    
    print("Calculating benchmark performance...")
    benchmark_stats = benchmark(df)
    
    # Extract statistics for comparison
    strategy_stats = strategy_results['stats']
    
    # Check if we have valid statistics
    if not strategy_stats or not benchmark_stats:
        return {
            "error": "Could not generate valid strategy or benchmark statistics"
        }
    
    # Create comparison dictionary
    comparison = {
        "strategy_sharpe": strategy_stats.get('Sharpe Ratio', None),
        "benchmark_sharpe": benchmark_stats.get('Sharpe Ratio', None),
        "strategy_return": strategy_stats.get('Total Return [%]', None),
        "benchmark_return": benchmark_stats.get('Total Return [%]', None),
        "strategy_drawdown": strategy_stats.get('Max Drawdown [%]', None),
        "benchmark_drawdown": benchmark_stats.get('Max Drawdown [%]', None),
        "strategy_win_rate": strategy_stats.get('Win Rate [%]', None),
        "strategy_best_trade": strategy_stats.get('Best Trade [%]', None),
        "strategy_worst_trade": strategy_stats.get('Worst Trade [%]', None),
        "outperformance": strategy_stats.get('Total Return [%]', 0) - benchmark_stats.get('Total Return [%]', 0)
    }
    
    print(f"Strategy Sharpe: {comparison['strategy_sharpe']:.2f} vs Benchmark Sharpe: {comparison['benchmark_sharpe']:.2f}")
    print(f"Strategy Return: {comparison['strategy_return']:.2f}% vs Benchmark Return: {comparison['benchmark_return']:.2f}%")
    print(f"Outperformance: {comparison['outperformance']:.2f}%")
    
    return comparison
