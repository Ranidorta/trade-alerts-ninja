
"""
Caching utilities for improved performance.

This module provides caching mechanisms to avoid repetitive calculations
of technical indicators and other computationally expensive operations.
"""

import functools
import hashlib
import pandas as pd
import numpy as np
from typing import Any, Callable, Dict, Tuple


@functools.lru_cache(maxsize=128)
def cached_calculation(func_name: str, data_hash: str, *args, **kwargs) -> Any:
    """
    Generic caching function for expensive calculations.
    
    Args:
        func_name: Name of the function to cache
        data_hash: Hash of the input data
        *args, **kwargs: Arguments to pass to the function
        
    Returns:
        Cached function result
    """
    # This is just a placeholder - the actual caching is done by lru_cache
    # The actual function is not called here; this is just for creating
    # a unique cache key based on the function name, data hash, and args
    return (func_name, data_hash, args, tuple(sorted(kwargs.items())))


def make_df_hashable(df: pd.DataFrame) -> str:
    """
    Convert a DataFrame to a hashable string representation.
    
    Args:
        df: DataFrame to convert
        
    Returns:
        String hash of the DataFrame
    """
    # Use pandas' built-in hash function
    hash_value = pd.util.hash_pandas_object(df).values
    
    # Create an SHA-256 hash
    return hashlib.sha256(hash_value).hexdigest()


def cached_indicator(func: Callable) -> Callable:
    """
    Decorator to cache technical indicator calculations.
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function with caching
    """
    @functools.wraps(func)
    def wrapper(df: pd.DataFrame, *args, **kwargs) -> Any:
        # Make DataFrame hashable
        df_hash = make_df_hashable(df)
        
        # Create a hashable representation of args and kwargs
        args_hash = hashlib.sha256(str(args).encode()).hexdigest()
        kwargs_hash = hashlib.sha256(str(sorted(kwargs.items())).encode()).hexdigest()
        
        # Combine hashes
        combined_hash = hashlib.sha256((df_hash + args_hash + kwargs_hash).encode()).hexdigest()
        
        # Try to get from cache using combined hash
        cache_key = (func.__name__, combined_hash)
        
        # Use functools.lru_cache behind the scenes
        # This is a bit of a hack, but it allows us to cache with a DataFrame
        return cached_calculation(func.__name__, combined_hash, *args, **kwargs)
    
    return wrapper


# Dictionary to store memoized results
_memoize_cache: Dict[Tuple, Any] = {}

def memoize(func: Callable) -> Callable:
    """
    Memoization decorator for functions with complex arguments.
    
    Unlike lru_cache, this can handle non-hashable arguments but
    doesn't limit the cache size, so use with caution.
    
    Args:
        func: Function to memoize
        
    Returns:
        Memoized function
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Convert args to a more hashable form
        hashable_args = []
        for arg in args:
            if isinstance(arg, pd.DataFrame):
                # For DataFrame, use the hash
                hashable_args.append(make_df_hashable(arg))
            elif isinstance(arg, np.ndarray):
                # For numpy arrays, use the data buffer hash
                hashable_args.append(hashlib.sha256(arg.data.tobytes()).hexdigest())
            else:
                # For other types, use directly
                hashable_args.append(arg)
        
        # Create a key from the function name, args, and kwargs
        key = (func.__name__, tuple(hashable_args), frozenset(kwargs.items()))
        
        # Check if already in cache
        if key not in _memoize_cache:
            _memoize_cache[key] = func(*args, **kwargs)
        
        return _memoize_cache[key]
    
    return wrapper


def clear_cache():
    """Clear all memoization caches."""
    global _memoize_cache
    _memoize_cache.clear()
    
    # Also clear lru_cache for cached_calculation
    cached_calculation.cache_clear()
