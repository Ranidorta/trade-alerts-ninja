
"""
Feature Cache Module

This module provides functionality to cache DataFrame features to disk
and retrieve them when needed to avoid redundant calculations.
It includes optimizations for multi-asset processing and signal-type specific caching.
"""

import os
import pandas as pd
import hashlib
from datetime import datetime, timedelta
import concurrent.futures
import logging
import numpy as np

class FeatureCache:
    """
    A class for caching processed DataFrames to disk and retrieving them.
    Optimized for multi-asset and multi-signal type processing.
    """
    
    def __init__(self, cache_dir="cache", max_cache_age_days=7, max_cache_files=1000):
        """
        Initialize the feature cache.
        
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
            
        # Setup logging
        logging.basicConfig(level=logging.INFO, 
                           format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger('FeatureCache')
        
        # Clean old cache files on startup
        self.clean_old_cache_files()
    
    def hash_dataframe(self, df, columns=None, max_rows=10000):
        """
        Create a hash of a DataFrame for caching purposes.
        
        Args:
            df: The DataFrame to hash
            columns: Optional list of columns to include in the hash
            max_rows: Maximum number of rows to sample for large DataFrames
            
        Returns:
            String: MD5 hash of the DataFrame
        """
        # For large DataFrames, use sampling to speed up hashing
        if len(df) > max_rows:
            # Use a deterministic sampling method
            np.random.seed(42)
            sample_indices = sorted(np.random.choice(len(df), max_rows, replace=False))
            df_sample = df.iloc[sample_indices]
        else:
            df_sample = df
            
        # Limit to specific columns if requested
        if columns is not None:
            df_sample = df_sample[columns].copy()
            
        # Create hash
        df_hash = hashlib.md5(pd.util.hash_pandas_object(df_sample).values).hexdigest()
        return df_hash
    
    def get_cache_path(self, cache_key=None, df=None, symbol=None, signal_type=None):
        """
        Get the path for a cache file.
        
        Args:
            cache_key: Optional custom cache key
            df: DataFrame to hash if no cache_key provided
            symbol: Optional symbol identifier
            signal_type: Optional signal type identifier
            
        Returns:
            String: Path to the cache file
        """
        # Generate key if not provided
        if cache_key is None and df is not None:
            cache_key = self.hash_dataframe(df)
            
        # Prefix with symbol if provided
        if symbol:
            cache_key = f"{symbol}_{cache_key}"
            
        # Append signal type if provided
        if signal_type:
            cache_key = f"{cache_key}_{signal_type}"
            
        return os.path.join(self.cache_dir, f"{cache_key}.parquet")
    
    def get_from_cache(self, df, symbol=None, signal_type=None):
        """
        Try to get a DataFrame from cache.
        
        Args:
            df: DataFrame to hash and look up in cache
            symbol: Optional symbol identifier
            signal_type: Optional signal type identifier
            
        Returns:
            DataFrame or None: The cached DataFrame if found, otherwise None
        """
        cache_path = self.get_cache_path(df=df, symbol=symbol, signal_type=signal_type)
        
        if os.path.exists(cache_path):
            try:
                self.logger.debug(f"Cache hit: {cache_path}")
                return pd.read_parquet(cache_path)
            except Exception as e:
                self.logger.warning(f"Error reading cache file {cache_path}: {e}")
                return None
        else:
            self.logger.debug(f"Cache miss: {cache_path}")
            return None
    
    def save_to_cache(self, df, cache_key=None, symbol=None, signal_type=None):
        """
        Save a DataFrame to cache.
        
        Args:
            df: DataFrame to save
            cache_key: Optional custom cache key
            symbol: Optional symbol identifier
            signal_type: Optional signal type identifier
            
        Returns:
            String: Path where the DataFrame was saved
        """
        cache_path = self.get_cache_path(cache_key, df, symbol, signal_type)
        
        try:
            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            
            # Save to parquet format
            df.to_parquet(cache_path, index=True)
            self.logger.debug(f"Saved to cache: {cache_path}")
            
            return cache_path
        except Exception as e:
            self.logger.error(f"Error saving to cache {cache_path}: {e}")
            return None
    
    def clean_old_cache_files(self):
        """
        Remove cache files that are older than max_cache_age_days
        or if there are more files than max_cache_files.
        """
        if not os.path.exists(self.cache_dir):
            return
            
        # Get all cache files with their modification time
        cache_files = []
        for filename in os.listdir(self.cache_dir):
            if filename.endswith('.parquet'):
                filepath = os.path.join(self.cache_dir, filename)
                mtime = os.path.getmtime(filepath)
                cache_files.append((filepath, mtime))
        
        # Sort by modification time (oldest first)
        cache_files.sort(key=lambda x: x[1])
        
        # Remove files that are too old
        cutoff_time = (datetime.now() - timedelta(days=self.max_cache_age_days)).timestamp()
        old_files = [f for f, t in cache_files if t < cutoff_time]
        for filepath in old_files:
            try:
                os.remove(filepath)
                self.logger.info(f"Removed old cache file: {filepath}")
            except Exception as e:
                self.logger.error(f"Error removing cache file {filepath}: {e}")
        
        # If we still have too many files, remove the oldest ones
        if len(cache_files) > self.max_cache_files:
            excess_count = len(cache_files) - self.max_cache_files
            for filepath, _ in cache_files[:excess_count]:
                if filepath not in old_files:  # Don't try to remove files we already removed
                    try:
                        os.remove(filepath)
                        self.logger.info(f"Removed excess cache file: {filepath}")
                    except Exception as e:
                        self.logger.error(f"Error removing cache file {filepath}: {e}")
    
    def parallel_process(self, items, process_func, max_workers=None):
        """
        Process items in parallel using a thread pool.
        
        Args:
            items: List of items to process
            process_func: Function to apply to each item
            max_workers: Maximum number of worker threads
            
        Returns:
            List: Results of processing each item
        """
        results = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_item = {executor.submit(process_func, item): item for item in items}
            
            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_item):
                item = future_to_item[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    self.logger.error(f"Error processing item {item}: {e}")
                    # Append None for failed items to maintain order
                    results.append(None)
        
        return results
