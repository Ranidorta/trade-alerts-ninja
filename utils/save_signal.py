
"""
Signal saving utility for storing trading signals in CSV format.

This module provides functions for saving generated trading signals to
a CSV file in the data directory, supporting append operations and
handling file creation if it doesn't exist yet.
"""

import os
import pandas as pd
from pathlib import Path
from datetime import datetime


def save_signal(signal):
    """
    Save a trading signal to the historical signals CSV file.
    
    Creates the file if it doesn't exist, appends the signal if it does,
    and ensures the CSV header is only written once.
    
    Args:
        signal: Dictionary containing signal data with keys like
               timestamp, asset, direction, score, entry_price, sl, tp, result
    
    Returns:
        bool: True if saved successfully, False otherwise
    """
    # Ensure the data directory exists
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    file_path = data_dir / "historical_signals.csv"
    
    try:
        # Convert signal to DataFrame for easy CSV handling
        df = pd.DataFrame([signal])
        
        # Write with header if file doesn't exist, append without header if it does
        write_header = not file_path.exists()
        
        # Append mode ('a') adds to existing file without overwriting
        df.to_csv(file_path, mode='a', header=write_header, index=False)
        
        print(f"Signal saved to {file_path}")
        return True
    except Exception as e:
        print(f"Error saving signal: {str(e)}")
        return False


# Example usage
if __name__ == "__main__":
    # Test signal example
    signal = {
        'timestamp': datetime.utcnow().isoformat(),
        'asset': 'BTCUSDT',
        'direction': 'BUY',
        'score': 0.87,
        'entry_price': 50000,
        'sl': 49000,
        'tp': 52000,
        'result': None
    }
    save_signal(signal)
    
    # Example of reading the saved signals
    try:
        saved_signals = pd.read_csv("data/historical_signals.csv")
        print(f"Current saved signals ({len(saved_signals)} records):")
        print(saved_signals.tail(5))  # Show last 5 signals
    except Exception as e:
        print(f"Could not read signals file: {str(e)}")
