
"""
Unit tests for the volume analyzer module.
"""

import pytest
import numpy as np
import pandas as pd
import sys
import os

# Add the project root to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from signals.volume_analyzer import VolumeAnalyzer

@pytest.fixture
def analyzer():
    """Fixture that provides a VolumeAnalyzer instance."""
    return VolumeAnalyzer(lookback=10)

def test_add_volume_data(analyzer):
    """Test adding volume data."""
    analyzer.add_volume_data('BTCUSDT', 100)
    assert 'BTCUSDT' in analyzer.history
    assert len(analyzer.history['BTCUSDT']) == 1
    assert analyzer.history['BTCUSDT'][0] == 100

def test_zscore_calculation(analyzer):
    """Test Z-Score calculation."""
    # Add a series of similar volumes
    for i in range(5):
        analyzer.add_volume_data('BTCUSDT', 100)
    
    # Z-Score should be close to 0 for similar values
    assert abs(analyzer.z_scores['BTCUSDT']) < 0.01
    
    # Add an outlier
    analyzer.add_volume_data('BTCUSDT', 500)
    
    # Z-Score should be positive (higher than normal)
    assert analyzer.z_scores['BTCUSDT'] > 0.5

def test_analyze_method(analyzer):
    """Test the analyze method."""
    # Add some baseline data
    for i in range(5):
        analyzer.add_volume_data('BTCUSDT', 100)
    
    # Get Z-Score for new volume
    z_score = analyzer.analyze('BTCUSDT', 300)
    
    # Should be a positive Z-Score
    assert z_score > 0

def test_high_volume_symbols(analyzer):
    """Test getting high volume symbols."""
    # Add normal volumes for BTC
    for i in range(5):
        analyzer.add_volume_data('BTCUSDT', 100)
    
    # Add high volumes for ETH
    for i in range(5):
        analyzer.add_volume_data('ETHUSDT', 100)
    analyzer.add_volume_data('ETHUSDT', 500)  # Add spike
    
    # Get high volume symbols
    high_volume = analyzer.get_high_volume_symbols(threshold=1.0)
    
    # Only ETH should be in the list
    assert 'ETHUSDT' in high_volume
    assert 'BTCUSDT' not in high_volume

def test_analyze_dataframe(analyzer):
    """Test analyzing a DataFrame."""
    # Create sample DataFrame
    df = pd.DataFrame({
        'symbol': ['BTCUSDT', 'BTCUSDT', 'ETHUSDT', 'ETHUSDT'],
        'volume': [100, 110, 200, 600],
        'close': [50000, 51000, 4000, 4100]
    })
    
    # Process DataFrame
    result = analyzer.analyze_dataframe(df)
    
    # Check that Z-Score column was added
    assert 'volume_zscore' in result.columns
    
    # ETH's last value should have higher Z-Score than BTC
    btc_zscore = result[result['symbol'] == 'BTCUSDT']['volume_zscore'].iloc[-1]
    eth_zscore = result[result['symbol'] == 'ETHUSDT']['volume_zscore'].iloc[-1]
    assert eth_zscore > btc_zscore

def test_get_volume_anomalies(analyzer):
    """Test getting volume anomalies."""
    # Add normal volumes
    for symbol in ['BTCUSDT', 'ETHUSDT', 'XRPUSDT']:
        for i in range(5):
            analyzer.add_volume_data(symbol, 100)
    
    # Add anomaly for XRP
    analyzer.add_volume_data('XRPUSDT', 1000)
    
    # Get anomalies
    anomalies = analyzer.get_volume_anomalies(threshold=1.5)
    
    # Only XRP should be anomalous
    assert 'XRPUSDT' in anomalies
    assert 'BTCUSDT' not in anomalies
    assert 'ETHUSDT' not in anomalies
