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
from api.fetch_data import fetch_data
from utils.save_signal import save_signal
from services.alertSender import SignalSender
from utils.false_breakout_detector import FalseBreakoutDetector, check_rsi_divergence
from utils.macro_events_filter import check_fundamental_filter
from ml.model_integration import AdvancedMLPredictor
from core.risk_management import DynamicRiskManager, detect_market_stress
from signals.intraday_signal_integrator import generate_intraday_signal
from utils.quick_intraday_performance_alert import should_halt_intraday_trading

# NOVO: Importa agente adaptativo
try:
    from adaptive_ai.adaptive_agent import AdaptiveTradingAgent
    ADAPTIVE_AI_AVAILABLE = True
    logger.info("🤖 Agente Adaptativo carregado com sucesso")
except ImportError as e:
    ADAPTIVE_AI_AVAILABLE = False
    logger.warning(f"⚠️ Agente Adaptativo não disponível: {e}")
    logger.warning("   Execute: pip install stable-baselines3 gym")

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
        self.min_success_prob = config.get("min_success_prob", 0.65)  # Aumentado para 65%
        self.open_signals_cache = []  # Cache for duplicate prevention
        
        # NOVOS COMPONENTES AVANÇADOS
        self.breakout_detector = FalseBreakoutDetector()
        self.ml_predictor = AdvancedMLPredictor()
        self.risk_manager = DynamicRiskManager()
        self.safe_mode = False
        self.safe_mode_until = None
        
        # NOVO: Agente Adaptativo (IA baseada em Reinforcement Learning)
        self.adaptive_agent = None
        self.adaptive_enabled = config.get("enable_adaptive_ai", True)
        
        if ADAPTIVE_AI_AVAILABLE and self.adaptive_enabled:
            try:
                self.adaptive_agent = AdaptiveTradingAgent()
                # Tenta carregar modelo pré-treinado
                if self.adaptive_agent.load_model():
                    logger.info("🤖 Agente Adaptativo carregado e pronto!")
                else:
                    logger.warning("⚠️ Modelo adaptativo não encontrado. Execute: python adaptive_ai/train_agent.py")
            except Exception as e:
                logger.error(f"❌ Erro ao inicializar Agente Adaptativo: {e}")
                self.adaptive_agent = None
        else:
            logger.info("🔧 Agente Adaptativo desabilitado na configuração")

    def is_trending(self, df, window_fast=50, window_slow=200):
        """Check if trend is up or down using EMA crossover"""
        if len(df) < window_slow:
            return False, False
        ema_fast = EMAIndicator(close=df['close'], window=window_fast).ema_indicator().iloc[-1]
        ema_slow = EMAIndicator(close=df['close'], window=window_slow).ema_indicator().iloc[-1]
        return ema_fast > ema_slow, ema_fast < ema_slow
    
    def is_trending_adaptive(self, df, window_fast, window_slow):
        """NOVO: Check trend with adaptive EMA windows"""
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
    
    def has_high_volume_adaptive(self, df, adaptive_adjustments, window=20):
        """NOVO: Check volume with adaptive threshold"""
        if len(df) < window:
            return False
        vol = df['volume'].iloc[-1]
        mean_vol = df['volume'].rolling(window).mean().iloc[-1]
        
        # Aplica ajuste adaptativo ao threshold de volume
        adaptive_threshold = 1.0 + adaptive_adjustments['vol_adj']
        adaptive_threshold = max(0.8, min(2.5, adaptive_threshold))  # Limita entre 0.8x e 2.5x
        
        logger.info(f"🤖 Volume threshold adaptativo: {adaptive_threshold:.2f}x")
        return vol > (mean_vol * adaptive_threshold)

    def is_strong_candle(self, df):
        """Check if last candle has strong body (>70% of total range) - MELHORADO"""
        c = df.iloc[-1]
        body = abs(c['close'] - c['open'])
        total = c['high'] - c['low']
        if total == 0:
            return False
        body_ratio = body / total
        logger.info(f"📊 Candle body ratio: {body_ratio:.2f} (mín: 0.70)")
        return body_ratio > 0.70  # Aumentado de 60% para 70%

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
    
    def atr_filter_adaptive(self, df, adaptive_adjustments, base_min_atr=0.002, base_max_atr=0.05):
        """NOVO: ATR filter with adaptive thresholds"""
        if len(df) < 14:
            logger.info(f"Dados insuficientes para ATR (len={len(df)})")
            return False
        atr = AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range().iloc[-1]
        price = df['close'].iloc[-1]
        if price == 0:
            logger.warning("Preço zero para cálculo ATR")
            return False
        atr_pct = atr / price
        
        # Aplica ajustes adaptativos aos limites ATR
        atr_adjustment = adaptive_adjustments['atr_adj']
        min_atr = max(0.001, base_min_atr + atr_adjustment)
        max_atr = min(0.1, base_max_atr + atr_adjustment)
        
        logger.info(f"ATR: {atr:.6f}, Preço: {price:.6f}, ATR%: {atr_pct:.2%}")
        logger.info(f"🤖 Faixa ATR adaptativa: {min_atr:.2%}-{max_atr:.2%} (ajuste: {atr_adjustment:+.3f})")
        
        if min_atr < atr_pct < max_atr:
            logger.info(f"✅ ATR dentro da faixa adaptativa")
            return True
        else:
            logger.info(f"❌ ATR fora da faixa adaptativa ({atr_pct:.2%})")
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
    
    def get_direction_adaptive(self, df_1h, df_15m, adaptive_adjustments):
        """NOVO: Determine direction with adaptive EMA adjustments"""
        # Aplica ajustes adaptativos aos períodos EMA
        ema_fast_period = max(20, int(50 + adaptive_adjustments['ema_adj']))
        ema_slow_period = max(100, int(200 + adaptive_adjustments['ema_adj'] * 2))
        
        logger.info(f"🤖 Períodos EMA adaptativos: Rápida={ema_fast_period}, Lenta={ema_slow_period}")
        
        # Calcula tendências com períodos adaptativos
        trend_up_1h, trend_down_1h = self.is_trending_adaptive(df_1h, ema_fast_period, ema_slow_period)
        trend_up_15, trend_down_15 = self.is_trending_adaptive(df_15m, ema_fast_period, ema_slow_period)
        
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

    def get_adaptive_adjustments(self, df_15m):
        """
        NOVO: Obtém ajustes adaptativos da IA baseada em Reinforcement Learning
        """
        if not self.adaptive_agent:
            return {
                "ema_adj": 0.0,
                "rsi_adj": 0.0, 
                "vol_adj": 0.0,
                "atr_adj": 0.0
            }
        
        try:
            # Prepara observação do mercado para o agente adaptativo
            latest = df_15m.iloc[-1]
            
            # EMA difference
            ema_fast = EMAIndicator(close=df_15m['close'], window=50).ema_indicator().iloc[-1]
            ema_slow = EMAIndicator(close=df_15m['close'], window=200).ema_indicator().iloc[-1]
            ema_diff = (ema_fast - ema_slow) / ema_slow if ema_slow > 0 else 0
            
            # RSI
            rsi = RSIIndicator(close=df_15m['close'], window=14).rsi().iloc[-1] if len(df_15m) >= 14 else 50
            
            # Volume ratio
            volume_ratio = latest['volume'] / df_15m['volume'].rolling(20).mean().iloc[-1] if len(df_15m) >= 20 else 1
            
            # ATR ratio  
            atr = AverageTrueRange(df_15m['high'], df_15m['low'], df_15m['close'], window=14).average_true_range().iloc[-1] if len(df_15m) >= 14 else 0
            atr_ratio = atr / latest['close'] if latest['close'] > 0 else 0
            
            # Observação para o agente
            market_obs = np.array([ema_diff, rsi, volume_ratio, atr_ratio], dtype=np.float32)
            
            # Obtém ajustes adaptativos
            adjustments = self.adaptive_agent.adapt_parameters(market_obs)
            
            logger.info(f"🤖 Ajustes adaptativos: EMA{adjustments['ema_adj']:+.1f}, "
                       f"RSI{adjustments['rsi_adj']:+.1f}, "
                       f"Vol{adjustments['vol_adj']:+.2f}, "
                       f"ATR{adjustments['atr_adj']:+.3f}")
            
            return adjustments
            
        except Exception as e:
            logger.error(f"❌ Erro nos ajustes adaptativos: {e}")
            return {
                "ema_adj": 0.0,
                "rsi_adj": 0.0,
                "vol_adj": 0.0,
                "atr_adj": 0.0
            }

    def generate_signal_monster(self, symbol):
        """
        Monster signal generation with ADVANCED filtering, ML validation and ADAPTIVE AI
        """
        logger.info(f"🔍 [MONSTER v2 + ADAPTIVE AI] Analisando {symbol} com filtros AVANÇADOS...")
        
        try:
            # 1. VERIFICAÇÕES PRELIMINARES
            if self.safe_mode:
                logger.warning(f"🛡️ MODO SEGURO ATIVO - bloqueando sinais para {symbol}")
                return None
            
            # Filtro fundamental (eventos macro)
            if not check_fundamental_filter(symbol):
                logger.info(f"🚨 Filtro fundamental bloqueou {symbol}")
                return None
            
            # Get existing open signals to prevent duplicates
            existing_open_signals = self.get_existing_open_signals()
            if symbol in existing_open_signals:
                logger.info(f"🛑 Sinal já aberto para {symbol}. Evitando duplicata.")
                return None

            # 2. FETCH MULTI-TIMEFRAME DATA
            df_15m = fetch_data(symbol, "15m", limit=210)
            df_1h = fetch_data(symbol, "1h", limit=210)
            
            if df_15m.empty or df_1h.empty:
                logger.warning(f"Dados insuficientes para {symbol}")
                return None

            # 2.1. NOVO: Obtém ajustes adaptativos da IA
            adaptive_adjustments = self.get_adaptive_adjustments(df_15m)

            # 3. DETECÇÃO DE STRESS DO MERCADO
            market_stress = detect_market_stress(df_15m)
            if market_stress:
                logger.warning(f"🚨 Stress do mercado detectado para {symbol} - sendo conservador")

            # 4. DETERMINE DIRECTION BASED ON TREND ALIGNMENT (com ajustes adaptativos)
            direction = self.get_direction_adaptive(df_1h, df_15m, adaptive_adjustments)
            if direction is None:
                logger.info(f"🛑 Tendência não alinhada para {symbol}")
                return None

            # 5. VALIDAÇÃO DE BREAKOUT (ANTI-FALSO BREAKOUT)
            is_valid_breakout = self.breakout_detector.is_valid_breakout(df_15m, direction)
            if not is_valid_breakout:
                logger.info(f"🛑 Breakout inválido ou suspeito para {symbol}")
                return None
            
            # 6. DETECÇÃO DE DIVERGÊNCIA RSI (NOVO)
            has_favorable_divergence = check_rsi_divergence(df_15m, direction)
            if has_favorable_divergence:
                logger.info(f"🔄 Divergência RSI favorável detectada para {direction}")

            # 7. RSI FILTER - mais flexível mas com divergência + AJUSTES ADAPTATIVOS
            rsi = RSIIndicator(close=df_15m['close'], window=14).rsi().iloc[-1]
            
            # Aplica ajustes adaptativos aos limites RSI
            base_rsi_min_buy = 40 if has_favorable_divergence else 45
            base_rsi_max_sell = 60 if has_favorable_divergence else 55
            
            rsi_min_buy = base_rsi_min_buy + adaptive_adjustments['rsi_adj']
            rsi_max_sell = base_rsi_max_sell + adaptive_adjustments['rsi_adj']
            
            # Garante limites sensatos
            rsi_min_buy = max(25, min(55, rsi_min_buy))
            rsi_max_sell = max(45, min(75, rsi_max_sell))
            
            logger.info(f"📈 RSI atual: {rsi:.2f} (limites adaptativos: {rsi_min_buy:.1f}-{rsi_max_sell:.1f})")
            logger.info(f"🤖 Ajuste RSI: {adaptive_adjustments['rsi_adj']:+.1f}")
            
            if direction == "BUY" and rsi < rsi_min_buy:
                logger.info(f"🛑 RSI baixo para BUY: {rsi:.2f} < {rsi_min_buy:.1f}")
                return None
            if direction == "SELL" and rsi > rsi_max_sell:
                logger.info(f"🛑 RSI alto para SELL: {rsi:.2f} > {rsi_max_sell:.1f}")
                return None

            # 8. ADVANCED FILTERS ON 15M (MAIS RIGOROSOS) + AJUSTES ADAPTATIVOS
            if not self.has_high_volume_adaptive(df_15m, adaptive_adjustments):
                logger.info(f"🛑 Volume baixo para {symbol}")
                return None
            
            if not self.is_strong_candle(df_15m):  # Mantém 70%
                logger.info(f"🛑 Candle fraco para {symbol}")
                return None
            
            if not self.atr_filter_adaptive(df_15m, adaptive_adjustments):
                logger.info(f"🛑 ATR fora da faixa para {symbol}")
                return None

            # 9. CALCULATE ENTRY AND ADVANCED TARGETS
            entry = float(df_15m['close'].iloc[-1])
            atr = AverageTrueRange(df_15m['high'], df_15m['low'], df_15m['close'], window=14).average_true_range().iloc[-1]
            
            # Calcula ADX para targets dinâmicos
            from ta.trend import ADXIndicator
            adx = ADXIndicator(df_15m['high'], df_15m['low'], df_15m['close'], window=14).adx().iloc[-1]
            
            # GESTÃO DE RISCO DINÂMICA
            market_volatility = self.risk_manager.is_acceptable_volatility(atr, atr)
            take_profits, stop_loss = self.risk_manager.calculate_targets(
                entry, atr, direction, adx, symbol
            )

            # 10. ADVANCED ML PREDICTION
            ml_result, ml_confidence = self.ml_predictor.predict_signal_quality(
                df_15m, 
                market_volatility=2.0 if market_stress else 1.0,
                consecutive_losses=self.risk_manager.consecutive_losses
            )
            
            if ml_result == "REJECTED":
                logger.info(f"🤖 ML rejeitou o sinal (confiança: {ml_confidence:.3f})")
                return None
            
            logger.info(f"🤖 ML aprovou: {ml_result} (confiança: {ml_confidence:.3f})")

            # 11. CONTEXT ANALYSIS
            context_score = 0.85  # Default higher for advanced filter
            context_reason = "Advanced Monster filter v2 - all checks passed"
            if self.context_text:
                context_score, context_reason = self.context_engine.analyze(symbol, self.context_text)
                if context_score < self.config.get("min_context_score", 0.65):
                    logger.info(f"🛑 Contexto fraco ({context_score:.2f}). Sinal descartado.")
                    return None

            # 12. CREATE ENHANCED SIGNAL
            signal = {
                'symbol': symbol,
                'direction': direction,
                'entry_price': round(entry, 6),
                'sl': round(stop_loss, 6),
                'tp': round(take_profits[2], 6),  # TP3 como target principal
                'tp1': round(take_profits[0], 6),
                'tp2': round(take_profits[1], 6),
                'tp3': round(take_profits[2], 6),
                'atr': round(atr, 6),
                'adx': round(adx, 2),
                'timestamp': datetime.utcnow().isoformat(),
                'expires': (datetime.utcnow() + timedelta(minutes=8)).isoformat(),  # Mais tempo
                'timeframe': 'monster_v2_advanced',
                'score': round(context_score, 2),
                'context': context_reason,
                'success_prob': round(ml_confidence, 4),
                'result': None,
                'rsi': round(rsi, 2),
                'strategy': 'monster_v2_adaptive_ai',
                'market_stress': market_stress,
                'breakout_valid': is_valid_breakout,
                'rsi_divergence': has_favorable_divergence,
                'ml_prediction': ml_result,
                'adaptive_adjustments': adaptive_adjustments
            }

            # 13. SAVE TO DATABASE AND STORAGE
            save_signal(signal)
            
            logger.info(f"✅ SINAL MONSTER V2 + ADAPTIVE AI gerado para {symbol}:")
            logger.info(f"   🎯 {signal['direction']} @ {signal['entry_price']}")
            logger.info(f"   📊 RSI: {rsi:.2f}, ADX: {adx:.2f}, ATR: {atr:.6f}")
            logger.info(f"   🤖 ML: {ml_result} ({ml_confidence:.3f})")
            logger.info(f"   🔄 Divergência: {has_favorable_divergence}, Stress: {market_stress}")
            logger.info(f"   🧠 Adaptativo: EMA{adaptive_adjustments['ema_adj']:+.1f}, RSI{adaptive_adjustments['rsi_adj']:+.1f}")
            
            return signal

        except Exception as e:
            logger.exception(f"Erro ao gerar sinal monster v2 para {symbol}")
            return None

    def generate_signal_intraday(self, symbol):
        """
        NOVO: Geração de sinais para Day Trade com validações rápidas
        """
        logger.info(f"🏃‍♂️ [INTRADAY] Gerando sinal rápido para {symbol}")
        
        try:
            # Verifica se deve parar trading intradiário
            if should_halt_intraday_trading():
                logger.warning("🛑 Trading intradiário suspenso por performance")
                return None
            
            # Usa o novo sistema integrado
            intraday_signal = generate_intraday_signal(symbol)
            
            if intraday_signal:
                logger.info(f"✅ Sinal intradiário gerado: {symbol} {intraday_signal['direction']} @ {intraday_signal['entry_price']}")
                return intraday_signal
            else:
                logger.info(f"🛑 Nenhum sinal intradiário aprovado para {symbol}")
                return None
                
        except Exception as e:
            logger.exception(f"Erro na geração de sinal intradiário para {symbol}")
            return None

    def generate_signal(self, symbol: str) -> Optional[Dict]:
        """
        ATUALIZADO: Método principal que escolhe entre Monster e Intraday
        """
        try:
            # Primeiro tenta gerar sinal intradiário (mais rápido)
            intraday_signal = self.generate_signal_intraday(symbol)
            if intraday_signal:
                return intraday_signal
            
            # Se não gerar sinal intradiário, usa o Monster (estratégia principal)
            monster_signal = self.generate_signal_monster(symbol)
            return monster_signal
            
        except Exception as e:
            logger.exception(f"Erro na geração de sinal para {symbol}")
            return None

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
