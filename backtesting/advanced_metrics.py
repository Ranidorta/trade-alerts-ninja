
"""
Advanced performance metrics for strategy evaluation.

This module provides additional performance metrics beyond the basic metrics
for more comprehensive strategy evaluation.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Union


def calculate_profit_factor(trades: List[Dict], commission: float = 0.0004) -> float:
    """
    Calculate Profit Factor with transaction costs.
    
    Profit Factor = Gross Profits / Gross Losses
    
    Args:
        trades: List of trade dictionaries with 'profit' field
        commission: Commission rate per trade (default: 0.0004 for 0.04%)
        
    Returns:
        float: Profit Factor (values > 1 are profitable)
    """
    if not trades:
        return 0.0
        
    # Add commission costs
    gross_profits = sum((t['profit'] * (1 - commission)) for t in trades if t['profit'] > 0)
    gross_losses = abs(sum((t['profit'] * (1 + commission)) for t in trades if t['profit'] < 0))
    
    # Avoid division by zero
    if gross_losses == 0:
        return float('inf') if gross_profits > 0 else 0.0
        
    return gross_profits / gross_losses


def calculate_expectancy(trades: List[Dict], commission: float = 0.0004) -> float:
    """
    Calculate system expectancy (average risk-adjusted return per trade).
    
    Expectancy = (Win Rate × Average Win) - (Loss Rate × Average Loss)
    
    Args:
        trades: List of trade dictionaries with 'profit' field
        commission: Commission rate per trade
        
    Returns:
        float: System expectancy
    """
    if not trades:
        return 0.0
        
    # Calculate wins and losses with commission
    wins = [t['profit'] * (1 - commission) for t in trades if t['profit'] > 0]
    losses = [t['profit'] * (1 + commission) for t in trades if t['profit'] < 0]
    
    total_trades = len(trades)
    win_count = len(wins)
    loss_count = len(losses)
    
    # Calculate rates
    win_rate = win_count / total_trades if total_trades > 0 else 0
    loss_rate = loss_count / total_trades if total_trades > 0 else 0
    
    # Calculate averages
    avg_win = sum(wins) / win_count if win_count > 0 else 0
    avg_loss = sum(losses) / loss_count if loss_count > 0 else 0
    
    # Calculate expectancy
    expectancy = (win_rate * avg_win) - (loss_rate * abs(avg_loss))
    
    return expectancy


def calculate_kelly_criterion(trades: List[Dict]) -> float:
    """
    Calculate Kelly Criterion for optimal position sizing.
    
    Kelly % = W - [(1-W)/R]
    Where:
    - W is win rate
    - R is win/loss ratio
    
    Args:
        trades: List of trade dictionaries with 'profit' field
        
    Returns:
        float: Kelly percentage (0.0 to 1.0)
    """
    if not trades:
        return 0.0
        
    wins = [t for t in trades if t['profit'] > 0]
    losses = [t for t in trades if t['profit'] < 0]
    
    win_count = len(wins)
    loss_count = len(losses)
    total_trades = len(trades)
    
    # Calculate win rate
    win_rate = win_count / total_trades if total_trades > 0 else 0
    
    # Calculate average win and loss
    avg_win = sum(t['profit'] for t in wins) / win_count if win_count > 0 else 0
    avg_loss = abs(sum(t['profit'] for t in losses) / loss_count) if loss_count > 0 else 0
    
    # Calculate win/loss ratio
    win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else 0
    
    # Calculate Kelly percentage
    kelly = win_rate - ((1 - win_rate) / win_loss_ratio) if win_loss_ratio > 0 else 0
    
    # Limit to range [0, 1]
    kelly = max(0, min(kelly, 1.0))
    
    return kelly


def calculate_risk_of_ruin(win_rate: float, risk_per_trade: float) -> float:
    """
    Calculate risk of ruin (probability of losing all capital).
    
    Risk of Ruin = ((1-edge)/(1+edge))^capital_units
    Where:
    - edge is the edge per trade (win_rate - (1-win_rate))
    - capital_units is the inverse of risk_per_trade
    
    Args:
        win_rate: Probability of winning a trade (0.0 to 1.0)
        risk_per_trade: Percentage of capital risked per trade (0.0 to 1.0)
        
    Returns:
        float: Risk of ruin (0.0 to 1.0)
    """
    if win_rate <= 0 or win_rate >= 1 or risk_per_trade <= 0 or risk_per_trade >= 1:
        return 1.0
        
    edge = win_rate - (1 - win_rate)
    
    # If edge is negative, ruin is certain
    if edge <= 0:
        return 1.0
        
    capital_units = 1 / risk_per_trade
    risk_of_ruin = ((1 - edge) / (1 + edge)) ** capital_units
    
    return risk_of_ruin


def calculate_cagr(trades: List[Dict], initial_capital: float, days: int) -> float:
    """
    Calculate Compound Annual Growth Rate.
    
    CAGR = (Final Value / Initial Value)^(1/years) - 1
    
    Args:
        trades: List of trade dictionaries with 'profit' field
        initial_capital: Starting capital
        days: Number of days in the backtest period
        
    Returns:
        float: CAGR as a decimal
    """
    if not trades or days <= 0:
        return 0.0
        
    # Calculate final capital
    total_profit = sum(t['profit'] for t in trades)
    final_capital = initial_capital + total_profit
    
    # Calculate years
    years = days / 365.0
    
    # Calculate CAGR
    if years > 0 and initial_capital > 0 and final_capital > 0:
        cagr = (final_capital / initial_capital) ** (1 / years) - 1
        return cagr
        
    return 0.0


def calculate_trade_analytics(trades: List[Dict]) -> Dict:
    """
    Calculate comprehensive trade analytics.
    
    Args:
        trades: List of trade dictionaries
        
    Returns:
        Dict: Dictionary with analytics metrics
    """
    if not trades:
        return {
            'total_trades': 0,
            'win_rate': 0,
            'profit_factor': 0,
            'expectancy': 0,
            'avg_win': 0,
            'avg_loss': 0,
            'largest_win': 0,
            'largest_loss': 0,
            'avg_holding_period': 0,
            'kelly_criterion': 0,
            'risk_of_ruin': 1.0
        }
    
    # Basic counts
    win_trades = [t for t in trades if t['profit'] > 0]
    loss_trades = [t for t in trades if t['profit'] < 0]
    
    total_trades = len(trades)
    win_count = len(win_trades)
    loss_count = len(loss_trades)
    
    # Win rate
    win_rate = win_count / total_trades if total_trades > 0 else 0
    
    # Calculate averages
    avg_win = sum(t['profit'] for t in win_trades) / win_count if win_count > 0 else 0
    avg_loss = abs(sum(t['profit'] for t in loss_trades) / loss_count) if loss_count > 0 else 0
    
    # Extremes
    largest_win = max([t['profit'] for t in win_trades], default=0) if win_trades else 0
    largest_loss = abs(min([t['profit'] for t in loss_trades], default=0)) if loss_trades else 0
    
    # Calculate holding period if timestamps available
    avg_holding_period = 0
    if all('entry_time' in t and 'exit_time' in t for t in trades):
        holding_periods = [(t['exit_time'] - t['entry_time']).total_seconds() / 3600 for t in trades]  # In hours
        avg_holding_period = sum(holding_periods) / len(holding_periods) if holding_periods else 0
    
    # Calculate advanced metrics
    profit_factor = calculate_profit_factor(trades)
    expectancy = calculate_expectancy(trades)
    kelly = calculate_kelly_criterion(trades)
    risk_of_ruin = calculate_risk_of_ruin(win_rate, 0.02)  # Assuming 2% risk per trade
    
    return {
        'total_trades': total_trades,
        'win_rate': win_rate,
        'profit_factor': profit_factor,
        'expectancy': expectancy,
        'avg_win': avg_win,
        'avg_loss': avg_loss,
        'largest_win': largest_win,
        'largest_loss': largest_loss,
        'avg_holding_period': avg_holding_period,
        'kelly_criterion': kelly,
        'risk_of_ruin': risk_of_ruin
    }


def analyze_drawdowns(returns: pd.Series, top_n: int = 5) -> List[Dict]:
    """
    Analyze and return details on the largest drawdowns.
    
    Args:
        returns: Series of period returns
        top_n: Number of largest drawdowns to return
        
    Returns:
        List of drawdown details
    """
    if returns.empty:
        return []
    
    # Calculate cumulative returns
    cum_returns = (1 + returns).cumprod()
    
    # Calculate previous peaks and drawdowns
    previous_peaks = cum_returns.cummax()
    drawdowns = (cum_returns - previous_peaks) / previous_peaks
    
    # Find drawdown periods
    is_in_drawdown = False
    drawdown_details = []
    current_drawdown = {
        'start': None,
        'end': None,
        'depth': 0,
        'recovery': None,
        'duration': 0
    }
    
    for date, value in drawdowns.iteritems():
        if not is_in_drawdown and value < 0:
            # Start of a drawdown
            is_in_drawdown = True
            current_drawdown = {
                'start': date,
                'depth': value,
                'end': date,
                'recovery': None,
                'duration': 0
            }
        elif is_in_drawdown:
            if value < current_drawdown['depth']:
                # Drawdown getting deeper
                current_drawdown['depth'] = value
                current_drawdown['end'] = date
            elif value == 0:
                # Drawdown recovered
                current_drawdown['recovery'] = date
                current_drawdown['duration'] = (date - current_drawdown['start']).days
                drawdown_details.append(current_drawdown)
                is_in_drawdown = False
    
    # Handle case where we're still in a drawdown at the end
    if is_in_drawdown:
        current_drawdown['duration'] = (drawdowns.index[-1] - current_drawdown['start']).days
        drawdown_details.append(current_drawdown)
    
    # Sort by depth and take top N
    drawdown_details.sort(key=lambda x: x['depth'])
    return drawdown_details[:top_n]


def generate_advanced_report(signals_df: pd.DataFrame, initial_capital: float = 10000, 
                           commission: float = 0.0004) -> Dict:
    """
    Generate a comprehensive performance report with advanced metrics.
    
    Args:
        signals_df: DataFrame with signals and price data
        initial_capital: Initial capital for backtesting
        commission: Commission rate per trade
        
    Returns:
        Dict with performance metrics
    """
    from backtesting.performance import calculate_returns, calculate_sharpe_ratio, calculate_max_drawdown
    
    # Calculate basic returns
    returns = calculate_returns(signals_df)
    
    # Extract trade information
    trades = []
    current_trade = None
    
    for idx, row in signals_df.iterrows():
        if row['signal'] == 1:  # Buy signal
            if current_trade is None:
                current_trade = {
                    'entry_time': idx,
                    'entry_price': row['close'],
                    'direction': 'long'
                }
        elif row['signal'] == -1:  # Sell signal
            if current_trade is None:
                current_trade = {
                    'entry_time': idx,
                    'entry_price': row['close'],
                    'direction': 'short'
                }
        
        # Check if we need to close a trade
        if current_trade and ((current_trade['direction'] == 'long' and row['signal'] == -1) or
                             (current_trade['direction'] == 'short' and row['signal'] == 1)):
            current_trade['exit_time'] = idx
            current_trade['exit_price'] = row['close']
            
            # Calculate profit/loss
            if current_trade['direction'] == 'long':
                current_trade['profit'] = (current_trade['exit_price'] / current_trade['entry_price']) - 1
            else:
                current_trade['profit'] = (current_trade['entry_price'] / current_trade['exit_price']) - 1
            
            trades.append(current_trade)
            current_trade = None
    
    # Calculate performance metrics
    sharpe = calculate_sharpe_ratio(returns)
    max_dd, dd_start, dd_end = calculate_max_drawdown(returns)
    
    # Calculate advanced metrics
    total_return = (1 + returns.dropna()).prod() - 1
    
    # Time-based metrics
    days = (signals_df.index[-1] - signals_df.index[0]).days if len(signals_df) > 1 else 0
    cagr = calculate_cagr(trades, initial_capital, days) if days > 0 else 0
    
    # Trade analytics
    trade_analytics = calculate_trade_analytics(trades)
    
    # Drawdown analysis
    drawdowns = analyze_drawdowns(returns)
    
    # Calculate profit factor
    profit_factor = calculate_profit_factor(trades, commission)
    
    # Calculate expectancy
    expectancy = calculate_expectancy(trades, commission)
    
    # Final report
    report = {
        'sharpe_ratio': sharpe,
        'max_drawdown': max_dd,
        'win_rate': trade_analytics['win_rate'],
        'total_return': total_return,
        'cagr': cagr,
        'profit_factor': profit_factor,
        'expectancy': expectancy,
        'num_trades': len(trades),
        'avg_trade_return': trade_analytics['avg_win'] if trade_analytics['win_rate'] > 0 else 0,
        'drawdown_start': dd_start,
        'drawdown_end': dd_end,
        'kelly_criterion': trade_analytics['kelly_criterion'],
        'risk_of_ruin': trade_analytics['risk_of_ruin'],
        'largest_drawdowns': drawdowns
    }
    
    return report
