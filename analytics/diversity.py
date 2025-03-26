
"""
Diversity Analyzer module for Trade Alerts Ninja.

This module analyzes signal diversity and generates reports on:
- Strategy overlap
- Signal timing
- Asset distribution
- Confidence metrics
"""

import pandas as pd
import numpy as np
from scipy.stats import pearsonr
import logging
import os
import json
from datetime import datetime, timedelta

# Set up logging
logger = logging.getLogger("trade_alerts.analytics.diversity")

class DiversityAnalyzer:
    """
    Analyzes signal diversity metrics and generates reports on
    strategy overlap, timing patterns, and confidence distribution.
    """
    
    def __init__(self):
        """Initialize the diversity analyzer."""
        self.reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'reports')
        if not os.path.exists(self.reports_dir):
            os.makedirs(self.reports_dir)
        
        logger.info("Diversity Analyzer initialized")
    
    def calculate_overlap(self, signals_df):
        """
        Calculates matrix of overlap between different strategies.
        
        Args:
            signals_df: DataFrame containing signals data
            
        Returns:
            DataFrame: Matrix of overlap percentages between strategies
        """
        if signals_df.empty or 'strategy' not in signals_df.columns:
            logger.warning("Cannot calculate overlap: empty DataFrame or missing 'strategy' column")
            return pd.DataFrame()
            
        strategies = signals_df['strategy'].unique()
        overlap_matrix = pd.DataFrame(index=strategies, columns=strategies)
        
        for strat1 in strategies:
            for strat2 in strategies:
                try:
                    # Skip self-comparison
                    if strat1 == strat2:
                        overlap_matrix.loc[strat1, strat2] = 1.0
                        continue
                        
                    s1 = signals_df[signals_df['strategy'] == strat1]
                    s2 = signals_df[signals_df['strategy'] == strat2]
                    
                    # Ensure timestamp is datetime
                    if not pd.api.types.is_datetime64_any_dtype(s1['timestamp']):
                        s1['timestamp'] = pd.to_datetime(s1['timestamp'])
                    if not pd.api.types.is_datetime64_any_dtype(s2['timestamp']):
                        s2['timestamp'] = pd.to_datetime(s2['timestamp'])
                    
                    # Calculate overlapping signals within 5-minute window
                    merged = pd.merge_asof(
                        s1.sort_values('timestamp'),
                        s2.sort_values('timestamp'),
                        on='timestamp',
                        suffixes=('_1', '_2'),
                        direction='nearest',
                        tolerance=pd.Timedelta('5min')
                    )
                    
                    # Calculate overlap ratio
                    overlap_ratio = len(merged) / max(len(s1), len(s2)) if max(len(s1), len(s2)) > 0 else 0
                    overlap_matrix.loc[strat1, strat2] = round(overlap_ratio, 2)
                    
                except Exception as e:
                    logger.error(f"Error calculating overlap for {strat1} vs {strat2}: {str(e)}")
                    overlap_matrix.loc[strat1, strat2] = np.nan
                
        return overlap_matrix
    
    def calculate_confidence_metrics(self, signals_df):
        """
        Calculates confidence metrics per strategy.
        
        Args:
            signals_df: DataFrame containing signals data
            
        Returns:
            dict: Confidence metrics by strategy
        """
        if signals_df.empty or 'strategy' not in signals_df.columns:
            return {}
            
        confidence_metrics = {}
        
        for strategy in signals_df['strategy'].unique():
            strategy_signals = signals_df[signals_df['strategy'] == strategy]
            
            if 'confidence' in strategy_signals.columns:
                confidence_values = strategy_signals['confidence'].dropna()
                
                if len(confidence_values) > 0:
                    confidence_metrics[strategy] = {
                        'mean': round(confidence_values.mean(), 2),
                        'median': round(confidence_values.median(), 2),
                        'min': round(confidence_values.min(), 2),
                        'max': round(confidence_values.max(), 2),
                        'count': len(confidence_values)
                    }
                    
        return confidence_metrics

    def calculate_time_between_signals(self, signals_df):
        """
        Calculates average time between signals for each strategy.
        
        Args:
            signals_df: DataFrame containing signals data
            
        Returns:
            dict: Average time between signals by strategy
        """
        if signals_df.empty or 'strategy' not in signals_df.columns:
            return {}
            
        time_between = {}
        
        for strategy in signals_df['strategy'].unique():
            strategy_signals = signals_df[signals_df['strategy'] == strategy]
            
            # Ensure timestamp is datetime
            if not pd.api.types.is_datetime64_any_dtype(strategy_signals['timestamp']):
                strategy_signals['timestamp'] = pd.to_datetime(strategy_signals['timestamp'])
                
            if len(strategy_signals) > 1:
                # Sort by timestamp and calculate differences
                sorted_signals = strategy_signals.sort_values('timestamp')
                diffs = sorted_signals['timestamp'].diff().dropna()
                
                if len(diffs) > 0:
                    # Calculate mean time difference in minutes
                    mean_diff_minutes = diffs.mean().total_seconds() / 60
                    time_between[strategy] = round(mean_diff_minutes, 1)
                    
        return time_between
        
    def generate_report(self, signals_df):
        """
        Generates a complete diversity report.
        
        Args:
            signals_df: DataFrame containing signals data
            
        Returns:
            dict: Complete diversity report
        """
        if signals_df.empty:
            logger.warning("Cannot generate report: empty signals DataFrame")
            return {'error': 'No signals data available'}
            
        # Ensure we have strategy column
        if 'strategy' not in signals_df.columns:
            logger.warning("Cannot generate report: missing 'strategy' column")
            return {'error': 'Missing strategy information'}
            
        # Ensure timestamp column exists
        symbol_col = 'symbol' if 'symbol' in signals_df.columns else 'pair'
        if symbol_col not in signals_df.columns:
            logger.warning(f"Cannot generate report: missing '{symbol_col}' column")
            return {'error': 'Missing symbol information'}
            
        try:
            # Generate the report
            report = {
                "report_date": datetime.now().isoformat(),
                "total_signals": len(signals_df),
                "strategies": signals_df['strategy'].nunique(),
                "unique_assets": signals_df[symbol_col].nunique(),
                "date_range": {
                    "start": signals_df['timestamp'].min().isoformat() if 'timestamp' in signals_df.columns else None,
                    "end": signals_df['timestamp'].max().isoformat() if 'timestamp' in signals_df.columns else None
                },
                "overlap_matrix": self.calculate_overlap(signals_df).to_dict(),
                "confidence_metrics": self.calculate_confidence_metrics(signals_df),
                "time_between_signals": self.calculate_time_between_signals(signals_df),
                "asset_distribution": signals_df[symbol_col].value_counts().to_dict()
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating diversity report: {str(e)}")
            return {'error': str(e)}
    
    def generate_report_to_file(self, signals_df, filename=None):
        """
        Generates a diversity report and saves it to a file.
        
        Args:
            signals_df: DataFrame containing signals data
            filename: Optional filename for the report
            
        Returns:
            str: Path to the saved report file
        """
        report = self.generate_report(signals_df)
        
        # Generate filename with date if not provided
        if not filename:
            date_str = datetime.now().strftime("%Y%m%d")
            filename = os.path.join(self.reports_dir, f"diversity_report_{date_str}.json")
            
        # Save report as JSON
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
            
        logger.info(f"Diversity report saved to {filename}")
        return filename
