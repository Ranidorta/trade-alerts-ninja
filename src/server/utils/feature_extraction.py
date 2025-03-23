
"""
Feature Extraction Utility

This module provides optimized functions for extracting technical indicators from price data,
using both vectorized operations and caching for improved performance.
"""

import pandas as pd
import numpy as np
import talib
from .feature_cache import FeatureCache

class FeatureExtractor:
    """Class to extract technical indicators from price data."""
    
    def __init__(self, use_cache=True, cache_dir="cache", max_cache_age_days=7):
        """
        Initialize the feature extractor.
        
        Args:
            use_cache: Whether to use caching
            cache_dir: Directory for cache files
            max_cache_age_days: Maximum age of cache files in days
        """
        self.use_cache = use_cache
        if use_cache:
            self.cache = FeatureCache(cache_dir, max_cache_age_days)
    
    def extract_features(self, df):
        """
        Extract technical indicators from price data with optional caching.
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            DataFrame: Original data with added technical indicators
        """
        # Try to get from cache if enabled
        if self.use_cache:
            cached_df = self.cache.get_from_cache(df)
            if cached_df is not None:
                return cached_df
        
        # Clone the DataFrame to avoid modifying the original
        result_df = df.copy()
        
        # Extract features using vectorized operations
        result_df = self._add_momentum_indicators(result_df)
        result_df = self._add_trend_indicators(result_df)
        result_df = self._add_volatility_indicators(result_df)
        result_df = self._add_volume_indicators(result_df)
        
        # Drop rows with NaN values
        result_df = result_df.dropna()
        
        # Save to cache if enabled
        if self.use_cache:
            self.cache.save_to_cache(result_df)
        
        return result_df
    
    def _add_momentum_indicators(self, df):
        """Add momentum indicators to the DataFrame."""
        # RSI - Relative Strength Index
        df['rsi'] = talib.RSI(df['close'], timeperiod=14)
        
        # MACD - Moving Average Convergence Divergence
        df['macd'], df['macd_signal'], df['macd_hist'] = talib.MACD(
            df['close'], fastperiod=12, slowperiod=26, signalperiod=9
        )
        
        # Stochastic
        df['stoch_k'], df['stoch_d'] = talib.STOCH(
            df['high'], df['low'], df['close'],
            fastk_period=14, slowk_period=3, slowd_period=3
        )
        
        return df
    
    def _add_trend_indicators(self, df):
        """Add trend indicators to the DataFrame."""
        # Moving Averages
        df['ma_short'] = talib.SMA(df['close'], timeperiod=5)
        df['ma_long'] = talib.SMA(df['close'], timeperiod=20)
        df['ema_short'] = talib.EMA(df['close'], timeperiod=5)
        df['ema_long'] = talib.EMA(df['close'], timeperiod=20)
        
        # Bollinger Bands
        df['bb_upper'], df['bb_middle'], df['bb_lower'] = talib.BBANDS(
            df['close'], timeperiod=20, nbdevup=2, nbdevdn=2
        )
        
        # ADX - Average Directional Index
        df['adx'] = talib.ADX(df['high'], df['low'], df['close'], timeperiod=14)
        
        return df
    
    def _add_volatility_indicators(self, df):
        """Add volatility indicators to the DataFrame."""
        # ATR - Average True Range
        df['atr'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=14)
        
        # Rolling Volatility
        df['volatility'] = df['close'].rolling(10).std()
        
        return df
    
    def _add_volume_indicators(self, df):
        """Add volume indicators to the DataFrame if volume data is available."""
        if 'volume' in df.columns:
            # OBV - On Balance Volume
            df['obv'] = talib.OBV(df['close'], df['volume'])
            
            # Volume SMA
            df['volume_sma'] = talib.SMA(df['volume'], timeperiod=20)
        
        return df
