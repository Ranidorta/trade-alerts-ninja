
"""
Template for new trading strategies

How to use:
1. Copy this file and rename appropriately
2. Implement the logic in generate_signals() or strategy_function()
3. Add to factory in strategies/__init__.py
"""

import pandas as pd
import talib
import numpy as np

class TradingStrategy:
    """Base class for implementing trading strategies.
    
    This template follows a standard pattern for implementing new trading
    strategies that can be integrated with the trade-alerts-ninja platform.
    """
    
    def __init__(self, params: dict = None):
        """
        Initialize the strategy with parameters
        
        Args:
            params: Dictionary with strategy parameters
        """
        self.params = params or {}
        
    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare data by calculating necessary indicators
        
        Args:
            df: DataFrame with market data
            
        Returns:
            DataFrame with added indicators
        """
        # Override in subclasses
        return df
    
    def strategy_function(self, row):
        """
        Core strategy logic applied to each row
        
        Args:
            row: Single row of DataFrame
            
        Returns:
            Signal value: 1 (buy), -1 (sell), 0 (neutral)
        """
        # Override in subclasses
        return 0
        
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate buy/sell signals
        
        Args:
            data: DataFrame with market data
            
        Returns:
            DataFrame with 'signal' column (1=buy, -1=sell, 0=neutral)
        """
        # Prepare data with required indicators
        df = self.prepare_data(data.copy())
        
        # Apply strategy to each row
        df['signal'] = df.apply(self.strategy_function, axis=1)
        
        return df
