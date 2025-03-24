
"""
End-to-end tests for Bybit API integration with mock responses.

These tests validate the API connection and data processing
without making actual API calls to the Bybit servers.
"""

import pytest
from unittest.mock import Mock, patch
import pandas as pd
import numpy as np
import json
import os

# Add test directory to path if needed
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Mock the API response
@pytest.fixture
def mock_kline_response():
    """Mock response for kline data"""
    return {
        'result': [
            {
                'symbol': 'BTCUSDT',
                'interval': '15',
                'open_time': 1625097600,
                'open': '35000',
                'high': '35500',
                'low': '34800',
                'close': '35200',
                'volume': '100',
                'turnover': '3500000'
            },
            {
                'symbol': 'BTCUSDT',
                'interval': '15',
                'open_time': 1625097900,
                'open': '35200',
                'high': '35700',
                'low': '35100',
                'close': '35600',
                'volume': '120',
                'turnover': '4200000'
            }
        ],
        'ret_code': 0,
        'ret_msg': 'OK',
        'ext_code': '',
        'ext_info': '',
        'time_now': '1625097985.251362'
    }

@pytest.fixture
def mock_bybit():
    """Mock Bybit API client"""
    with patch('pybit.usdt_perpetual.HTTP') as mock:
        yield mock

def test_api_connection(mock_bybit, mock_kline_response):
    """Test API connection with mock response"""
    from api.bybit import get_candles
    
    # Setup mock
    mock_instance = mock_bybit.return_value
    mock_instance.query_kline.return_value = mock_kline_response
    
    # Call the function
    df = get_candles("BTCUSDT", interval="15", limit=100)
    
    # Validate response
    assert isinstance(df, pd.DataFrame)
    assert not df.empty
    assert 'close' in df.columns
    assert len(df) == 2
    assert float(df.iloc[0]['close']) == 35200

def test_api_error_handling(mock_bybit):
    """Test error handling with invalid response"""
    from api.bybit import get_candles
    
    # Setup mock to return error
    mock_instance = mock_bybit.return_value
    mock_instance.query_kline.side_effect = Exception("API Connection Failed")
    
    # Call the function and expect empty DataFrame
    df = get_candles("BTCUSDT", interval="15", limit=100)
    assert df.empty

def test_data_processing(mock_bybit, mock_kline_response):
    """Test data processing pipeline with mock data"""
    from api.bybit import get_candles
    from strategies.bollinger_bands import BollingerBandsStrategy
    
    # Setup mock
    mock_instance = mock_bybit.return_value
    mock_instance.query_kline.return_value = mock_kline_response
    
    # Get data
    df = get_candles("BTCUSDT", interval="15", limit=100)
    
    # Process with strategy
    strategy = BollingerBandsStrategy()
    processed_df = strategy.prepare_data(df)
    
    # Validate processing (will have NaN values due to limited data)
    assert 'upper_band' in processed_df.columns
    assert 'middle_band' in processed_df.columns
    assert 'lower_band' in processed_df.columns
