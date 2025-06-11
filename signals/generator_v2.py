
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
from strategies.hybrid_logic import confirm_volume, confirm_candle, generate_entry
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
        self.open_signals_cache = []  # Cache for duplicate prevention

    def is_trending(self, df, window_fast=50, window_slow=200):
        """Check if trend is up or down using EMA crossover"""
        if len(df) < window_slow:
            return False, False
        ema_fast = EMAIndicator(close=df['close'], window=window_fast).ema_indicator().iloc[-1]
        ema_slow = EMAIndicator(close=df['close'], window=window_slow).ema_indicator().iloc[-1]
        return ema_fast > ema_slow, ema_fast < ema_slow

    def has_high_volume(self, df, window=20):
        """Check if current volume is above average"""
        if len(df) < window:
            return False
        vol = df['volume'].iloc[-1]
        mean_vol = df['volume'].rolling(window).mean().iloc[-1]
        return vol > mean_vol

    def is_strong_candle(self, df):
        """Check if last candle has strong body (>60% of total range)"""
        c = df.iloc[-1]
        body = abs(c['close'] - c['open'])
        total = c['high'] - c['low']
        if total == 0:
            return False
        return body > 0.6 * total

    def atr_filter(self, df, min_atr=0.002, max_atr=0.05):
        """Filter by ATR percentage (0.2% to 5% of price) - mais flexível"""
        if len(df) < 14:
            logger.info(f"Dados insuficientes para ATR (len={len(df)})")
            return False
        atr = AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range().iloc[-1]
        price = df['close'].iloc[-1]
        if price == 0:
            logger.warning("Preço zero para cálculo ATR")
            return False
        atr_pct = atr / price
        
        logger.info(f"ATR: {atr:.6f}, Preço: {price:.6f}, ATR%: {atr_pct:.2%} (faixa: {min_atr:.2%}-{max_atr:.2%})")
        
        if min_atr < atr_pct < max_atr:
            logger.info(f"✅ ATR dentro da faixa aceitável")
            return True
        else:
            logger.info(f"❌ ATR fora da faixa ({atr_pct:.2%})")
            return False

    def get_direction(self, df_1h, df_15m):
        """Determine direction based on multi-timeframe trend alignment"""
        trend_up_1h, trend_down_1h = self.is_trending(df_1h)
        trend_up_15, trend_down_15 = self.is_trending(df_15m)
        
        if trend_up_1h and trend_up_15:
            return "BUY"
        if trend_down_1h and trend_down_15:
            return "SELL"
        return None

    def get_existing_open_signals(self):
        """Get list of currently open signals to prevent duplicates"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT symbol FROM signals WHERE result IS NULL")
                return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error fetching open signals: {e}")
            return []

    def extract_features(self, df):
        """Extract features for ML prediction"""
        latest = df.iloc[-1]
        
        # Calculate additional indicators for features
        rsi = RSIIndicator(close=df['close'], window=14).rsi().iloc[-1] if len(df) >= 14 else 50
        atr = AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range().iloc[-1] if len(df) >= 14 else 0
        volume_ratio = latest['volume'] / df['volume'].rolling(20).mean().iloc[-1] if len(df) >= 20 else 1
        
        features = [
            rsi / 100,
            atr / latest['close'] if latest['close'] > 0 else 0,
            volume_ratio,
            (latest['close'] - latest['open']) / latest['close'] if latest['close'] > 0 else 0
        ]
        return np.array(features).reshape(1, -1)

    def _save_to_sqlite(self, signal: Dict, features: np.ndarray):
        """Save signal to SQLite database"""
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

    def generate_signal_monster(self, symbol):
        """
        Monster signal generation with multi-timeframe analysis and advanced filtering
        """
        logger.info(f"🔍 Analisando {symbol} com filtros avançados...")
        
        try:
            # Get existing open signals to prevent duplicates
            existing_open_signals = self.get_existing_open_signals()
            if symbol in existing_open_signals:
                logger.info(f"🛑 Sinal já aberto para {symbol}. Evitando duplicata.")
                return None

            # Fetch multi-timeframe data
            df_15m = fetch_data(symbol, "15m", limit=210)
            df_1h = fetch_data(symbol, "1h", limit=210)
            
            if df_15m.empty or df_1h.empty:
                logger.warning(f"Dados insuficientes para {symbol}")
                return None

            # Determine direction based on trend alignment
            direction = self.get_direction(df_1h, df_15m)
            if direction is None:
                logger.info(f"🛑 Tendência não alinhada para {symbol}")
                return None

            # RSI filter - mais flexível
            rsi = RSIIndicator(close=df_15m['close'], window=14).rsi().iloc[-1]
            rsi_min_buy = 45  # Reduzido de 50 para 45
            rsi_max_sell = 55  # Aumentado de 50 para 55
            
            logger.info(f"📈 RSI atual: {rsi:.2f}")
            
            if direction == "BUY" and rsi < rsi_min_buy:
                logger.info(f"🛑 RSI baixo para BUY: {rsi:.2f} < {rsi_min_buy}")
                return None
            if direction == "SELL" and rsi > rsi_max_sell:
                logger.info(f"🛑 RSI alto para SELL: {rsi:.2f} > {rsi_max_sell}")
                return None
                
            logger.info(f"✅ RSI compatível com {direction}: {rsi:.2f}")

            # Advanced filters on 15m
            if not self.has_high_volume(df_15m):
                logger.info(f"🛑 Volume baixo para {symbol}")
                return None
            
            if not self.is_strong_candle(df_15m):
                logger.info(f"🛑 Candle fraco para {symbol}")
                return None
            
            if not self.atr_filter(df_15m):
                logger.info(f"🛑 ATR fora da faixa para {symbol}")
                return None

            # Calculate entry and targets
            entry = float(df_15m['close'].iloc[-1])
            atr = AverageTrueRange(df_15m['high'], df_15m['low'], df_15m['close'], window=14).average_true_range().iloc[-1]

            if direction == "BUY":
                sl = entry - 1.2 * atr
                tp1 = entry + 0.8 * atr
                tp2 = entry + 1.5 * atr
                tp3 = entry + 2.2 * atr
            else:
                sl = entry + 1.2 * atr
                tp1 = entry - 0.8 * atr
                tp2 = entry - 1.5 * atr
                tp3 = entry - 2.2 * atr

            # Extract features for ML prediction
            features = self.extract_features(df_15m)

            # Apply ML filtering if enabled
            success_prob = 0.75  # Default high confidence for monster filter
            if self.learning_enabled:
                prob = self.trainer.predict(features)[0]
                if prob < self.min_success_prob:
                    logger.info(f"🛑 Probabilidade ML baixa: {prob:.2%}")
                    return None
                success_prob = prob

            # Apply context analysis if available
            context_score = 0.8  # Default
            context_reason = "Monster filter passed"
            if self.context_text:
                context_score, context_reason = self.context_engine.analyze(symbol, self.context_text)
                if context_score < self.config.get("min_context_score", 0.6):
                    logger.info(f"🛑 Contexto fraco ({context_score:.2f}). Sinal descartado.")
                    return None

            # Create final signal
            signal = {
                'symbol': symbol,
                'direction': direction,
                'entry_price': round(entry, 6),
                'sl': round(sl, 6),
                'tp': round(tp3, 6),  # Use tp3 as main target
                'tp1': round(tp1, 6),
                'tp2': round(tp2, 6),
                'tp3': round(tp3, 6),
                'atr': round(atr, 6),
                'timestamp': datetime.utcnow().isoformat(),
                'expires': (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
                'timeframe': 'monster_1h_15m_multi',
                'score': round(context_score, 2),
                'context': context_reason,
                'success_prob': round(success_prob, 4),
                'result': None,
                'rsi': round(rsi, 2),
                'strategy': 'monster_1h_15m_multi'
            }

            # Save to database and storage
            save_signal(signal)
            self._save_to_sqlite(signal, features)
            
            logger.info(f"✅ Sinal MONSTER gerado {signal['direction']} @ {signal['entry_price']} ({symbol})")
            logger.info(f"   RSI: {rsi:.2f}, ATR: {atr:.6f}, Prob: {success_prob:.2%}")
            
            return signal

        except Exception as e:
            logger.exception(f"Erro ao gerar sinal monster para {symbol}")
            return None

    def generate_signal(self, symbol: str) -> Optional[Dict]:
        """Main signal generation entry point - now uses monster logic"""
        return self.generate_signal_monster(symbol)

    def run(self, symbols: List[str]):
        """Run signal generation for multiple symbols"""
        signals_generated = 0
        for symbol in symbols:
            signal = self.generate_signal(symbol)
            if signal:
                self.alert_sender.send_signal(signal)
                signals_generated += 1
        
        logger.info(f"🏁 Gerados {signals_generated} sinais monster de {len(symbols)} símbolos analisados")
        return signals_generated
