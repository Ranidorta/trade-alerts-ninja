
import pytest
import pandas as pd
import numpy as np
import talib
import sys
import os

# Add the project root to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trade_alerts_upgrade import (
    extract_features, 
    generate_classic_signal,
    strategy_rsi_macd,
    strategy_breakout_atr,
    strategy_trend_adx,
    process_strategy
)

@pytest.fixture
def sample_data():
    """Fixture that provides sample price data for testing."""
    # Create a simple price series with a clear pattern
    dates = pd.date_range(start='2023-01-01', periods=100, freq='H')
    close_prices = np.sin(np.linspace(0, 4*np.pi, 100)) * 10 + 100  # Sine wave around 100
    
    df = pd.DataFrame({
        'timestamp': dates,
        'open': close_prices - 1,
        'high': close_prices + 2,
        'low': close_prices - 2,
        'close': close_prices,
        'volume': np.random.randint(100, 1000, size=100)
    })
    
    return df

@pytest.fixture
def processed_data(sample_data):
    """Fixture that provides data with technical indicators calculated."""
    return extract_features(sample_data)

def test_extract_features(sample_data):
    """Test if technical indicators are calculated correctly."""
    df = extract_features(sample_data)
    
    # Check if indicators were calculated
    assert 'rsi' in df.columns
    assert 'ma_short' in df.columns
    assert 'ma_long' in df.columns
    assert 'macd' in df.columns
    assert 'atr' in df.columns
    
    # Check if values are reasonable
    assert 0 <= df['rsi'].min() <= df['rsi'].max() <= 100
    assert not df['rsi'].isnull().any()
    assert not df['macd'].isnull().any()

def test_classic_signal_generation(processed_data):
    """Test if classic signal strategy generates valid signals."""
    processed_data['signal'] = processed_data.apply(generate_classic_signal, axis=1)
    
    # Check if signals are -1, 0, or 1
    assert processed_data['signal'].isin([-1, 0, 1]).all()
    
    # Should have at least some non-zero signals
    assert (processed_data['signal'] != 0).sum() > 0

def test_rsi_macd_strategy(processed_data):
    """Test if RSI_MACD strategy generates valid signals."""
    processed_data['signal'] = processed_data.apply(strategy_rsi_macd, axis=1)
    
    # Check if signals are -1, 0, or 1
    assert processed_data['signal'].isin([-1, 0, 1]).all()

def test_breakout_atr_strategy(processed_data):
    """Test if BREAKOUT_ATR strategy generates valid signals."""
    processed_data['signal'] = processed_data.apply(strategy_breakout_atr, axis=1)
    
    # Check if signals are -1, 0, or 1
    assert processed_data['signal'].isin([-1, 0, 1]).all()

def test_trend_adx_strategy(processed_data):
    """Test if TREND_ADX strategy generates valid signals."""
    processed_data['signal'] = processed_data.apply(strategy_trend_adx, axis=1)
    
    # Check if signals are -1, 0, or 1
    assert processed_data['signal'].isin([-1, 0, 1]).all()

def test_bollinger_bands_strategy(processed_data):
    """Test if Bollinger Bands strategy generates valid signals."""
    from strategies.bollinger_bands import strategy_bollinger_bands
    
    processed_data['signal'] = processed_data.apply(strategy_bollinger_bands, axis=1)
    
    # Check if signals are -1, 0, or 1
    assert processed_data['signal'].isin([-1, 0, 1]).all()

def test_bybit_api_integration():
    """Test if Bybit API can be accessed and returns valid data."""
    import requests
    
    # Test public endpoint that doesn't require authentication
    response = requests.get("https://api.bybit.com/v5/market/time")
    assert response.status_code == 200
    
    data = response.json()
    assert "result" in data
    assert "timeSecond" in data["result"]
