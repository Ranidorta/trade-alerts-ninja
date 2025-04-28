
"""
Serviço de validação automática de sinais de trading.
Este módulo monitora os sinais abertos e atualiza seus resultados
baseado nos preços atuais do mercado.
"""

import time
from datetime import datetime, timedelta
import logging
import threading
import pandas as pd

# Importações da estrutura existente
from api.fetch_data import fetch_data  # Usamos a função existente de fetch_data.py

# Configurações
VALIDATION_INTERVAL = 60  # segundos entre cada validação
TIMEOUT_MINUTES = 15      # tempo limite para validar sinal
logger = logging.getLogger("SignalValidation")

def fetch_current_price(symbol):
    """
    Busca o preço atual de um ativo usando a infraestrutura existente.
    
    Args:
        symbol (str): Símbolo do par de trading (ex: "BTCUSDT")
        
    Returns:
        float: Preço atual do ativo
    """
    try:
        # Usando a função existente fetch_data do módulo api
        df = fetch_data(symbol, timeframe='1m')
        if df is not None and not df.empty:
            # Pega o último preço de fechamento
            return float(df['close'].iloc[-1])
        logger.warning(f"Não foi possível obter preço atual para {symbol}")
        return None
    except Exception as e:
        logger.error(f"Erro ao buscar preço para {symbol}: {e}")
        return None

def validate_signal(signal):
    """
    Valida um sinal com base no preço atual e nas condições de TP e SL.
    
    Args:
        signal (dict): Dicionário contendo os dados do sinal
        
    Returns:
        str or None: Resultado da validação ("win", "loss", "partial", None)
    """
    current_price = fetch_current_price(signal['symbol'])
    if current_price is None:
        return None
    
    # Para compatibilidade com diferentes formatos de dados
    direction = signal.get('direction', '')
    if not direction:
        direction = "BUY" if signal.get('type') == "LONG" else "SELL"
    
    # Obter níveis de take profit
    tp1 = signal.get('tp1') or signal.get('takeProfit', [None])[0]
    tp2 = signal.get('tp2') or (signal.get('takeProfit', [None, None])[1] if len(signal.get('takeProfit', [])) > 1 else None)
    tp3 = signal.get('tp3') or (signal.get('takeProfit', [None, None, None])[2] if len(signal.get('takeProfit', [])) > 2 else None)
    
    # Nível de stop loss
    sl = signal.get('sl') or signal.get('stopLoss')
    
    if not all([tp1, sl]):
        logger.warning(f"Sinal {signal.get('id')} sem níveis de TP ou SL completos")
        return None
    
    # Valores padrão se não houver TP2 ou TP3
    tp2 = tp2 or tp1 * 1.05 if direction == "BUY" else tp1 * 0.95
    tp3 = tp3 or tp1 * 1.1 if direction == "BUY" else tp1 * 0.9
    
    if direction == 'BUY':
        if current_price >= float(tp3):
            return "win"  # Alterado de "WINNER" para "win"
        elif current_price >= float(tp2) or current_price >= float(tp1):
            return "partial"  # Alterado de "PARTIAL" para "partial"
        elif current_price <= float(sl):
            return "loss"  # Alterado de "LOSER" para "loss"

    elif direction == 'SELL':
        if current_price <= float(tp3):
            return "win"
        elif current_price <= float(tp2) or current_price <= float(tp1):
            return "partial"
        elif current_price >= float(sl):
            return "loss"

    return None  # Ainda não bateu nenhuma condição

def get_open_signals():
    """
    Busca sinais abertos do banco de dados.
    Adaptado para usar o sistema existente de armazenamento.
    """
    try:
        from src.lib.signalVerification import verifyAllSignals
        from src.lib.signal_storage import getSignalHistory
        
        # Usar o sistema existente para obter sinais não verificados
        signals = getSignalHistory()
        if not signals:
            return []
            
        # Filtrar apenas sinais ativos sem resultado
        active_signals = [s for s in signals if s.get('status') == 'ACTIVE' and not s.get('result')]
        return active_signals
    except Exception as e:
        logger.error(f"Erro ao buscar sinais abertos: {e}")
        return []

