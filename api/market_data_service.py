
"""
Market Data Service - Real-time price fetching from Bybit
"""

import requests
import json
from typing import Dict, List, Optional
from datetime import datetime

class MarketDataService:
    """Service for fetching real-time market data from Bybit"""
    
    def __init__(self):
        self.base_url = "https://api.bybit.com/v5"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
    
    def get_current_prices(self, symbols: List[str]) -> Dict[str, float]:
        """
        Get current prices for multiple symbols
        
        Args:
            symbols: List of trading pairs (e.g., ['BTCUSDT', 'ETHUSDT'])
            
        Returns:
            Dictionary mapping symbol to current price
        """
        try:
            url = f"{self.base_url}/market/tickers"
            params = {'category': 'linear'}
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('retCode') != 0:
                print(f"Bybit API error: {data.get('retMsg')}")
                return {}
            
            prices = {}
            tickers = data.get('result', {}).get('list', [])
            
            for ticker in tickers:
                symbol = ticker.get('symbol')
                if symbol in symbols:
                    try:
                        price = float(ticker.get('lastPrice', 0))
                        prices[symbol] = price
                    except (ValueError, TypeError):
                        continue
            
            print(f"Fetched prices for {len(prices)} symbols")
            return prices
            
        except Exception as e:
            print(f"Error fetching current prices: {str(e)}")
            return {}
    
    def get_single_price(self, symbol: str) -> Optional[float]:
        """
        Get current price for a single symbol
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            
        Returns:
            Current price or None if error
        """
        try:
            url = f"{self.base_url}/market/tickers"
            params = {
                'category': 'linear',
                'symbol': symbol
            }
            
            response = self.session.get(url, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('retCode') != 0:
                return None
            
            tickers = data.get('result', {}).get('list', [])
            
            if tickers:
                return float(tickers[0].get('lastPrice', 0))
            
            return None
            
        except Exception as e:
            print(f"Error fetching price for {symbol}: {str(e)}")
            return None
    
    def get_market_summary(self, symbols: List[str]) -> Dict:
        """
        Get market summary with prices, volume, and 24h changes
        
        Args:
            symbols: List of trading pairs
            
        Returns:
            Market summary data
        """
        try:
            url = f"{self.base_url}/market/tickers"
            params = {'category': 'linear'}
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('retCode') != 0:
                return {}
            
            summary = {
                'timestamp': datetime.utcnow().isoformat(),
                'symbols': {}
            }
            
            tickers = data.get('result', {}).get('list', [])
            
            for ticker in tickers:
                symbol = ticker.get('symbol')
                if symbol in symbols:
                    try:
                        summary['symbols'][symbol] = {
                            'price': float(ticker.get('lastPrice', 0)),
                            'volume24h': float(ticker.get('volume24h', 0)),
                            'price_change_24h': float(ticker.get('price24hPcnt', 0)) * 100,
                            'high24h': float(ticker.get('highPrice24h', 0)),
                            'low24h': float(ticker.get('lowPrice24h', 0)),
                            'bid': float(ticker.get('bid1Price', 0)),
                            'ask': float(ticker.get('ask1Price', 0))
                        }
                    except (ValueError, TypeError):
                        continue
            
            return summary
            
        except Exception as e:
            print(f"Error fetching market summary: {str(e)}")
            return {}

# Global instance
market_data_service = MarketDataService()
