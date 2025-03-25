
"""
Gerador de sinais aprimorado com suporte a WebSocket e time sync.
Implementa cálculo de entrada baseado em ATR e leverage dinâmica.
"""

from datetime import datetime
import pandas as pd
import logging
from data_feeds.ws_connector import WSPriceFeed

try:
    from utils.time_sync import TimeSync
    time_sync_available = True
except ImportError:
    time_sync_available = False
    
logger = logging.getLogger("signal_generator")

class SignalGenerator:
    def __init__(self, use_websocket=True):
        """
        Inicializa o gerador de sinais com opção de usar WebSocket.
        
        Args:
            use_websocket: Se True, tenta usar WebSocket para preços em tempo real
        """
        self.price_feed = None
        self.time_sync = None
        
        # Configurar time sync se disponível
        if time_sync_available:
            try:
                self.time_sync = TimeSync()
                logger.info("Time sync inicializado com sucesso")
            except Exception as e:
                logger.error(f"Erro ao inicializar time sync: {e}")
        
        # Configurar WebSocket se solicitado
        if use_websocket:
            try:
                self.price_feed = WSPriceFeed()
                self.price_feed.start()
                logger.info("WebSocket price feed inicializado")
            except Exception as e:
                logger.error(f"Erro ao inicializar WebSocket: {e}")
                self.price_feed = None
    
    def calculate_leverage(self, atr, symbol=None):
        """
        Calcula a alavancagem dinâmica com base no ATR e perfil do ativo.
        
        Args:
            atr: Average True Range
            symbol: Símbolo do ativo (opcional)
            
        Returns:
            int: Leverage recomendada (3-25)
        """
        # Regras básicas de leverage
        if atr > 15:  # Extremamente volátil
            base_leverage = 2
        elif atr > 10:
            base_leverage = 3
        elif atr > 5:
            base_leverage = 5
        elif atr > 2.5:
            base_leverage = 10
        else:
            base_leverage = 15
            
        # Ajuste por tipo de ativo (opcional)
        if symbol:
            if 'BTC' in symbol or 'ETH' in symbol:
                # Ativos mais consolidados permitem mais leverage
                base_leverage = min(base_leverage * 1.2, 20)
            elif 'ALT' in symbol or symbol.endswith('DOWN') or symbol.endswith('UP'):
                # Tokens mais arriscados, reduzir leverage
                base_leverage = max(base_leverage * 0.7, 2)
                
        return int(base_leverage)
    
    def get_real_time_price(self, symbol):
        """
        Obtém o preço em tempo real via WebSocket se disponível.
        
        Args:
            symbol: Símbolo do ativo
            
        Returns:
            dict: Dados do preço ou None se indisponível
        """
        if not self.price_feed:
            return None
            
        price_data = self.price_feed.get_price(symbol)
        
        # Verificar se os dados estão atualizados
        if price_data and self.time_sync:
            current_time = self.time_sync.get_synced_time()
            if current_time - price_data['timestamp'] > 2:  # 2 segundos de latência máxima
                logger.warning(f"Dados do {symbol} estão defasados: {current_time - price_data['timestamp']:.2f}s")
                return None
                
        return price_data
        
    def generate_signal(self, strategy, use_websocket=True):
        """
        Gera um sinal com preço atual e métricas de latência.
        
        Args:
            strategy: Dicionário com parâmetros da estratégia
            use_websocket: Se deve usar WebSocket (padrão: True)
            
        Returns:
            dict: Dados do sinal ou None se não for possível gerar
        """
        symbol = strategy.get('symbol')
        if not symbol:
            logger.error("Símbolo não especificado na estratégia")
            return None
            
        # Tentar obter preço em tempo real
        price_data = None
        if use_websocket and self.price_feed:
            price_data = self.get_real_time_price(symbol)
            
        # Se não tiver dados de WebSocket ou estão defasados, retorna None
        if not price_data:
            logger.info(f"Sem dados de WebSocket para {symbol}, usando preços alternativos")
            return None
            
        # Calcular latência
        latency = 0
        if price_data.get('timestamp') and self.time_sync:
            current_time = self.time_sync.get_synced_time()
            latency = current_time - price_data['timestamp']
            
        # Gerar o sinal
        signal = {
            'symbol': symbol,
            'price': price_data['price'],
            'timestamp': price_data['timestamp'],
            'latency': latency,
            'conditions': strategy.get('conditions', {}),
            'strategy': strategy.get('name', 'UNKNOWN'),
            'atr': strategy.get('atr', 0),
        }
        
        # Calcular leverage se ATR disponível
        if 'atr' in strategy and strategy['atr'] > 0:
            signal['leverage'] = self.calculate_leverage(strategy['atr'], symbol)
        else:
            signal['leverage'] = 5  # Valor default conservador
            
        logger.info(f"Sinal gerado: {symbol} @ {price_data['price']} (latência: {latency:.3f}s, leverage: {signal.get('leverage', 5)})")
        return signal
        
    def cleanup(self):
        """Libera recursos ao encerrar"""
        if self.price_feed:
            self.price_feed.stop()
            logger.info("WebSocket price feed encerrado")
