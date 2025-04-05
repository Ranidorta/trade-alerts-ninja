
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


def update_result(timestamp, result):
    """
    Update the result of a previously saved signal based on its timestamp.
    
    Args:
        timestamp: The timestamp of the signal to update
        result: The result to set ('WINNER', 'LOSER', 'PARTIAL_WIN', 'FALSE')
    
    Returns:
        bool: True if updated successfully, False otherwise
    """
    # Validate the file exists
    file_path = Path("data/historical_signals.csv")
    if not file_path.exists():
        print(f"Error: Historical signals file not found at {file_path}")
        return False
    
    try:
        # Read the CSV file
        df = pd.read_csv(file_path)
        
        # Convert timestamps to datetime for comparison
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        timestamp_dt = pd.to_datetime(timestamp)
        
        # Find and update the matching record
        matches = df['timestamp'] == timestamp_dt
        if not any(matches):
            print(f"Error: No signal found with timestamp {timestamp}")
            return False
        
        # Update the result field
        df.loc[matches, 'result'] = result
        
        # Write the updated DataFrame back to the CSV file
        df.to_csv(file_path, index=False)
        
        print(f"Signal result updated: timestamp={timestamp}, result={result}")
        return True
    except Exception as e:
        print(f"Error updating signal result: {str(e)}")
        return False


def evaluate_signal(df, entry_idx, sl_pct=0.02, tp_pct=0.03):
    """
    Evaluates the outcome of a trading signal based on historical candle data.
    
    Args:
        df: DataFrame containing OHLCV data
        entry_idx: Index in the DataFrame where the entry occurred
        sl_pct: Stop loss percentage from entry price (default: 0.02 or 2%)
        tp_pct: Take profit percentage from entry price (default: 0.03 or 3%)
    
    Returns:
        str: Result of the signal - 'WINNER', 'PARTIAL_WIN', 'LOSER', or 'FALSE'
             if no target was hit
    """
    # Validate inputs
    if entry_idx < 0 or entry_idx >= len(df):
        print(f"Error: Invalid entry index {entry_idx} for DataFrame of length {len(df)}")
        return 'FALSE'
    
    # Extract entry price from the dataframe
    entry_price = df.iloc[entry_idx]['close']
    
    # Calculate stop loss and take profit levels
    sl = entry_price * (1 - sl_pct)
    tp = entry_price * (1 + tp_pct)
    partial_tp = entry_price * (1 + (tp_pct / 2))  # 50% of take profit
    
    # Scan forward through the dataframe to find outcomes
    for i in range(entry_idx + 1, len(df)):
        # Check if stop loss was hit
        if df.iloc[i]['low'] <= sl:
            return 'LOSER'
        
        # Check if take profit was hit
        if df.iloc[i]['high'] >= tp:
            return 'WINNER'
        
        # Check if partial take profit was hit
        if df.iloc[i]['high'] >= partial_tp:
            return 'PARTIAL_WIN'
    
    # No target was hit within the available data
    return 'FALSE'


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
    
    # Example of updating a signal result after analysis
    # update_result(signal['timestamp'], 'WINNER')
    
    # Example of reading the saved signals
    try:
        saved_signals = pd.read_csv("data/historical_signals.csv")
        print(f"Current saved signals ({len(saved_signals)} records):")
        print(saved_signals.tail(5))  # Show last 5 signals
    except Exception as e:
        print(f"Could not read signals file: {str(e)}")
