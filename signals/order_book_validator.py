
"""
Order Book Validator - Validação com profundidade do book de ordens
Análise de fluxo institucional através do book da Bybit
"""

import requests
import json
from typing import Dict, Optional
from utils.logger import logger

class OrderBookValidator:
    def __init__(self):
        self.base_url = "https://api.bybit.com/v5"
        self.cache = {}
    
    def get_order_book(self, symbol: str, limit: int = 25) -> Optional[Dict]:
        """
        Obtém book de ordens da Bybit
        
        Args:
            symbol: Par de trading (ex: 'BTCUSDT')
            limit: Número de níveis do book (5, 10, 25, 50)
        
        Returns:
            dict: Book de ordens com bids e asks
        """
        try:
            url = f"{self.base_url}/market/orderbook"
            params = {
                'category': 'linear',
                'symbol': symbol,
                'limit': limit
            }
            
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('retCode') != 0:
                logger.error(f"Erro na API Bybit: {data.get('retMsg')}")
                return None
            
            result = data.get('result', {})
            
            # Converte strings para float
            bids = [[float(price), float(size)] for price, size in result.get('b', [])]
            asks = [[float(price), float(size)] for price, size in result.get('a', [])]
            
            return {
                'bids': bids,
                'asks': asks,
                'timestamp': result.get('ts', 0)
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter book de ordens para {symbol}: {e}")
            return None
    
    def check_order_book(self, book: Dict, direction: str) -> bool:
        """
        Valida se o book de ordens suporta a direção pretendida
        
        Args:
            book: Book de ordens obtido
            direction: Direção do trade ('LONG' ou 'SHORT')
        
        Returns:
            bool: True se book suporta a direção
        """
        try:
            if not book or not book.get('bids') or not book.get('asks'):
                return False
            
            # Calcula volume nos top 5 níveis
            top_bids = sum(size for price, size in book['bids'][:5])
            top_asks = sum(size for price, size in book['asks'][:5])
            
            if top_bids == 0 or top_asks == 0:
                return False
            
            bid_ask_ratio = top_bids / top_asks
            
            # Para LONG: precisa de mais liquidez no bid (compra)
            if direction == 'LONG' and bid_ask_ratio > 1.5:
                logger.info(f"✅ Book favorável para LONG: Bids={top_bids:.0f}, Asks={top_asks:.0f}, Ratio={bid_ask_ratio:.2f}")
                return True
            
            # Para SHORT: precisa de mais liquidez no ask (venda)
            elif direction == 'SHORT' and bid_ask_ratio < 0.67:  # 1/1.5
                logger.info(f"✅ Book favorável para SHORT: Bids={top_bids:.0f}, Asks={top_asks:.0f}, Ratio={bid_ask_ratio:.2f}")
                return True
            
            else:
                logger.info(f"❌ Book desfavorável: Bids={top_bids:.0f}, Asks={top_asks:.0f}, Ratio={bid_ask_ratio:.2f}")
                return False
                
        except Exception as e:
            logger.error(f"Erro na validação do book: {e}")
            return False
    
    def get_spread_analysis(self, book: Dict) -> Dict:
        """
        Analisa o spread e qualidade do book
        
        Returns:
            dict: Análise do spread e liquidez
        """
        try:
            if not book or not book.get('bids') or not book.get('asks'):
                return {}
            
            best_bid = book['bids'][0][0] if book['bids'] else 0
            best_ask = book['asks'][0][0] if book['asks'] else 0
            
            if best_bid == 0 or best_ask == 0:
                return {}
            
            spread = best_ask - best_bid
            spread_pct = (spread / best_bid) * 100
            
            # Calcula liquidez total nos primeiros 10 níveis
            total_bid_liquidity = sum(size for price, size in book['bids'][:10])
            total_ask_liquidity = sum(size for price, size in book['asks'][:10])
            
            return {
                'spread_absolute': spread,
                'spread_percentage': spread_pct,
                'best_bid': best_bid,
                'best_ask': best_ask,
                'bid_liquidity': total_bid_liquidity,
                'ask_liquidity': total_ask_liquidity,
                'liquidity_imbalance': total_bid_liquidity / total_ask_liquidity if total_ask_liquidity > 0 else 0,
                'is_tight_spread': spread_pct < 0.05  # Spread menor que 0.05%
            }
            
        except Exception as e:
            logger.error(f"Erro na análise do spread: {e}")
            return {}

def validate_order_book_support(symbol: str, direction: str) -> bool:
    """
    Função wrapper para validar suporte do book de ordens
    
    Args:
        symbol: Par de trading
        direction: Direção pretendida ('LONG' ou 'SHORT')
    
    Returns:
        bool: True se book suporta a direção
    """
    validator = OrderBookValidator()
    book = validator.get_order_book(symbol)
    
    if not book:
        logger.warning(f"Não foi possível obter book para {symbol}")
        return False
    
    return validator.check_order_book(book, direction)

def get_market_depth_score(symbol: str) -> float:
    """
    Calcula score de profundidade do mercado (0.0 a 1.0)
    
    Returns:
        float: Score de qualidade do mercado
    """
    validator = OrderBookValidator()
    book = validator.get_order_book(symbol)
    
    if not book:
        return 0.0
    
    spread_analysis = validator.get_spread_analysis(book)
    
    if not spread_analysis:
        return 0.0
    
    score = 0.0
    
    # Pontuação baseada no spread
    if spread_analysis['is_tight_spread']:
        score += 0.4
    elif spread_analysis['spread_percentage'] < 0.1:
        score += 0.2
    
    # Pontuação baseada na liquidez
    total_liquidity = spread_analysis['bid_liquidity'] + spread_analysis['ask_liquidity']
    if total_liquidity > 1000000:  # > 1M em volume
        score += 0.4
    elif total_liquidity > 500000:  # > 500K
        score += 0.2
    
    # Pontuação baseada no equilíbrio
    imbalance = spread_analysis['liquidity_imbalance']
    if 0.8 <= imbalance <= 1.2:  # Equilibrado
        score += 0.2
    
    return min(score, 1.0)
