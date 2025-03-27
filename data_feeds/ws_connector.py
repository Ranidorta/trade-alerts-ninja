
"""
WebSocket connector for real-time price data.

This module provides a WebSocket connection to exchanges for
low-latency price updates and market data streaming.
"""

import websockets
import asyncio
import json
import time
import logging
from threading import Thread

class WSPriceFeed:
    def __init__(self, uri="wss://stream.bybit.com/v5/public/linear"):
        """
        Initialize the WebSocket price feed.
        
        Args:
            uri: WebSocket URI for the exchange
        """
        self.uri = uri
        self.prices = {}
        self.connected = False
        self.thread = Thread(target=self._run_loop)
        self.thread.daemon = True
        self.logger = logging.getLogger('ws_price_feed')
        
    async def _listen(self):
        """Establish WebSocket connection and listen for price updates."""
        try:
            async with websockets.connect(self.uri) as ws:
                self.connected = True
                self.logger.info(f"Connected to WebSocket: {self.uri}")
                
                # Subscribe to ticker feeds
                symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
                subscription = {
                    "op": "subscribe",
                    "args": [f"tickers.{symbol}" for symbol in symbols]
                }
                await ws.send(json.dumps(subscription))
                
                while True:
                    try:
                        data = json.loads(await ws.recv())
                        if 'topic' in data and 'tickers.' in data['topic']:
                            symbol = data['topic'].split('.')[1]
                            self.prices[symbol] = {
                                'price': float(data['data']['lastPrice']),
                                'bid': float(data['data']['bid1Price']),
                                'ask': float(data['data']['ask1Price']),
                                'timestamp': int(data['ts']) / 1000,  # Convert to seconds
                                'received_at': time.time()
                            }
                    except Exception as e:
                        self.logger.error(f"Error processing WebSocket message: {e}")
        except Exception as e:
            self.connected = False
            self.logger.error(f"WebSocket connection error: {e}")
            # Wait before reconnecting
            await asyncio.sleep(5)
            asyncio.create_task(self._listen())

    def _run_loop(self):
        """Run the WebSocket connection in a separate thread."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self._listen())

    def start(self):
        """Start the WebSocket connection in a background thread."""
        if not self.thread.is_alive():
            self.thread.start()
            return True
        return False

    def get_price(self, symbol):
        """
        Get the latest price data for a symbol.
        
        Args:
            symbol: Trading pair symbol (e.g., "BTCUSDT")
            
        Returns:
            Dictionary with price data or None if not available
        """
        return self.prices.get(symbol)
        
    def get_latency(self, symbol):
        """
        Get the current latency for a symbol.
        
        Returns:
            Latency in seconds or None if not available
        """
        price_data = self.get_price(symbol)
        if price_data:
            return time.time() - price_data['received_at']
        return None

