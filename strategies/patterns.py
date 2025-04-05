
import numpy as np
import pandas as pd

def calculate_fibonacci_levels(df):
    """
    Calculate Fibonacci retracement levels based on the high and low points in the dataframe
    """
    max_price = df['high'].max()
    min_price = df['low'].min()
    diff = max_price - min_price
    
    levels = {
        '0%': min_price,
        '23.6%': min_price + 0.236 * diff,
        '38.2%': min_price + 0.382 * diff,
        '50%': min_price + 0.5 * diff,
        '61.8%': min_price + 0.618 * diff,
        '78.6%': min_price + 0.786 * diff,
        '100%': max_price
    }
    
    return levels

def detect_poc(df, bins=50):
    """
    Detect Point of Control (POC) - the price level with the highest volume
    Uses a simplified volume profile calculation
    """
    # Create a price range for the volume profile
    price_range = np.linspace(df['low'].min(), df['high'].max(), bins)
    
    # Initialize volume profile
    volume_profile = np.zeros(bins - 1)
    
    # For each candle, distribute its volume across price levels it touched
    for i, row in df.iterrows():
        # Find which bins the candle spans
        low_idx = np.searchsorted(price_range, row['low']) - 1
        high_idx = np.searchsorted(price_range, row['high'])
        
        # Make sure indices are within bounds
        low_idx = max(0, low_idx)
        high_idx = min(bins - 1, high_idx)
        
        # Distribute volume
        if high_idx > low_idx:
            # Simple distribution - equal volume to each price level
            vol_per_level = row['volume'] / (high_idx - low_idx)
            for j in range(low_idx, high_idx):
                volume_profile[j] += vol_per_level
    
    # Find the price level with the most volume
    poc_idx = np.argmax(volume_profile)
    poc_price = (price_range[poc_idx] + price_range[poc_idx + 1]) / 2
    
    return poc_price
