
"""
Feature Cache Utility

This module provides caching functionality for feature extraction from financial data,
using an intelligent caching system to avoid redundant calculations.
"""

import os
import pandas as pd
import hashlib
import glob
import time
from datetime import datetime

class FeatureCache:
    """Class to manage caching of feature extraction results."""
    
    def __init__(self, cache_dir="cache", max_cache_age_days=7, max_cache_files=100):
        """
        Initialize the feature cache manager.
        
        Args:
            cache_dir: Directory to store cache files
            max_cache_age_days: Maximum age of cache files in days
            max_cache_files: Maximum number of cache files to keep
        """
        self.cache_dir = cache_dir
        self.max_cache_age_days = max_cache_age_days
        self.max_cache_files = max_cache_files
        
        # Create cache directory if it doesn't exist
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir)
    
    def hash_dataframe(self, df, columns=None):
        """
        Create a hash of the DataFrame content.
        
        Args:
            df: DataFrame to hash
            columns: Specific columns to include in the hash
            
        Returns:
            str: MD5 hash of the DataFrame
        """
        if columns:
            df_to_hash = df[columns].copy()
        else:
            df_to_hash = df.copy()
        
        # Use a faster method for large DataFrames
        if len(df_to_hash) > 10000:
            # Take a sample of rows for hashing to improve performance
            sample = df_to_hash.sample(n=10000, random_state=42)
            hash_input = pd.util.hash_pandas_object(sample).values
        else:
            hash_input = pd.util.hash_pandas_object(df_to_hash).values
        
        return hashlib.md5(hash_input).hexdigest()
    
    def get_cache_path(self, cache_key, prefix="features"):
        """Get the full path for a cache file."""
        return os.path.join(self.cache_dir, f"{prefix}_{cache_key}.parquet")
    
    def get_from_cache(self, df, columns_to_hash=None):
        """
        Try to get cached features for a DataFrame.
        
        Args:
            df: Input DataFrame
            columns_to_hash: Columns to use for the hash
            
        Returns:
            DataFrame or None: Cached DataFrame if it exists, None otherwise
        """
        if columns_to_hash is None:
            columns_to_hash = ['open', 'high', 'low', 'close']
            
        cache_key = self.hash_dataframe(df, columns_to_hash)
        cache_path = self.get_cache_path(cache_key)
        
        if os.path.exists(cache_path):
            try:
                return pd.read_parquet(cache_path)
            except Exception:
                # If there's an error reading the cache, return None
                return None
        
        return None
    
    def save_to_cache(self, df, cache_key=None, columns_to_hash=None):
        """
        Save DataFrame to cache.
        
        Args:
            df: DataFrame to cache
            cache_key: Optional pre-computed cache key
            columns_to_hash: Columns to use for the hash
            
        Returns:
            str: Path where the cache was saved
        """
        self.clean_old_cache_files()
        
        if cache_key is None:
            if columns_to_hash is None:
                columns_to_hash = ['open', 'high', 'low', 'close']
            cache_key = self.hash_dataframe(df, columns_to_hash)
        
        cache_path = self.get_cache_path(cache_key)
        df.to_parquet(cache_path)
        return cache_path
    
    def clean_old_cache_files(self):
        """
        Remove old cache files to maintain storage limits.
        - Removes files older than max_cache_age_days
        - Keeps only the newest max_cache_files files
        """
        now = time.time()
        max_age_seconds = self.max_cache_age_days * 24 * 60 * 60
        
        # Get all cache files
        cache_files = glob.glob(os.path.join(self.cache_dir, "*.parquet"))
        
        # Remove old files
        for file_path in cache_files:
            if os.path.exists(file_path):
                file_age = now - os.path.getmtime(file_path)
                if file_age > max_age_seconds:
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass
        
        # Check if we still have too many files
        cache_files = glob.glob(os.path.join(self.cache_dir, "*.parquet"))
        if len(cache_files) > self.max_cache_files:
            # Sort by modification time (newest first)
            cache_files.sort(key=os.path.getmtime, reverse=True)
            
            # Remove oldest files
            for file_path in cache_files[self.max_cache_files:]:
                try:
                    os.remove(file_path)
                except Exception:
                    pass
