 import logging
from typing import Dict, Optional, List, Tuple
from datetime import datetime, timedelta
import pandas as pd
from ta.trend import EMAIndicator, MACD
from ta.volatility import AverageTrueRange, BollingerBands
from ta.momentum import RSIIndicator
from hybrid_logic import confirm_volume, confirm_candle_pattern, generate_entry
from context_engine import ContextEngine
from data.fetch_data import fetch_data
from utils.save_signal import save_signal
from alertSender import SignalSender

logger = logging.getLogger("TradeAgent")
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')

class TradeAgent:
    def __init__(self, config: Dict, context_text: str = ""):
        self.config = config
        self.context_text = context_text
        self.context_engine = ContextEngine(config.get("llm_config", {}))
        self.alert_sender = SignalSender(config.get("alert_config", {}))
        self.min_volume_factor = config.get("min_volume_factor", 1.2)
        self.max_rsi = config.get("max_rsi", 70)
        self.min_rsi = config.get("min_rsi", 30)

    def _calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calcula todos os indicadores técnicos de uma vez"""
        df['ema_50'] = EMAIndicator(close=df['close'], window=50).ema_indicator()
        df['ema_200'] = EMAIndicator(close=df['close'], window=200).ema_indicator()
        df['atr'] = AverageTrueRange(
            high=df['high'],
            low=df['low'],
            close=df['close'],
            window=14
        ).average_true_range()
        df['rsi'] = RSIIndicator(close=df['close'], window=14).rsi()
        return df

    def check_trend(self, symbol: str, timeframe='4h') -> Tuple[str, float]:
        """Retorna a direção da tendência e sua força relativa"""
        try:
            df = fetch_data(symbol, timeframe)
            df = self._calculate_technical_indicators(df)
            
            # Tendência baseada em EMA
            ema_trend = 'UP' if df['ema_50'].iloc[-1] > df['ema_200'].iloc[-1] else 'DOWN'
            
            # Força da tendência (0 a 1)
            trend_strength = abs(df['ema_50'].iloc[-1] - df['ema_200'].iloc[-1]) / df['close'].iloc[-1]
            
            logger.info(f"{symbol} {timeframe} - Tendência: {ema_trend} | Força: {trend_strength:.2%}")
            return ema_trend, trend_strength
            
        except Exception as e:
            logger.error(f"Erro ao verificar tendência: {e}", exc_info=True)
            return 'UNKNOWN', 0

    def _validate_market_conditions(self, df: pd.DataFrame) -> bool:
        """Valida condições de sobrecompra/sobrevenda"""
        last_rsi = df['rsi'].iloc[-1]
        
        if last_rsi > self.max_rsi:
            logger.info(f"RSI {last_rsi:.2f} acima do limite ({self.max_rsi}) - Condição de sobrecompra")
            return False
        if last_rsi < self.min_rsi:
            logger.info(f"RSI {last_rsi:.2f} abaixo do limite ({self.min_rsi}) - Condição de sobrevenda")
            return False
        return True

    def generate_signal(self, symbol: str) -> Optional[Dict]:
        logger.info(f"🔍 Analisando {symbol} para geração de sinal...")
        try:
            # 1. Verifica contexto macroeconômico
            context_score, context_reason = self.context_engine.analyze(symbol, self.context_text)
            if context_score < self.config.get("min_context_score", 0.6):
                logger.info(f"🛑 Contexto desfavorável ({context_score:.2f}). Sinal descartado.")
                return None

            # 2. Verifica tendência técnica (EMA 4h) e sua força
            trend_direction, trend_strength = self.check_trend(symbol, '4h')
            if trend_direction == 'UNKNOWN' or trend_strength < 0.005:  # 0.5%
                logger.info(f"🛑 Tendência fraca ou indefinida ({trend_strength:.2%})")
                return None

            # 3. Coleta dados de 15m e valida condições
            df_15m = fetch_data(symbol, '15m')
            if df_15m.empty or len(df_15m) < 50:
                logger.warning(f"❌ Dados insuficientes para {symbol} no 15m")
                return None

            df_15m = self._calculate_technical_indicators(df_15m)
            
            if not self._validate_market_conditions(df_15m):
                return None

            if not confirm_volume(df_15m, min_factor=self.min_volume_factor):
                logger.info(f"❌ Volume insuficiente para {symbol}, sinal descartado.")
                return None

            if not confirm_candle_pattern(df_15m, trend_direction):
                logger.info(f"❌ Sem padrão de candle confirmado para {symbol}.")
                return None

            # 4. Gera entrada com ATR e valida risco
            entry_data = generate_entry(
                symbol, 
                trend_direction, 
                '15m',
                risk_reward_ratio=self.config.get("risk_reward_ratio", 1.5)
            )
            
            if not entry_data or entry_data['risk'] > self.config.get("max_risk_per_trade", 0.02):
                logger.info(f"🛑 Risco muito alto ou entrada inválida: {entry_data.get('risk', 0):.2%}")
                return None

            # 5. Monta e salva o sinal
            signal = {
                'symbol': symbol,
                'direction': 'BUY' if trend_direction == 'UP' else 'SELL',
                'entry_price': round(entry_data['entry'], 6),
                'sl': round(entry_data['sl'], 6),
                'tp': round(entry_data['tp'], 6),
                'atr': round(entry_data['atr'], 6),
                'risk': round(entry_data['risk'], 4),
                'timestamp': datetime.utcnow().isoformat(),
                'expires': (datetime.utcnow() + timedelta(minutes=self.config.get("signal_expiry_minutes", 5))).isoformat(),
                'timeframe': 'hybrid_realtime',
                'score': round(context_score * 0.6 + trend_strength * 0.4, 2),  # Score composto
                'context': context_reason,
                'indicators': {
                    'ema_50': round(df_15m['ema_50'].iloc[-1], 2),
                    'ema_200': round(df_15m['ema_200'].iloc[-1], 2),
                    'rsi': round(df_15m['rsi'].iloc[-1], 2),
                    'atr': round(df_15m['atr'].iloc[-1], 2)
                }
            }

            save_signal(signal)
            logger.info(f"✅ Sinal gerado {signal['direction']} @ {signal['entry_price']} ({symbol}) | R:R {entry_data['risk_reward_ratio']:.2f}:1")
            return signal

        except Exception as e:
            logger.exception(f"Erro crítico ao gerar sinal para {symbol}")
            return None

    def run(self, symbols: List[str], batch_size: int = 5):
        """Processa símbolos em lotes com intervalo para evitar rate limits"""
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i + batch_size]
            logger.info(f"⚙️ Processando lote {i//batch_size + 1}/{(len(symbols)-1)//batch_size + 1}")
            
            for symbol in batch:
                signal = self.generate_signal(symbol)
                if signal:
                    self.alert_sender.send_signal(signal)
            
            # Intervalo entre lotes
            if i + batch_size < len(symbols):
                time.sleep(self.config.get("batch_interval", 10))
