
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
