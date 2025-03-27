
"""
Enhanced Mean Reversion strategy with dynamic ADX filtering and overfitting protection.
"""

import pandas as pd
import numpy as np
import talib
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("mean_reversion")

class MeanReversionEnhanced:
    """
    Enhanced Mean Reversion strategy with dynamic ADX filtering.
    
    This strategy looks for oversold/overbought conditions with 
    RSI while applying an ADX filter to avoid trading in strong trends.
    """
    
    def __init__(self, params: Dict[str, Any] = None):
        """
        Initialize with parameters.
        
        Args:
            params: Dictionary with strategy parameters
        """
        default_params = {
            'rsi_window': 14,
            'rsi_overbought': 70,
            'rsi_oversold': 30,
            'adx_period': 14,
            'adx_threshold': 25,
            'lookback_periods': 100  # For overfitting protection
        }
        
        self.params = default_params.copy()
        if params:
            self.params.update(params)
            
        logger.info(f"Initialized MeanReversionEnhanced with params: {self.params}")
        
        # Store recent performance for overfitting protection
        self.recent_signals = []
        self.success_rate = 0.5  # Initial neutral value
        
    def prepare_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate necessary indicators for the strategy.
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            DataFrame with added indicators
        """
        # Copy to avoid modifying original
        data = df.copy()
        
        # Calculate RSI
        data['rsi'] = talib.RSI(data['close'], timeperiod=self.params['rsi_window'])
        
        # Calculate ADX for trend strength
        data['adx'] = talib.ADX(data['high'], data['low'], data['close'], 
                               timeperiod=self.params['adx_period'])
        
        # Calculate dynamic ADX threshold based on recent volatility
        volatility = data['close'].pct_change().rolling(20).std() * 100
        data['adx_threshold'] = np.maximum(
            self.params['adx_threshold'], 
            volatility * 2  # Adjust threshold based on volatility
        )
        
        # Add Bollinger Bands for additional confirmation
        data['upper_band'], data['middle_band'], data['lower_band'] = \
            talib.BBANDS(data['close'], timeperiod=20, nbdevup=2, nbdevdn=2)
            
        return data
        
    def strategy_function(self, row):
        """
        Core strategy logic applied to each row.
        
        Args:
            row: Single row of DataFrame with indicators
            
        Returns:
            int: Signal (1 for buy, -1 for sell, 0 for neutral)
        """
        # Skip if not enough data points for calculation
        if pd.isna(row['rsi']) or pd.isna(row['adx']):
            return 0
            
        # Buy condition: RSI oversold + weak trend
        if (row['rsi'] < self.params['rsi_oversold'] and 
            row['adx'] < row['adx_threshold'] and
            row['close'] < row['lower_band']):
            return 1
            
        # Sell condition: RSI overbought + weak trend
        elif (row['rsi'] > self.params['rsi_overbought'] and 
              row['adx'] < row['adx_threshold'] and
              row['close'] > row['upper_band']):
            return -1
            
        # No signal
        return 0
        
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate signals based on the strategy.
        
        Args:
            data: DataFrame with market data
            
        Returns:
            DataFrame with 'signal' column (1=buy, -1=sell, 0=neutral)
        """
        # Initialize a flag to track if parameters were modified
        params_modified = False
        old_params = None
        
        # Apply overfitting protection
        if self._is_overfitting():
            logger.warning("Detected potential overfitting, reducing signal frequency")
            # Save original parameters
            old_params = self.params.copy()
            params_modified = True
            
            # Add random noise to thresholds to break patterns
            temp_params = self.params.copy()
            temp_params['rsi_oversold'] = self.params['rsi_oversold'] - np.random.randint(0, 5)
            temp_params['rsi_overbought'] = self.params['rsi_overbought'] + np.random.randint(0, 5)
            self.params = temp_params
        
        # Prepare data with indicators
        df = self.prepare_data(data.copy())
        
        # Generate signals
        df['signal'] = df.apply(self.strategy_function, axis=1)
        
        # Log signal summary
        buy_signals = (df['signal'] == 1).sum()
        sell_signals = (df['signal'] == -1).sum()
        logger.info(f"Generated {buy_signals} buy signals and {sell_signals} sell signals")
        
        # Restore original parameters if changed for overfitting protection
        if params_modified and old_params is not None:
            self.params = old_params
            logger.debug("Restored original parameters after temporary modification")
            
        return df
        
    def _is_overfitting(self) -> bool:
        """
        Check if strategy is overfitting to recent data.
        
        Returns:
            bool: True if potential overfitting detected
        """
        # Not enough data to determine
        if len(self.recent_signals) < 10:
            return False
        
        # Check for pattern of alternating signals (potential overfitting)
        signal_directions = [s.get('direction', 0) for s in self.recent_signals[-10:]]
        
        # Check if alternating patterns (too regular)
        alternating = 0
        for i in range(1, len(signal_directions)):
            if signal_directions[i] != signal_directions[i-1]:
                alternating += 1
                
        # If more than 80% are alternating, potential overfitting
        return alternating > 8
        
    def update_performance(self, signal, result):
        """
        Update strategy performance metrics.
        
        Args:
            signal: The signal that was generated
            result: The result (success=1, failure=0)
        """
        self.recent_signals.append({
            'direction': signal.get('direction'),
            'result': result,
            'timestamp': signal.get('timestamp')
        })
        
        # Keep history manageable
        if len(self.recent_signals) > self.params['lookback_periods']:
            self.recent_signals.pop(0)
            
        # Update success rate
        if self.recent_signals:
            results = [s.get('result', 0) for s in self.recent_signals]
            self.success_rate = sum(results) / len(results)

# For backwards compatibility - function version of the strategy
def strategy_mean_reversion_enhanced(row):
    """
    Legacy function interface for mean reversion strategy.
    
    Args:
        row: DataFrame row with indicators
        
    Returns:
        int: Signal (1=buy, -1=sell, 0=neutral)
    """
    # Default ADX threshold
    adx_threshold = 25
    
    # Skip if indicators not available
    if 'rsi' not in row or 'adx' not in row:
        return 0
        
    # Buy condition (oversold + weak trend)
    if row['rsi'] < 30 and row['adx'] < adx_threshold:
        return 1
        
    # Sell condition (overbought + weak trend)
    elif row['rsi'] > 70 and row['adx'] < adx_threshold:
        return -1
        
    return 0
