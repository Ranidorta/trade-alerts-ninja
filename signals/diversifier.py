
"""
Signal Diversifier module for Trade Alerts Ninja.

This module helps ensure signals diversity by filtering similar signals based on:
- Minimum time between signals of the same type for the same asset
- Unique fingerprint calculation for signal conditions
- Strategy correlation monitoring
"""

import hashlib
import logging
from datetime import datetime, timedelta
import pandas as pd
import os
import json

# Set up logging
logger = logging.getLogger("trade_alerts.diversifier")

class SignalDiversifier:
    """
    Handles signal diversification to prevent redundant alerts
    and ensure trading opportunities from different strategies.
    """
    
    def __init__(self, min_minutes_between=45, max_correlation=0.6):
        """
        Initialize the signal diversifier.
        
        Args:
            min_minutes_between: Minimum minutes between signals of same type for same asset
            max_correlation: Maximum allowed correlation between strategies
        """
        self.min_minutes_between = min_minutes_between
        self.max_correlation = max_correlation
        self.last_signals = {}  # {'BTCUSD': {'breakout': datetime, ...}}
        self.signal_hashes = set()
        self.signal_history = []
        
        # Create directory for storing diversity reports if it doesn't exist
        self.reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'reports')
        if not os.path.exists(self.reports_dir):
            os.makedirs(self.reports_dir)
        
        logger.info(f"Signal Diversifier initialized with min_minutes={min_minutes_between}, max_correlation={max_correlation}")

    def _generate_fingerprint(self, signal):
        """
        Creates a unique hash for each combination of signal conditions.
        
        Args:
            signal: Dictionary containing signal data
            
        Returns:
            str: MD5 hash representing the signal's unique fingerprint
        """
        # Extract only the relevant condition fields (excluding timestamp, confidence)
        conditions = frozenset([
            (k, v) for k, v in signal.items() 
            if k not in ['timestamp', 'createdAt', 'confidence', 'id', 'updatedAt']
        ])
        
        # Generate and return MD5 hash
        return hashlib.md5(str(conditions).encode()).hexdigest()

    def filter_similar(self, new_signals):
        """
        Filters signals that are too similar based on configured criteria.
        
        Args:
            new_signals: List of signal dictionaries to filter
            
        Returns:
            list: Filtered list of signals meeting diversity criteria
        """
        if not new_signals:
            return []
            
        filtered = []
        now = datetime.now()
        
        # Sort by confidence to prioritize high confidence signals
        for sig in sorted(new_signals, key=lambda x: -(x.get('confidence', 0) or 0)):
            asset = sig.get('symbol') or sig.get('pair')
            strategy = sig.get('strategy')
            
            # Skip if missing essential fields
            if not asset or not strategy:
                logger.warning(f"Signal missing required fields: {sig}")
                continue
                
            # Generate fingerprint for this signal
            fingerprint = self._generate_fingerprint(sig)
            
            # Normalize timestamp field
            if 'timestamp' not in sig and 'createdAt' in sig:
                sig['timestamp'] = sig['createdAt']
                
            if 'timestamp' not in sig:
                sig['timestamp'] = now
                
            signal_time = sig['timestamp'] if isinstance(sig['timestamp'], datetime) else now
                
            # Check if we've seen this fingerprint recently
            if fingerprint in self.signal_hashes:
                logger.info(f"Filtering duplicate signal fingerprint for {asset} ({strategy})")
                continue
                
            # Check time interval between signals of same type for same asset
            last_time = self.last_signals.get(asset, {}).get(strategy)
            if last_time and (signal_time - last_time).total_seconds() < (self.min_minutes_between * 60):
                logger.info(f"Filtering signal for {asset} ({strategy}): minimum interval not met")
                continue
                
            # Add to filtered signals and update tracking
            filtered.append(sig)
            self.signal_hashes.add(fingerprint)
            self.signal_history.append(sig)
            
            # Maintain history size
            if len(self.signal_history) > 1000:
                self.signal_history = self.signal_history[-1000:]
                
            # Prune old hashes periodically
            if len(self.signal_hashes) > 5000:
                self.signal_hashes = set()
                
            # Update timestamp record
            if asset not in self.last_signals:
                self.last_signals[asset] = {}
            self.last_signals[asset][strategy] = signal_time
            
        logger.info(f"Filtered signals: {len(filtered)}/{len(new_signals)} passed diversity check")
        return filtered
    
    def save_diversity_report(self, filename=None):
        """
        Generates and saves a diversity report to a file.
        
        Args:
            filename: Optional filename for the report
        """
        from analytics.diversity import DiversityAnalyzer
        
        if not self.signal_history:
            logger.warning("No signal history available for diversity report")
            return
            
        analyzer = DiversityAnalyzer()
        df = pd.DataFrame(self.signal_history)
        
        try:
            report = analyzer.generate_report(df)
            
            # Generate filename with date if not provided
            if not filename:
                date_str = datetime.now().strftime("%Y%m%d")
                filename = os.path.join(self.reports_dir, f"diversity_report_{date_str}.json")
                
            # Save report as JSON
            with open(filename, 'w') as f:
                json.dump(report, f, indent=2, default=str)
                
            logger.info(f"Diversity report saved to {filename}")
            
        except Exception as e:
            logger.error(f"Error generating diversity report: {str(e)}")
