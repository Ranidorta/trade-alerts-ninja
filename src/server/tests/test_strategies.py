
"""
Tests for Trading Strategies

This module contains tests for the trading strategies.
"""

import pytest
import pandas as pd
import numpy as np
from strategies.basic_strategy import BasicStrategy

@pytest.fixture
def sample_data():
    """Create sample data for testing."""
    # Create a sample DataFrame with the necessary columns
    data = {
        'close': [100, 101, 102, 103, 104, 105],
        'high': [102, 103, 104, 105, 106, 107],
        'low': [98, 99, 100, 101, 102, 103],
        'rsi': [25, 35, 45, 55, 65, 75],
        'ma_short': [101, 102, 103, 104, 105, 106],
        'ma_long': [100, 100, 100, 100, 106, 107],
        'atr': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        'volatility': [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        'macd': [0.1, 0.2, 0.3, -0.1, -0.2, -0.3],
        'macd_signal': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        'bb_upper': [105, 106, 107, 108, 109, 110],
        'bb_lower': [95, 96, 97, 98, 99, 100],
    }
    return pd.DataFrame(data)

def test_basic_strategy_buy_signal(sample_data):
    """Test buy signal generation."""
    strategy = BasicStrategy()
    # Customize row for a buy signal
    row = sample_data.iloc[0].copy()
    row['rsi'] = 25  # Below buy threshold
    row['ma_short'] = 101
    row['ma_long'] = 100
    row['atr'] = 1.0  # Above min
    row['volatility'] = 0.5  # Above min
    row['macd'] = 0.1  # Above signal
    row['macd_signal'] = 0.0
    row['close'] = 94  # Below lower band
    row['bb_lower'] = 95
    
    signal = strategy.generate_signal(row)
    assert signal == 1, "Should generate buy signal"

def test_basic_strategy_sell_signal(sample_data):
    """Test sell signal generation."""
    strategy = BasicStrategy()
    # Customize row for a sell signal
    row = sample_data.iloc[5].copy()
    row['rsi'] = 75  # Above sell threshold
    row['ma_short'] = 105
    row['ma_long'] = 106
    row['atr'] = 1.0  # Above min
    row['volatility'] = 0.5  # Above min
    row['macd'] = -0.3  # Below signal
    row['macd_signal'] = 0.0
    row['close'] = 111  # Above upper band
    row['bb_upper'] = 110
    
    signal = strategy.generate_signal(row)
    assert signal == -1, "Should generate sell signal"

def test_basic_strategy_no_signal(sample_data):
    """Test no signal generation."""
    strategy = BasicStrategy()
    # Customize row for no signal
    row = sample_data.iloc[2].copy()
    row['rsi'] = 45  # Between thresholds
    
    signal = strategy.generate_signal(row)
    assert signal == 0, "Should not generate a signal"
