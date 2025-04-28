"""
Serviço de validação automática de sinais de trading.
Este módulo monitora os sinais abertos e atualiza seus resultados
baseado nos preços atuais do mercado.
"""

import time
from datetime import datetime, timedelta
import logging
import threading

# Importações da estrutura existente
from api.fetch_data import fetch_data
from services.evaluate_signals_pg import Signal, Session

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
    sl = signal.get('sl') or signal.get('stopLoss') or signal.get('stop_loss')
    
    if not all([tp1, sl]):
        logger.warning(f"Sinal {signal.get('id')} sem níveis de TP ou SL completos")
        return None
    
    # Valores padrão se não houver TP2 ou TP3
    tp2 = tp2 or tp1 * 1.05 if direction == "BUY" else tp1 * 0.95
    tp3 = tp3 or tp1 * 1.1 if direction == "BUY" else tp1 * 0.9
    
    if direction.upper() == 'BUY':
        if current_price >= float(tp3):
            return "win"
        elif current_price >= float(tp2) or current_price >= float(tp1):
            return "partial"
        elif current_price <= float(sl):
            return "loss"

    elif direction.upper() == 'SELL':
        if current_price <= float(tp3):
            return "win"
        elif current_price <= float(tp2) or current_price <= float(tp1):
            return "partial"
        elif current_price >= float(sl):
            return "loss"

    return None  # Ainda não bateu nenhuma condição

def get_open_signals_db():
    """
    Busca sinais abertos do banco de dados.
    
    Returns:
        list: Lista de sinais ativos sem resultado
    """
    session = Session()
    try:
        # Buscar sinais sem resultado (abertos)
        signals = session.query(Signal).filter(Signal.resultado == None).all()
        
        # Converter objetos do SQLAlchemy para dicionários
        result_signals = []
        for signal in signals:
            result_signals.append({
                'id': signal.id,
                'symbol': signal.symbol,
                'timestamp': signal.timestamp.isoformat() if signal.timestamp else None,
                'direction': signal.direction.upper() if signal.direction else None,
                'entry': signal.entry,
                'tp1': signal.tp1,
                'tp2': signal.tp2,
                'tp3': signal.tp3,
                'sl': signal.stop_loss,
                'stop_loss': signal.stop_loss
            })
            
        return result_signals
    except Exception as e:
        logger.error(f"Erro ao buscar sinais abertos: {e}")
        return []
    finally:
        session.close()

def update_signal_result(signal_id, result):
    """
    Atualiza o resultado de um sinal no banco de dados.
    
    Args:
        signal_id (int): ID do sinal a ser atualizado
        result (str): Resultado do sinal (win, loss, partial, missed)
        
    Returns:
        bool: True se a atualização foi bem-sucedida, False caso contrário
    """
    session = Session()
    try:
        # Buscar o sinal pelo ID
        signal = session.query(Signal).filter(Signal.id == signal_id).first()
        
        if not signal:
            logger.warning(f"Sinal {signal_id} não encontrado para atualização")
            return False
        
        # Atualizar o resultado
        signal.resultado = result
        
        # Salvar a atualização
        session.commit()
        logger.info(f"Sinal {signal_id} atualizado com resultado: {result}")
        return True
    except Exception as e:
        session.rollback()
        logger.error(f"Erro ao atualizar resultado do sinal {signal_id}: {e}")
        return False
    finally:
        session.close()

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
        open_signals = get_open_signals_db()
        now = datetime.utcnow()
        
        for signal in open_signals:
            # Determina o timestamp do sinal
            timestamp_str = signal.get('timestamp')
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
                final_result = result if result else 'missed'
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
