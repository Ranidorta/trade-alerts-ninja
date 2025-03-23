
"""
Tests for Feature Extraction Functions

This module contains tests for the trading agent's feature extraction functions.
"""

import pytest
import pandas as pd
import numpy as np
from trading_agent_api import extract_features

@pytest.fixture
def price_data():
    """Create sample price data for testing."""
    # Create a sample DataFrame with OHLC data
    data = {
        'open': np.random.rand(100) * 100 + 100,
        'high': np.random.rand(100) * 10 + 110,
        'low': np.random.rand(100) * 10 + 90,
        'close': np.random.rand(100) * 100 + 100,
    }
    return pd.DataFrame(data)

def test_extract_features(price_data):
    """Test feature extraction from price data."""
    # Apply feature extraction
    result = extract_features(price_data)
    
    # Check that all expected features are present
    expected_columns = [
        'open', 'high', 'low', 'close',
        'rsi', 'ma_short', 'ma_long', 'atr',
        'volatility', 'macd', 'macd_signal',
        'bb_upper', 'bb_lower'
    ]
    
    for col in expected_columns:
        assert col in result.columns, f"Column {col} should be present in the result"
    
    # Check that indicators have valid values
    assert not result['rsi'].isnull().any(), "RSI should not have any NaN values"
    assert (result['rsi'] >= 0).all() and (result['rsi'] <= 100).all(), "RSI should be between 0 and 100"
    
    assert not result['atr'].isnull().any(), "ATR should not have any NaN values"
    assert (result['atr'] >= 0).all(), "ATR should be non-negative"
    
    assert not result['volatility'].isnull().any(), "Volatility should not have any NaN values"
    assert (result['volatility'] >= 0).all(), "Volatility should be non-negative"
    
    # Verify the number of rows (should be less due to indicators requiring lookback periods)
    assert len(result) < len(price_data), "Result should have fewer rows due to indicator lookback periods"
