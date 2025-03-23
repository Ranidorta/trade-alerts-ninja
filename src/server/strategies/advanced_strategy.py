
"""
Advanced Trading Strategy with Optimized Performance

This module defines an advanced trading strategy that uses technical indicators 
to generate buy and sell signals with optimized NumPy vectorization.
"""

import numpy as np
import pandas as pd

class AdvancedStrategy:
    """Advanced trading strategy using vectorized calculations for better performance."""
    
    def __init__(self):
        """Initialize strategy parameters."""
        # Strategy parameters
        self.RSI_THRESHOLD_BUY = 30
        self.RSI_THRESHOLD_SELL = 70
        self.ATR_MIN = 0.5
        self.VOLATILITY_MIN = 0.3
        self.RISK_REWARD_RATIO = 1.5
        self.RISK_PER_TRADE = 0.02  # 2% of capital per trade
    
    def generate_signals_vectorized(self, df):
        """
        Generate trading signals in a vectorized way for the entire DataFrame.
        
        Args:
            df: DataFrame with technical indicators
            
        Returns:
            numpy.ndarray: Array of signals (1, -1, 0)
        """
        # Create arrays for each condition
        buy_conditions = (
            (df['rsi'] < self.RSI_THRESHOLD_BUY) &
            (df['ma_short'] > df['ma_long']) &
            (df['atr'] > self.ATR_MIN) &
            (df['volatility'] > self.VOLATILITY_MIN) &
            (df['macd'] > df['macd_signal']) &
            (df['close'] < df['bb_lower'])
        )
        
        sell_conditions = (
            (df['rsi'] > self.RSI_THRESHOLD_SELL) &
            (df['ma_short'] < df['ma_long']) &
            (df['atr'] > self.ATR_MIN) &
            (df['volatility'] > self.VOLATILITY_MIN) &
            (df['macd'] < df['macd_signal']) &
            (df['close'] > df['bb_upper'])
        )
        
        # Initialize all signals to 0
        signals = np.zeros(len(df))
        
        # Set buy signals to 1 and sell signals to -1
        signals[buy_conditions] = 1
        signals[sell_conditions] = -1
        
        return signals
    
    def simulate_trades_vectorized(self, df):
        """
        Simulate trades in a vectorized way for the entire DataFrame.
        
        Args:
            df: DataFrame with signals and prices
            
        Returns:
            numpy.ndarray: Array of trade results (1 for win, 0 for loss, None otherwise)
        """
        # Create arrays for price differences
        entry_prices = df['close'].values
        future_prices = df['future_price'].values
        signals = df['signal'].values
        atrs = df['atr'].values
        
        # Initialize results array with NaN
        results = np.full(len(df), np.nan)
        
        # Calculate stop loss and take profit levels
        stop_loss = atrs
        take_profit = atrs * self.RISK_REWARD_RATIO
        
        # Process long positions (signal == 1)
        long_mask = signals == 1
        if np.any(long_mask):
            # Check if take profit was hit
            tp_hit = future_prices[long_mask] >= (entry_prices[long_mask] + take_profit[long_mask])
            # Check if stop loss was hit
            sl_hit = future_prices[long_mask] <= (entry_prices[long_mask] - stop_loss[long_mask])
            
            # Set results for long positions
            results[long_mask] = np.where(tp_hit, 1, np.where(sl_hit, 0, np.nan))
        
        # Process short positions (signal == -1)
        short_mask = signals == -1
        if np.any(short_mask):
            # Check if take profit was hit
            tp_hit = future_prices[short_mask] <= (entry_prices[short_mask] - take_profit[short_mask])
            # Check if stop loss was hit
            sl_hit = future_prices[short_mask] >= (entry_prices[short_mask] + stop_loss[short_mask])
            
            # Set results for short positions
            results[short_mask] = np.where(tp_hit, 1, np.where(sl_hit, 0, np.nan))
        
        return results
    
    def calculate_position_sizes_vectorized(self, capital, atrs):
        """
        Calculate position sizes in a vectorized way.
        
        Args:
            capital: Trading capital
            atrs: Array of ATR values
            
        Returns:
            numpy.ndarray: Array of position sizes
        """
        risk_amount = capital * self.RISK_PER_TRADE
        # Avoid division by zero
        valid_atrs = np.where(atrs > 0, atrs, np.inf)
        position_sizes = risk_amount / valid_atrs
        # Round to 2 decimal places
        return np.round(position_sizes, 2)

    # Keep the original method for compatibility
    def generate_signal(self, row):
        """
        Generate trading signal based on technical indicators.
        
        Args:
            row: DataFrame row with technical indicators
            
        Returns:
            int: 1 for buy signal, -1 for sell signal, 0 for no signal
        """
        # Strategy with confluence of indicators and risk/volatility filters + MACD and BBands
        if (
            row['rsi'] < self.RSI_THRESHOLD_BUY and
            row['ma_short'] > row['ma_long'] and
            row['atr'] > self.ATR_MIN and
            row['volatility'] > self.VOLATILITY_MIN and
            row['macd'] > row['macd_signal'] and
            row['close'] < row['bb_lower']
        ):
            return 1  # Buy signal
        elif (
            row['rsi'] > self.RSI_THRESHOLD_SELL and
            row['ma_short'] < row['ma_long'] and
            row['atr'] > self.ATR_MIN and
            row['volatility'] > self.VOLATILITY_MIN and
            row['macd'] < row['macd_signal'] and
            row['close'] > self['bb_upper']
        ):
            return -1  # Sell signal
        return 0
