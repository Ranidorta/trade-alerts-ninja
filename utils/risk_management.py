
"""
Risk management utility functions.

This module provides functions for calculating ATR (Average True Range),
stop-loss levels, and take-profit targets based on volatility.
"""

import pandas as pd
import numpy as np
from ta.volatility import AverageTrueRange


def calculate_atr(df, window=14):
    """
    Calculate the Average True Range (ATR) for a DataFrame with OHLC data.
    
    Args:
        df: DataFrame with high, low, and close prices
        window: ATR calculation window (default: 14)
        
    Returns:
        DataFrame with added 'atr' column
    """
    # Make a copy to avoid modifying the original
    df_copy = df.copy()
    
    # Calculate ATR using ta library
    atr_indicator = AverageTrueRange(
        high=df_copy['high'], 
        low=df_copy['low'], 
        close=df_copy['close'], 
        window=window
    )
    df_copy['atr'] = atr_indicator.average_true_range()
    
    return df_copy


def calculate_stop_loss(df, atr_multiplier=2):
    """
    Calculate stop-loss and take-profit levels based on ATR.
    
    Args:
        df: DataFrame with OHLC data
        atr_multiplier: Multiplier for ATR to determine levels (default: 2)
        
    Returns:
        DataFrame with stop-loss and take-profit columns
    """
    # Make a copy to avoid modifying the original
    df_copy = df.copy()
    
    # Calculate ATR if not already present
    if 'atr' not in df_copy.columns:
        df_copy = calculate_atr(df_copy)
    
    # Calculate stop-loss (below current price)
    df_copy['stop_loss'] = df_copy['close'] - (df_copy['atr'] * atr_multiplier)
    
    # Calculate take-profit levels (above current price)
    df_copy['take_profit_1'] = df_copy['close'] + (df_copy['atr'] * atr_multiplier)
    df_copy['take_profit_2'] = df_copy['close'] + (df_copy['atr'] * atr_multiplier * 2)
    df_copy['take_profit_3'] = df_copy['close'] + (df_copy['atr'] * atr_multiplier * 3)
    
    # Return only the relevant columns
    return df_copy[['timestamp', 'close', 'atr', 'stop_loss', 
                   'take_profit_1', 'take_profit_2', 'take_profit_3']]


def calculate_position_size(capital, risk_percentage, entry_price, stop_loss):
    """
    Calculate the optimal position size based on risk management.
    
    Args:
        capital: Total capital available
        risk_percentage: Percentage of capital to risk (e.g., 1 for 1%)
        entry_price: Entry price for the trade
        stop_loss: Stop-loss price level
        
    Returns:
        Position size (units/coins to buy/sell)
    """
    # Calculate the amount of capital to risk
    risk_amount = capital * (risk_percentage / 100)
    
    # Calculate the distance to stop-loss in price units
    stop_distance = abs(entry_price - stop_loss)
    
    # If stop distance is too small, set a minimum to avoid division by zero
    if stop_distance < 0.0001:
        stop_distance = 0.0001
    
    # Calculate position size
    position_size = risk_amount / stop_distance
    
    return position_size


def risk_reward_ratio(entry_price, take_profit, stop_loss):
    """
    Calculate the risk-to-reward ratio for a trade.
    
    Args:
        entry_price: Entry price for the trade
        take_profit: Take-profit price level
        stop_loss: Stop-loss price level
        
    Returns:
        Risk-to-reward ratio
    """
    # Calculate potential reward
    reward = abs(take_profit - entry_price)
    
    # Calculate potential risk
    risk = abs(entry_price - stop_loss)
    
    # Calculate risk-to-reward ratio
    if risk == 0:
        return np.inf  # Avoid division by zero
    
    return reward / risk

