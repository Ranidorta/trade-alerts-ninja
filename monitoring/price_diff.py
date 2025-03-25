
"""
Price discrepancy monitoring system.

This module provides tools to monitor the difference between
signal prices and execution prices, with reporting capabilities.
"""

import pandas as pd
import numpy as np
import logging
import time
import os
import json
from datetime import datetime, timedelta

class PriceMonitor:
    def __init__(self, history_file="price_monitor_history.csv"):
        """
        Initialize the price monitor.
        
        Args:
            history_file: File to save price history
        """
        self.logger = logging.getLogger('price_monitor')
        self.history_file = history_file
        
        # Load existing history if available
        if os.path.exists(history_file):
            try:
                self.history = pd.read_csv(history_file)
            except Exception as e:
                self.logger.error(f"Failed to load history file: {e}")
                self.history = pd.DataFrame(columns=['symbol', 'signal_time', 'exec_time', 
                                                    'signal_price', 'exec_price', 'delta',
                                                    'latency_ms', 'within_spread'])
        else:
            self.history = pd.DataFrame(columns=['symbol', 'signal_time', 'exec_time', 
                                                'signal_price', 'exec_price', 'delta',
                                                'latency_ms', 'within_spread'])

    def record_execution(self, signal, executed_price, execution_time=None):
        """
        Record a signal execution and its price discrepancy.
        
        Args:
            signal: Original signal dictionary
            executed_price: Actual execution price
            execution_time: Time of execution (default: current time)
        """
        if execution_time is None:
            execution_time = time.time()
            
        delta = executed_price - signal['price']
        within_spread = False
        
        # Check if price is within the spread (if bid/ask available)
        if 'bid' in signal and 'ask' in signal:
            within_spread = signal['bid'] <= executed_price <= signal['ask']
            
        # Record the execution
        new_record = {
            'symbol': signal['symbol'],
            'signal_time': signal['timestamp'],
            'exec_time': execution_time,
            'signal_price': signal['price'],
            'exec_price': executed_price,
            'delta': delta,
            'latency_ms': signal.get('latency_ms'),
            'within_spread': within_spread
        }
        
        # Append to history
        self.history = pd.concat([self.history, pd.DataFrame([new_record])], ignore_index=True)
        
        # Log warning if discrepancy is high
        if abs(delta) > 5:  # USD threshold
            self.logger.warning(f"High price discrepancy: {delta:.2f} USD for {signal['symbol']}")
            
        # Save history periodically (every 10 records)
        if len(self.history) % 10 == 0:
            self._save_history()
            
    def _save_history(self):
        """Save history to CSV file."""
        try:
            self.history.to_csv(self.history_file, index=False)
        except Exception as e:
            self.logger.error(f"Failed to save history: {e}")

    def generate_report(self, days=1):
        """
        Generate a report on price discrepancies.
        
        Args:
            days: Number of days to include in the report
            
        Returns:
            Dictionary with report metrics
        """
        if self.history.empty:
            return {"status": "No data available for reporting"}
            
        # Filter for recent data
        cutoff_time = time.time() - (days * 86400)
        recent = self.history[self.history['exec_time'] > cutoff_time]
        
        if recent.empty:
            return {"status": f"No data available for the last {days} days"}
            
        # Calculate metrics
        report = {
            'period': f"{days} days",
            'total_executions': len(recent),
            'symbols_count': recent['symbol'].nunique(),
            'symbols': recent['symbol'].unique().tolist(),
            'mean_delta': recent['delta'].mean(),
            'median_delta': recent['delta'].median(),
            'max_delta': recent['delta'].max(),
            'min_delta': recent['delta'].min(),
            'delta_std': recent['delta'].std(),
            'within_spread_pct': recent['within_spread'].mean() * 100 if 'within_spread' in recent.columns else None,
            'avg_latency_ms': recent['latency_ms'].mean() if 'latency_ms' in recent.columns else None,
            'max_latency_ms': recent['latency_ms'].max() if 'latency_ms' in recent.columns else None,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add per-symbol breakdown
        symbol_stats = []
        for symbol in recent['symbol'].unique():
            symbol_data = recent[recent['symbol'] == symbol]
            symbol_stats.append({
                'symbol': symbol,
                'count': len(symbol_data),
                'mean_delta': symbol_data['delta'].mean(),
                'max_delta': symbol_data['delta'].max(),
                'within_spread_pct': symbol_data['within_spread'].mean() * 100 if 'within_spread' in symbol_data.columns else None
            })
        
        report['symbol_stats'] = symbol_stats
        return report
        
    def save_report(self, report=None, filename=None):
        """
        Save a report to a JSON file.
        
        Args:
            report: Report dictionary (generated if None)
            filename: Output filename (default: auto-generated)
        """
        if report is None:
            report = self.generate_report()
            
        if filename is None:
            date_str = datetime.now().strftime("%Y%m%d")
            filename = f"price_accuracy_report_{date_str}.json"
            
        try:
            # Create reports directory if it doesn't exist
            os.makedirs("reports", exist_ok=True)
            report_path = os.path.join("reports", filename)
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
                
            self.logger.info(f"Price accuracy report saved to {report_path}")
            return report_path
            
        except Exception as e:
            self.logger.error(f"Failed to save report: {e}")
            return None

