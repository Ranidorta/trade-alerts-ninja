
"""
Time synchronization utilities.

This module provides functions to synchronize local time with exchange servers
to ensure accurate timestamp comparisons and reduced latency.
"""

import time
import requests
import logging
from datetime import datetime
import statistics

class TimeSync:
    def __init__(self, sync_interval=60, samples=3):
        """
        Initialize time synchronization.
        
        Args:
            sync_interval: Seconds between time synchronizations
            samples: Number of samples to collect for offset calculation
        """
        self._offset = 0
        self._last_sync = 0
        self._sync_interval = sync_interval
        self._samples = samples
        self.logger = logging.getLogger('time_sync')
        
        # Perform initial synchronization
        self._sync_time()
        
    def _calculate_offset(self):
        """
        Calculate time offset between local time and server time.
        Uses multiple samples for improved accuracy.
        
        Returns:
            Time offset in seconds
        """
        offsets = []
        
        for _ in range(self._samples):
            try:
                # Measure round-trip time
                start = time.time()
                response = requests.get('https://api.bybit.com/v2/public/time', timeout=2)
                end = time.time()
                
                if response.status_code != 200:
                    self.logger.warning(f"Server time API returned status {response.status_code}")
                    continue
                    
                server_time = float(response.json()['time_now'])
                
                # Estimate one-way latency as half of round-trip time
                latency = (end - start) / 2
                
                # Calculate offset considering latency compensation
                local_time = start + latency
                offset = server_time - local_time
                offsets.append(offset)
                
                # Brief pause between samples
                time.sleep(0.2)
                
            except Exception as e:
                self.logger.error(f"Error calculating time offset: {e}")
        
        # Calculate median offset to filter out outliers
        if offsets:
            median_offset = statistics.median(offsets)
            self.logger.info(f"Time offset calculated: {median_offset:.6f}s")
            return median_offset
        else:
            self.logger.warning("Failed to calculate time offset, using zero")
            return 0
        
    def _sync_time(self):
        """Synchronize time with the exchange server."""
        self._offset = self._calculate_offset()
        self._last_sync = time.time()
        formatted_time = datetime.fromtimestamp(time.time() + self._offset).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        self.logger.info(f"Time synchronized. Server time: {formatted_time}")
        
    def get_synced_time(self):
        """
        Get the current time synchronized with the exchange server.
        Re-syncs automatically based on sync_interval.
        
        Returns:
            Current server time in seconds since epoch
        """
        # Check if we need to re-sync
        if time.time() - self._last_sync > self._sync_interval:
            self._sync_time()
            
        return time.time() + self._offset
        
    def get_offset(self):
        """Get the current time offset in seconds."""
        return self._offset

