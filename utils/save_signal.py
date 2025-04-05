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
import plotly.express as px
import matplotlib.pyplot as plt


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


def generate_metrics_report():
    """
    Generates a metrics report with visualizations from historical signals data.
    
    This function reads the historical signals CSV file, calculates performance
    metrics like win rate, and creates visualizations including a pie chart of
    results distribution and a cumulative return chart.
    
    Returns:
        tuple: (win_rate, total_signals) or None if file doesn't exist
    """
    # Check if file exists
    file_path = Path("data/historical_signals.csv")
    if not file_path.exists():
        print(f"Error: Historical signals file not found at {file_path}")
        return None
    
    try:
        # Read the CSV file
        df = pd.read_csv(file_path)
        
        # Filter out rows with null results
        df_complete = df[df['result'].notna()]
        
        if len(df_complete) == 0:
            print("No completed signals found with results.")
            return None
        
        # Calculate result distribution
        result_counts = df_complete['result'].value_counts()
        
        # Generate pie chart with Plotly
        fig_pie = px.pie(
            values=result_counts.values,
            names=result_counts.index,
            title="Signal Results Distribution",
            color_discrete_map={
                'WINNER': '#2ecc71',      # Green
                'PARTIAL_WIN': '#f39c12', # Orange
                'LOSER': '#e74c3c',       # Red
                'FALSE': '#95a5a6'        # Gray
            }
        )
        fig_pie.update_traces(textposition='inside', textinfo='percent+label')
        fig_pie.show()
        
        # Calculate win rate
        winning_trades = len(df_complete[df_complete['result'].isin(['WINNER', 'PARTIAL_WIN'])])
        total_trades = len(df_complete)
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        print(f"\n📊 Performance Summary:")
        print(f"  - Total Signals: {total_trades}")
        print(f"  - Winning Trades: {winning_trades}")
        print(f"  - Win Rate: {win_rate:.2%}")
        
        # Calculate cumulative returns
        df_complete['return'] = 0.0  # Initialize return column
        
        # Calculate returns based on result type
        for idx, row in df_complete.iterrows():
            result = row['result']
            entry_price = row['entry_price']
            
            if pd.isna(entry_price) or entry_price == 0:
                continue
                
            if result == 'WINNER' and not pd.isna(row.get('tp')):
                # Full target hit
                df_complete.at[idx, 'return'] = (row['tp'] - entry_price) / entry_price * 100
            elif result == 'PARTIAL_WIN' and not pd.isna(row.get('tp')):
                # Partial target (50% of full target)
                half_target = entry_price + (row['tp'] - entry_price) * 0.5
                df_complete.at[idx, 'return'] = (half_target - entry_price) / entry_price * 100
            elif result == 'LOSER' and not pd.isna(row.get('sl')):
                # Stop loss hit
                df_complete.at[idx, 'return'] = (row['sl'] - entry_price) / entry_price * 100
        
        # Sort by timestamp for proper sequencing
        df_complete['timestamp'] = pd.to_datetime(df_complete['timestamp'])
        df_complete = df_complete.sort_values('timestamp')
        
        # Calculate cumulative returns
        df_complete['cumulative_return'] = df_complete['return'].cumsum()
        
        # Plot cumulative return chart with matplotlib
        plt.figure(figsize=(10, 6))
        plt.plot(range(len(df_complete)), df_complete['cumulative_return'], marker='o')
        plt.title('Cumulative Return from Trading Signals')
        plt.xlabel('Trade Number')
        plt.ylabel('Cumulative Return (%)')
        plt.grid(True, linestyle='--', alpha=0.7)
        
        # Add horizontal line at y=0
        plt.axhline(y=0, color='r', linestyle='-', alpha=0.3)
        
        # Show the plot
        plt.tight_layout()
        plt.show()
        
        # Print additional metrics
        if len(df_complete) > 0:
            avg_win = df_complete[df_complete['return'] > 0]['return'].mean()
            avg_loss = df_complete[df_complete['return'] < 0]['return'].mean()
            profit_factor = abs(df_complete[df_complete['return'] > 0]['return'].sum() / 
                             df_complete[df_complete['return'] < 0]['return'].sum()) if df_complete[df_complete['return'] < 0]['return'].sum() != 0 else float('inf')
            
            print(f"\n📈 Additional Metrics:")
            print(f"  - Average Win: {avg_win:.2f}%")
            print(f"  - Average Loss: {avg_loss:.2f}%")
            print(f"  - Profit Factor: {profit_factor:.2f}")
            print(f"  - Total Return: {df_complete['cumulative_return'].iloc[-1]:.2f}%")
        
        return win_rate, total_trades
    
    except Exception as e:
        print(f"Error generating metrics report: {str(e)}")
        return None


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
    
    # Generate metrics report
    # generate_metrics_report()
