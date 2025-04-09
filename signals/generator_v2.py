import logging
import sqlite3
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from ta.trend import EMAIndicator
from ta.volatility import AverageTrueRange
from ta.momentum import RSIIndicator

# Módulos customizados
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
        self._init_db()

    def _init_db(self):
        """Inicializa o banco de dados SQLite com uma tabela otimizada."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS signals (
                    id TEXT PRIMARY KEY,
                    symbol TEXT,
                    direction TEXT,
                    entry_price REAL,
                    sl REAL,
                    tp REAL,
                    atr REAL,
                    timestamp TEXT,
                    expires TEXT,
                    timeframe TEXT,
                    score REAL,
                    context TEXT,
                    success_prob REAL,
                    result REAL,
                    features BLOB,
                    closed INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_symbol ON signals (symbol)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_closed ON signals (closed)")

    def _calculate_technical_indicators(self, df):
        """Calcula indicadores técnicos de forma mais eficiente."""
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

    def _extract_features(self, df):
        """Extrai features para o modelo de ML com vetorização."""
        latest = df.iloc[-1]
        return np.array([
            latest['rsi'] / 100,
            latest['atr'] / latest['close'],
            (latest['ema_50'] - latest['ema_200']) / latest['close'],
            latest['volume'] / df['volume'].rolling(20).mean().iloc[-1]
        ]).reshape(1, -1)

    def _check_trend(self, symbol: str, timeframe: str = '4h') -> str:
        """Determina a tendência com tratamento robusto de erros."""
        try:
            df = fetch_data(symbol, timeframe)
            if df.empty:
                raise ValueError("Dados vazios")
                
            df = self._calculate_technical_indicators(df)
            return 'UP' if df['ema_50'].iloc[-1] > df['ema_200'].iloc[-1] else 'DOWN'
            
        except Exception as e:
            logger.error(f"Erro ao verificar tendência ({symbol}): {str(e)}")
            return 'UNKNOWN'

    def _save_signal(self, signal: Dict, features: np.ndarray):
        """Salva sinal no banco de dados com otimizações."""
        try:
            save_signal(signal)  # Função existente
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO signals (
                        id, symbol, direction, entry_price, sl, tp, atr,
                        timestamp, expires, timeframe, score, context,
                        success_prob, features
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"{signal['symbol']}_{datetime.now().isoformat()}",
                    signal['symbol'],
                    signal['direction'],
                    signal['entry_price'],
                    signal['sl'],
                    signal['tp'],
                    signal['atr'],
                    signal['timestamp'],
                    signal['expires'],
                    signal['timeframe'],
                    signal['score'],
                    signal['context'],
                    signal.get('success_prob', 0.5),
                    sqlite3.Binary(features.tobytes())
                ))
        except Exception as e:
            logger.error(f"Falha ao salvar sinal: {str(e)}")

    def generate_signal(self, symbol: str) -> Optional[Dict]:
        """Versão otimizada do gerador de sinais."""
        logger.info(f"🔍 Analisando {symbol}...")
        
        try:
            # 1. Análise de Contexto
            context_score, context_reason = self.context_engine.analyze(symbol, self.context_text)
            if context_score < self.config.get("min_context_score", 0.6):
                logger.debug(f"Contexto insuficiente: {context_score:.2f}")
                return None

            # 2. Tendência
            trend = self._check_trend(symbol)
            if trend == 'UNKNOWN':
                return None

            # 3. Dados e Indicadores
            df = fetch_data(symbol, '15m', limit=self.config.get("feature_window", 50))
            if df.empty or len(df) < 20:
                logger.warning(f"Dados insuficientes para {symbol}")
                return None

            df = self._calculate_technical_indicators(df)
            
            # 4. Confirmações
            if not all([
                confirm_volume(df),
                confirm_candle_pattern(df, trend)
            ]):
                return None

            # 5. Machine Learning
            features = self._extract_features(df)
            success_prob = self.trainer.predict(features)[0]
            if success_prob < self.config.get("min_success_prob", 0.6):
                logger.info(f"Probabilidade baixa: {success_prob:.2%}")
                return None

            # 6. Geração do Sinal
            entry_data = generate_entry(symbol, trend, '15m')
            if not entry_data:
                return None

            signal = {
                'symbol': symbol,
                'direction': 'BUY' if trend == 'UP' else 'SELL',
                'entry_price': round(entry_data['entry'], 6),
                'sl': round(entry_data['sl'], 6),
                'tp': round(entry_data['tp'], 6),
                'atr': round(entry_data['atr'], 6),
                'timestamp': datetime.utcnow().isoformat(),
                'expires': (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
                'timeframe': 'hybrid_realtime',
                'score': round(context_score, 2),
                'context': context_reason,
                'success_prob': round(success_prob, 4)
            }

            self._save_signal(signal, features)
            logger.info(f"✅ Sinal {signal['direction']} {signal['entry_price']} ({success_prob:.2%})")
            return signal

        except Exception as e:
            logger.exception(f"Falha crítica em {symbol}")
            return None

    def run(self, symbols: List[str]):
        """Loop principal com tratamento de erros global."""
        while True:
            try:
                for symbol in symbols:
                    if signal := self.generate_signal(symbol):
                        self.alert_sender.send_signal(signal)
            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"Erro no loop principal: {str(e)}")
