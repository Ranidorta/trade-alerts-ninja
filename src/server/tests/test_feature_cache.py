
"""
Tests for Feature Cache Module

This module contains tests for the feature cache functionality.
"""

import pytest
import pandas as pd
import numpy as np
import os
import shutil
from utils.feature_cache import FeatureCache

@pytest.fixture
def sample_df():
    """Create a sample DataFrame for testing."""
    np.random.seed(42)
    dates = pd.date_range('2023-01-01', periods=100)
    df = pd.DataFrame({
        'open': np.random.rand(100) * 100,
        'high': np.random.rand(100) * 100 + 10,
        'low': np.random.rand(100) * 100 - 10,
        'close': np.random.rand(100) * 100,
        'volume': np.random.rand(100) * 1000000
    }, index=dates)
    return df

@pytest.fixture
def test_cache_dir():
    """Create a temporary cache directory for testing."""
    cache_dir = "test_cache"
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
    yield cache_dir
    # Cleanup
    shutil.rmtree(cache_dir, ignore_errors=True)

def test_hash_dataframe(sample_df):
    """Test the hash_dataframe method."""
    cache = FeatureCache()
    hash1 = cache.hash_dataframe(sample_df)
    
    # Same DataFrame should produce the same hash
    hash2 = cache.hash_dataframe(sample_df)
    assert hash1 == hash2
    
    # Modified DataFrame should produce a different hash
    modified_df = sample_df.copy()
    modified_df.loc[modified_df.index[0], 'close'] = 999.99
    hash3 = cache.hash_dataframe(modified_df)
    assert hash1 != hash3
    
    # Selected columns should produce a different hash
    hash4 = cache.hash_dataframe(sample_df, columns=['close'])
    assert hash1 != hash4

def test_cache_save_and_retrieve(sample_df, test_cache_dir):
    """Test saving to and retrieving from cache."""
    cache = FeatureCache(cache_dir=test_cache_dir)
    
    # Save to cache
    cache_key = cache.hash_dataframe(sample_df)
    cache_path = cache.save_to_cache(sample_df, cache_key)
    
    # Check file exists
    assert os.path.exists(cache_path)
    
    # Get from cache
    cached_df = cache.get_from_cache(sample_df)
    assert cached_df is not None
    
    # Check data is the same
    pd.testing.assert_frame_equal(sample_df, cached_df)

def test_clean_old_cache_files(test_cache_dir):
    """Test cleaning of old cache files."""
    cache = FeatureCache(cache_dir=test_cache_dir, max_cache_files=2)
    
    # Create some test files
    for i in range(5):
        df = pd.DataFrame({'a': [i]})
        cache.save_to_cache(df, f"test{i}")
    
    # Clean old files
    cache.clean_old_cache_files()
    
    # Check we only have 2 files left
    cache_files = os.listdir(test_cache_dir)
    assert len(cache_files) <= 2

def test_symbol_specific_cache(sample_df, test_cache_dir):
    """Test symbol-specific caching."""
    cache = FeatureCache(cache_dir=test_cache_dir)
    
    # Save to cache with different symbols
    btc_df = sample_df.copy()
    eth_df = sample_df.copy()  # Same data but different symbol
    
    # Save both to cache
    btc_cache_path = cache.save_to_cache(btc_df, symbol="BTCUSDT")
    eth_cache_path = cache.save_to_cache(eth_df, symbol="ETHUSDT")
    
    # Check files exist and are different
    assert os.path.exists(btc_cache_path)
    assert os.path.exists(eth_cache_path)
    assert btc_cache_path != eth_cache_path
    
    # Retrieve from cache
    btc_cached = cache.get_from_cache(btc_df, symbol="BTCUSDT")
    eth_cached = cache.get_from_cache(eth_df, symbol="ETHUSDT")
    
    # Check correct data is returned
    assert btc_cached is not None
    assert eth_cached is not None
    pd.testing.assert_frame_equal(btc_df, btc_cached)
    pd.testing.assert_frame_equal(eth_df, eth_cached)

def test_parallel_processing(test_cache_dir):
    """Test parallel processing functionality."""
    cache = FeatureCache(cache_dir=test_cache_dir)
    
    # Create test data
    def process_item(item):
        return item * 2
    
    items = list(range(10))
    results = cache.parallel_process(items, process_item)
    
    # Check results
    assert results == [i * 2 for i in items]

def test_signal_type_specific_cache(sample_df, test_cache_dir):
    """Test caching with signal type parameter."""
    cache = FeatureCache(cache_dir=test_cache_dir)
    
    # Save to cache with different signal types
    classic_df = sample_df.copy()
    fast_df = sample_df.copy()  # Same data but different signal type
    
    # Save both to cache (same symbol but different signal types)
    classic_cache_path = cache.save_to_cache(classic_df, symbol="BTCUSDT", signal_type="classic")
    fast_cache_path = cache.save_to_cache(fast_df, symbol="BTCUSDT", signal_type="fast")
    
    # Check files exist and are different
    assert os.path.exists(classic_cache_path)
    assert os.path.exists(fast_cache_path)
    assert classic_cache_path != fast_cache_path
    
    # Retrieve from cache
    classic_cached = cache.get_from_cache(classic_df, symbol="BTCUSDT", signal_type="classic")
    fast_cached = cache.get_from_cache(fast_df, symbol="BTCUSDT", signal_type="fast")
    
    # Check correct data is returned
    assert classic_cached is not None
    assert fast_cached is not None
    pd.testing.assert_frame_equal(classic_df, classic_cached)
    pd.testing.assert_frame_equal(fast_df, fast_cached)
