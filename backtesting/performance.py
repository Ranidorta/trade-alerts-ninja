
"""
Performance metrics for trading strategies.

This module provides functions to calculate various performance metrics
for evaluating trading strategies, including:
- Sharpe Ratio
- Maximum Drawdown
- Win Rate
- Return metrics
"""

import numpy as np
import pandas as pd


def calculate_returns(signals_df, price_col='close', signal_col='signal'):
    """
    Calculate returns based on trading signals.
    
    Args:
        signals_df: DataFrame with price data and signals
        price_col: Column name for price data
        signal_col: Column name for signals (1, -1, 0)
        
    Returns:
        Series of returns
    """
    # Shift signals to simulate execution in next period
    signals_df = signals_df.copy()
    signals_df['position'] = signals_df[signal_col].shift(1)
    
    # Calculate percent changes in price
    signals_df['price_change'] = signals_df[price_col].pct_change()
    
    # Calculate returns based on position and price change
    signals_df['return'] = signals_df['position'] * signals_df['price_change']
    
    return signals_df['return']


def calculate_sharpe_ratio(returns, risk_free_rate=0.0, periods_per_year=252):
    """
    Calculate the Sharpe Ratio.
    
    Args:
        returns: Series of returns
        risk_free_rate: Annual risk-free rate (default: 0)
        periods_per_year: Number of periods in a year (default: 252 for trading days)
        
    Returns:
        Sharpe Ratio
    """
    # Clean data, remove NaN
    returns = returns.dropna()
    
    if len(returns) == 0:
        return 0
    
    # Convert annual risk-free rate to per-period rate
    rf_per_period = (1 + risk_free_rate) ** (1 / periods_per_year) - 1
    
    # Calculate excess returns
    excess_returns = returns - rf_per_period
    
    # Calculate annualized Sharpe ratio
    sharpe = np.sqrt(periods_per_year) * (excess_returns.mean() / excess_returns.std())
    
    return sharpe


def calculate_max_drawdown(returns):
    """
    Calculate the maximum drawdown.
    
    Args:
        returns: Series of returns
        
    Returns:
        Tuple (max_drawdown, start_date, end_date)
    """
    # Calculate cumulative returns
    returns = returns.dropna()
    
    if len(returns) == 0:
        return 0, None, None
    
    # Calculate wealth index (cumulative returns)
    wealth_index = (1 + returns).cumprod()
    
    # Calculate previous peaks
    previous_peaks = wealth_index.cummax()
    
    # Calculate drawdowns
    drawdowns = (wealth_index - previous_peaks) / previous_peaks
    
    # Find the maximum drawdown
    max_dd = drawdowns.min()
    
    # Find the dates
    max_dd_idx = drawdowns.idxmin()
    previous_peak_idx = wealth_index[:max_dd_idx].idxmax()
    
    return max_dd, previous_peak_idx, max_dd_idx


def calculate_win_rate(signals_df, result_col='result'):
    """
    Calculate the win rate for completed trades.
    
    Args:
        signals_df: DataFrame with trade results
        result_col: Column name for results (1 for win, 0 for loss)
        
    Returns:
        Win rate as a decimal
    """
    # Filter for completed trades
    completed_trades = signals_df[signals_df[result_col].notnull()]
    
    if len(completed_trades) == 0:
        return 0
    
    # Count wins
    wins = completed_trades[result_col].sum()
    
    # Calculate win rate
    win_rate = wins / len(completed_trades)
    
    return win_rate


def calculate_walk_forward_performance(df, strategy_func, window_size=30, test_size=10):
    """
    Perform walk-forward testing on a strategy.
    
    This splits data into multiple train/test windows and evaluates the strategy
    on each test window after training on the preceding window.
    
    Args:
        df: DataFrame with price data
        strategy_func: Function that generates signals
        window_size: Size of each window
        test_size: Size of test portion in each window
        
    Returns:
        DataFrame with performance metrics for each window
    """
    results = []
    
    for i in range(window_size, len(df), test_size):
        # Get train and test data
        train_data = df[i-window_size:i].copy()
        test_data = df[i:i+test_size].copy()
        
        if len(test_data) == 0:
            continue
            
        # Apply strategy function
        train_data = strategy_func(train_data)
        test_data = strategy_func(test_data)
        
        # Calculate returns
        returns = calculate_returns(test_data)
        
        # Calculate metrics
        sharpe = calculate_sharpe_ratio(returns)
        max_dd, _, _ = calculate_max_drawdown(returns)
        win_rate = calculate_win_rate(test_data)
        
        # Store results
        results.append({
            'window_start': test_data.index[0],
            'window_end': test_data.index[-1],
            'sharpe': sharpe,
            'max_drawdown': max_dd,
            'win_rate': win_rate,
            'return': returns.sum()
        })
    
    return pd.DataFrame(results)


def generate_performance_report(signals_df, price_col='close', signal_col='signal', result_col='result'):
    """
    Generate a comprehensive performance report.
    
    Args:
        signals_df: DataFrame with price data and signals
        price_col: Column name for price data
        signal_col: Column name for signals
        result_col: Column name for results
        
    Returns:
        Dictionary with performance metrics
    """
    # Calculate returns
    returns = calculate_returns(signals_df, price_col, signal_col)
    
    # Calculate Sharpe ratio
    sharpe = calculate_sharpe_ratio(returns)
    
    # Calculate maximum drawdown
    max_dd, dd_start, dd_end = calculate_max_drawdown(returns)
    
    # Calculate win rate
    win_rate = calculate_win_rate(signals_df, result_col)
    
    # Calculate total return
    total_return = (1 + returns.dropna()).prod() - 1
    
    # Calculate annualized return (assuming 252 trading days)
    days = (signals_df.index[-1] - signals_df.index[0]).days
    years = days / 365
    ann_return = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0
    
    return {
        'sharpe_ratio': sharpe,
        'max_drawdown': max_dd,
        'win_rate': win_rate,
        'total_return': total_return,
        'annualized_return': ann_return,
        'num_trades': len(signals_df[signals_df[signal_col] != 0]),
        'completed_trades': len(signals_df[signals_df[result_col].notnull()]),
        'drawdown_start': dd_start,
        'drawdown_end': dd_end
    }
