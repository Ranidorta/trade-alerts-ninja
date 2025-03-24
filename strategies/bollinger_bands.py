
"""
Bollinger Bands Strategy Implementation

This strategy generates trading signals based on price movements
relative to Bollinger Bands with volume confirmation.
"""

import pandas as pd
import talib
import numpy as np
from strategies.template import TradingStrategy

def strategy_bollinger_bands(row):
    """
    Bollinger Bands strategy function that can be applied to a DataFrame row.
    
    Generates buy signals when price touches lower band with above-average volume.
    Generates sell signals when price touches upper band with above-average volume.
    
    Args:
        row: DataFrame row with OHLCV data and Bollinger Bands indicators
        
    Returns:
        int: 1 for buy, -1 for sell, 0 for neutral
    """
    # Check if we have the required indicators
    if not all(indicator in row.index for indicator in 
              ['upper_band', 'middle_band', 'lower_band', 'volume', 'volume_sma']):
        return 0
    
    # Buy signal: Price near lower band with above average volume
    if (row['close'] <= row['lower_band'] * 1.02 and 
        row['volume'] > row['volume_sma'] * 1.2):
        return 1
        
    # Sell signal: Price near upper band with above average volume
    elif (row['close'] >= row['upper_band'] * 0.98 and
          row['volume'] > row['volume_sma'] * 1.2):
        return -1
        
    # No signal
    return 0


class BollingerBandsStrategy(TradingStrategy):
    """
    Bollinger Bands trading strategy with volume confirmation.
    
    This strategy looks for price touches to the Bollinger Bands
    combined with volume spikes to confirm the signal.
    """
    
    def __init__(self, params: dict = None):
        """
        Initialize with strategy parameters.
        
        Args:
            params: Dictionary with parameters (timeperiod, std_dev, etc.)
        """
        default_params = {
            'bb_period': 20,           # Period for Bollinger Bands
            'bb_std_dev': 2,           # Standard deviations for bands
            'volume_period': 20,       # Period for volume SMA
            'volume_threshold': 1.2,   # Volume multiple above average for confirmation
        }
        
        # Update default params with provided ones
        params = params or {}
        default_params.update(params)
        
        super().__init__(default_params)
    
    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare data by calculating Bollinger Bands and volume indicators.
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            DataFrame with added indicators
        """
        # Calculate Bollinger Bands
        df['upper_band'], df['middle_band'], df['lower_band'] = talib.BBANDS(
            df['close'], 
            timeperiod=self.params['bb_period'],
            nbdevup=self.params['bb_std_dev'],
            nbdevdn=self.params['bb_std_dev']
        )
        
        # Calculate volume SMA for comparison
        df['volume_sma'] = talib.SMA(df['volume'], timeperiod=self.params['volume_period'])
        
        return df
    
    def strategy_function(self, row):
        """
        Core strategy logic for Bollinger Bands.
        
        Args:
            row: Single row of DataFrame with indicators
            
        Returns:
            Signal value: 1 (buy), -1 (sell), 0 (neutral)
        """
        return strategy_bollinger_bands(row)