def update_signal_result(signal_id, result):
    """
    Atualiza o resultado de um sinal no banco de dados.
    Adaptado para usar o sistema existente.
    """
    try:
        from src.lib.signalVerification import verifySingleSignal
        from src.lib.signal_storage import getSignalHistory, saveSignalsToHistory
        
        signals = getSignalHistory()
        if not signals:
            logger.error(f"Não foi possível encontrar sinais para atualizar {signal_id}")
            return False
            
        # Atualiza o sinal específico
        updated = False
        for i, signal in enumerate(signals):
            if signal.get('id') == signal_id:
                signals[i]['result'] = result
                signals[i]['verifiedAt'] = datetime.now().isoformat()
                if result != 'missed':  # Se for um resultado conclusivo
                    signals[i]['status'] = 'COMPLETED'
                    signals[i]['completedAt'] = datetime.now().isoformat()
                updated = True
                break
        
        if updated:
            saveSignalsToHistory(signals)
            logger.info(f"Sinal {signal_id} atualizado com resultado: {result}")
            return True
        
        logger.warning(f"Sinal {signal_id} não encontrado para atualização")
        return False
    except Exception as e:
        logger.error(f"Erro ao atualizar resultado do sinal {signal_id}: {e}")
        return False

class SignalMonitor:
    """
    Classe para monitorar sinais em uma thread separada.
    """
    def __init__(self):
        self.running = False
        self.thread = None
    
    def start(self):
        """Inicia o monitoramento em uma thread separada"""
        if self.running:
            logger.warning("Monitor de sinais já está rodando")
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._monitor_signals_loop)
        self.thread.daemon = True
        self.thread.start()
        logger.info("Monitor de sinais iniciado")
    
    def stop(self):
        """Para o monitoramento"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
        logger.info("Monitor de sinais parado")
    
    def _monitor_signals_loop(self):
        """Loop principal de monitoramento"""
        while self.running:
            try:
                self._process_signals()
            except Exception as e:
                logger.error(f"Erro no loop de monitoramento: {e}")
            
            # Espera antes da próxima checagem
            time.sleep(VALIDATION_INTERVAL)
    
    def _process_signals(self):
        """Processa todos os sinais abertos"""
        open_signals = get_open_signals()
        now = datetime.utcnow()
        
        for signal in open_signals:
            # Determina o timestamp do sinal
            timestamp_str = signal.get('createdAt') or signal.get('timestamp')
            if not timestamp_str:
                logger.warning(f"Sinal sem timestamp: {signal.get('id')}")
                continue
                
            try:
                # Converte o timestamp para um objeto datetime
                if isinstance(timestamp_str, str):
                    if 'T' in timestamp_str:
                        signal_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    else:
                        signal_time = datetime.fromisoformat(timestamp_str)
                else:
                    signal_time = timestamp_str
            except ValueError:
                logger.error(f"Formato de timestamp inválido: {timestamp_str}")
                continue
            
            # Validação por timeout
            if now - signal_time >= timedelta(minutes=TIMEOUT_MINUTES):
                result = validate_signal(signal)
                final_result = result if result else 'missed'  # "FALSE" alterado para "missed"
                update_signal_result(signal['id'], final_result)
                logger.info(f"Sinal {signal['id']} atualizado por timeout como {final_result}")
                continue

            # Validação imediata se atingir TP ou SL
            result = validate_signal(signal)
            if result:
                update_signal_result(signal['id'], result)
                logger.info(f"Sinal {signal['id']} atualizado como {result}")

# Instância global do monitor
signal_monitor = SignalMonitor()

def start_monitoring():
    """Inicia o monitoramento de sinais"""
    signal_monitor.start()

def stop_monitoring():
    """Para o monitoramento de sinais"""
    signal_monitor.stop()
