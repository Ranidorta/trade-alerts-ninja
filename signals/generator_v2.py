
"""
Enhanced signal generator with real-time price synchronization.

This module provides an updated signal generator that uses WebSocket connections
for low-latency price updates and time synchronization.
"""

import logging
import time
from data_feeds.ws_connector import WSPriceFeed
from utils.time_sync import TimeSync

class SignalGenerator:
    def __init__(self, fallback_to_rest=True):
        """
        Initialize the signal generator with WebSocket connection.
        
        Args:
            fallback_to_rest: Whether to fallback to REST API if WebSocket fails
        """
        self.price_feed = WSPriceFeed()
        self.time_sync = TimeSync()
        self.logger = logging.getLogger('signal_generator')
        self.fallback_to_rest = fallback_to_rest
        
        # Start WebSocket connection
        self.price_feed.start()
        self.logger.info("Enhanced signal generator initialized with WebSocket connection")
        
    def generate_signal(self, strategy):
        """
        Generate a trading signal with synchronized price data.
        
        Args:
            strategy: Strategy configuration with symbol and conditions
            
        Returns:
            Signal dictionary with precise price and timestamp
            
        Raises:
            ValueError: If price data is outdated or unavailable
        """
        symbol = strategy['symbol']
        price_data = self.price_feed.get_price(symbol)
        
        # Check if we have recent WebSocket data
        if price_data and (self.time_sync.get_synced_time() - price_data['timestamp'] < 1):
            # Data is fresh, use it
            latency = self.time_sync.get_synced_time() - price_data['timestamp']
            
            # Log latency metrics
            if latency > 0.5:  # More than 500ms
                self.logger.warning(f"High latency detected: {latency*1000:.2f}ms for {symbol}")
            
            return {
                'symbol': symbol,
                'price': price_data['price'],
                'bid': price_data.get('bid'),
                'ask': price_data.get('ask'),
                'timestamp': price_data['timestamp'],
                'server_time': self.time_sync.get_synced_time(),
                'latency_ms': latency * 1000,  # Convert to milliseconds
                'conditions': strategy['conditions'],
                'strategy': strategy.get('strategy_name', 'unknown')
            }
        
        # WebSocket data is outdated or missing
        if self.fallback_to_rest:
            self.logger.warning(f"Falling back to REST API for {symbol}")
            
            # Fallback to REST API
            from api.bybit import get_ticker
            ticker = get_ticker(symbol)
            
            if not ticker:
                raise ValueError(f"No price data available for {symbol}")
                
            return {
                'symbol': symbol,
                'price': ticker['price'],
                'timestamp': ticker['timestamp'],
                'server_time': self.time_sync.get_synced_time(),
                'latency_ms': None,  # Can't calculate precise latency for REST
                'conditions': strategy['conditions'],
                'strategy': strategy.get('strategy_name', 'unknown'),
                'source': 'rest_fallback'
            }
        
        raise ValueError(f"No recent price data available for {symbol}")
        
    def is_websocket_connected(self):
        """Check if WebSocket is currently connected."""
        return self.price_feed.connected

