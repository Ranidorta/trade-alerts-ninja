### generator_v2.py

import logging
import pickle
import sqlite3
import numpy as np
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from ta.trend import EMAIndicator
from ta.volatility import AverageTrueRange
from ta.momentum import RSIIndicator
from logic.hybrid_logic import confirm_volume, confirm_candle_pattern, generate_entry
from services.context_engine import ContextEngine
from services.trainer import MLTrainer
from data.fetch_data import fetch_data
from utils.save_signal import save_signal
from services.alertSender import SignalSender

logger = logging.getLogger("TradeAgent")
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')

class TradeAgent:
    def __init__(self, config: Dict, context_text: str = ""):
        self.config = config
        self.context_text = context_text
        self.context_engine = ContextEngine(config.get("llm_config", {}))
        self.alert_sender = SignalSender(config.get("alert_config", {}))
        self.trainer = MLTrainer(model_path="models/trade_agent_model.pkl")
        self.db_path = config.get("db_path", "signals.db")
        self.learning_enabled = config.get("enable_learning", True)
        self.feature_window = config.get("feature_window", 50)
        self.min_success_prob = config.get("min_success_prob", 0.6)

    def _calculate_technical_indicators(self, df):
        df['ema_50'] = EMAIndicator(close=df['close'], window=50).ema_indicator()
        df['ema_200'] = EMAIndicator(close=df['close'], window=200).ema_indicator()
        df['atr'] = AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range()
        df['rsi'] = RSIIndicator(close=df['close'], window=14).rsi()
        return df

    def extract_features(self, df):
        latest = df.iloc[-1]
        features = [
            latest['rsi'] / 100,
            latest['atr'] / latest['close'],
            (latest['ema_50'] - latest['ema_200']) / latest['close'],
            latest['volume'] / df['volume'].rolling(20).mean().iloc[-1]
        ]
        return np.array(features).reshape(1, -1)

    def check_trend(self, symbol: str, timeframe='4h') -> str:
        try:
            df = fetch_data(symbol, timeframe)
            df = self._calculate_technical_indicators(df)
            is_uptrend = df['ema_50'].iloc[-1] > df['ema_200'].iloc[-1]
            return 'UP' if is_uptrend else 'DOWN'
        except Exception as e:
            logger.error(f"Erro ao verificar tendência: {e}")
            return 'UNKNOWN'

    def _save_to_sqlite(self, signal: Dict, features: np.ndarray):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO signals (
                    id, symbol, direction, entry_price, sl, tp, atr,
                    timestamp, expires, timeframe, score, context,
                    success_prob, result, features, closed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"{signal['symbol']}_{datetime.now().isoformat()}",
                signal['symbol'], signal['direction'], signal['entry_price'],
                signal['sl'], signal['tp'], signal['atr'],
                signal['timestamp'], signal['expires'], signal['timeframe'],
                signal['score'], signal['context'], signal.get('success_prob', 0.5),
                None, pickle.dumps(features), 0
            ))

    def generate_signal(self, symbol: str) -> Optional[Dict]:
        logger.info(f"🔍 Analisando {symbol} para geração de sinal...")
        try:
            context_score, context_reason = self.context_engine.analyze(symbol, self.context_text)
            if context_score < self.config.get("min_context_score", 0.6):
                logger.info(f"🛑 Contexto fraco ({context_score:.2f}). Sinal descartado.")
                return None

            trend_direction = self.check_trend(symbol, '4h')
            if trend_direction == 'UNKNOWN':
                return None

            df = fetch_data(symbol, '15m', limit=self.feature_window)
            if df.empty or len(df) < 50:
                logger.warning(f"Dados insuficientes para {symbol}")
                return None

            df = self._calculate_technical_indicators(df)
            if not confirm_volume(df):
                return None
            if not confirm_candle_pattern(df, trend_direction):
                return None

            features = self.extract_features(df)

            if self.learning_enabled:
                prob = self.trainer.predict(features)[0]
                if prob < self.min_success_prob:
                    logger.info(f"🛑 Probabilidade de sucesso baixa: {prob:.2%}")
                    return None
            else:
                prob = 0.5

            entry_data = generate_entry(symbol, trend_direction, '15m')
            if not entry_data:
                return None

            signal = {
                'symbol': symbol,
                'direction': 'BUY' if trend_direction == 'UP' else 'SELL',
                'entry_price': round(entry_data['entry'], 6),
                'sl': round(entry_data['sl'], 6),
                'tp': round(entry_data['tp'], 6),
                'atr': round(entry_data['atr'], 6),
                'timestamp': datetime.utcnow().isoformat(),
                'expires': (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
                'timeframe': 'hybrid_realtime',
                'score': round(context_score, 2),
                'context': context_reason,
                'success_prob': round(prob, 4),
                'result': None
            }

            save_signal(signal)
            self._save_to_sqlite(signal, features)
            logger.info(f"✅ Sinal gerado {signal['direction']} @ {signal['entry_price']} ({symbol})")
            return signal

        except Exception as e:
            logger.exception(f"Erro ao gerar sinal para {symbol}")
            return None

    def run(self, symbols: List[str]):
        for symbol in symbols:
            signal = self.generate_signal(symbol)
            if signal:
                self.alert_sender.send_signal(signal)
