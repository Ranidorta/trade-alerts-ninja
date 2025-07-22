# core/risk_management.py

import numpy as np
import pandas as pd
from ta.volatility import AverageTrueRange
from ta.trend import ADXIndicator
from utils.logger import logger
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional

class DynamicRiskManager:
    def __init__(self, base_risk_per_trade=0.02):
        self.base_risk_per_trade = base_risk_per_trade
        self.consecutive_losses = 0
        self.max_consecutive_losses = 2  # Reduzido para Monster V2
        self.safe_mode_active = False
        self.safe_mode_until = None
    
    def calculate_position_size(self, account_balance, volatility, market_stress=False):
        """
        Ajusta o tamanho da posição baseado na volatilidade e stress do mercado
        """
        risk_per_trade = self.base_risk_per_trade
        
        # Reduz risco durante alta volatilidade
        if volatility > 1.2:
            risk_per_trade *= 0.7
            logger.info(f"🔻 Risco reduzido por alta volatilidade: {volatility:.2f}")
        
        # Reduz risco após perdas consecutivas
        if self.consecutive_losses >= 2:
            risk_per_trade *= 0.5
            logger.info(f"🔻 Risco reduzido por {self.consecutive_losses} perdas consecutivas")
        
        # Reduz risco durante stress do mercado
        if market_stress:
            risk_per_trade *= 0.3
            logger.info("🔻 Risco reduzido por stress do mercado")
        
        max_leverage = min(account_balance * risk_per_trade, account_balance * 0.05)
        return max_leverage
    
    def calculate_targets_monster_v2(self, entry_price: float, atr: float, direction: str, symbol: str = "") -> Tuple[List[float], float]:
        """
        Calcula alvos para Monster V2 - gestão de risco restritiva
        ✅ Stop Loss: máximo de -1.5×ATR, nunca maior que 1.8% do preço
        ✅ TP1 = 1.5×ATR, TP2 = 2.5×ATR, TP3 = 3.5×ATR
        """
        direction_mult = 1 if direction == "BUY" else -1
        
        # MONSTER V2 - Take Profits fixos
        tp_multipliers = [1.5, 2.5, 3.5]
        take_profits = []
        
        for mult in tp_multipliers:
            tp = entry_price + (direction_mult * atr * mult)
            take_profits.append(round(tp, 6))
        
        # MONSTER V2 - Stop Loss restritivo
        sl_atr_mult = 1.5  # Máximo 1.5×ATR
        sl_price_limit = entry_price * 0.018  # Máximo 1.8% do preço
        
        # Calcula SL por ATR
        sl_by_atr = entry_price - (direction_mult * atr * sl_atr_mult)
        
        # Calcula SL por percentual
        sl_by_percentage = entry_price - (direction_mult * sl_price_limit)
        
        # Usa o menor risco (mais conservador)
        if direction == "BUY":
            stop_loss = max(sl_by_atr, sl_by_percentage)  # Maior preço = menor risco
        else:
            stop_loss = min(sl_by_atr, sl_by_percentage)  # Menor preço = menor risco
        
        # Calcula Risk/Reward esperado
        risk = abs(entry_price - stop_loss)
        reward = abs(take_profits[2] - entry_price)  # TP3 como target principal
        rr_ratio = reward / risk if risk > 0 else 0
        
        logger.info(f"🎯 [MONSTER V2] {symbol} - Gestão Restritiva:")
        logger.info(f"   Entry: {entry_price:.6f}")
        logger.info(f"   TP1: {take_profits[0]:.6f} ({1.5:.1f}×ATR)")
        logger.info(f"   TP2: {take_profits[1]:.6f} ({2.5:.1f}×ATR)")
        logger.info(f"   TP3: {take_profits[2]:.6f} ({3.5:.1f}×ATR)")
        logger.info(f"   SL: {stop_loss:.6f} ({sl_atr_mult:.1f}×ATR, {(risk/entry_price)*100:.1f}%)")
        logger.info(f"   💰 R/R Esperado: {rr_ratio:.2f}")
        
        return take_profits, round(stop_loss, 6)
    
    def calculate_targets_intraday(self, entry_price: float, atr: float, direction: str, symbol: str = "") -> Tuple[List[float], float]:
        """
        Calcula alvos para Intraday - gestão de risco relaxada
        ✅ Stop Loss: máximo de -1×ATR, nunca maior que 1.2% do preço
        ✅ TP1 = 1.3×ATR, TP2 = 2×ATR, TP3 = 3×ATR
        """
        direction_mult = 1 if direction == "BUY" else -1
        
        # INTRADAY - Take Profits relaxados
        tp_multipliers = [1.3, 2.0, 3.0]
        take_profits = []
        
        for mult in tp_multipliers:
            tp = entry_price + (direction_mult * atr * mult)
            take_profits.append(round(tp, 6))
        
        # INTRADAY - Stop Loss relaxado
        sl_atr_mult = 1.0  # Máximo 1×ATR
        sl_price_limit = entry_price * 0.012  # Máximo 1.2% do preço
        
        # Calcula SL por ATR
        sl_by_atr = entry_price - (direction_mult * atr * sl_atr_mult)
        
        # Calcula SL por percentual
        sl_by_percentage = entry_price - (direction_mult * sl_price_limit)
        
        # Usa o menor risco (mais conservador)
        if direction == "BUY":
            stop_loss = max(sl_by_atr, sl_by_percentage)
        else:
            stop_loss = min(sl_by_atr, sl_by_percentage)
        
        # Calcula Risk/Reward esperado
        risk = abs(entry_price - stop_loss)
        reward = abs(take_profits[2] - entry_price)
        rr_ratio = reward / risk if risk > 0 else 0
        
        logger.info(f"🎯 [INTRADAY] {symbol} - Gestão Relaxada:")
        logger.info(f"   Entry: {entry_price:.6f}")
        logger.info(f"   TP1: {take_profits[0]:.6f} ({1.3:.1f}×ATR)")
        logger.info(f"   TP2: {take_profits[1]:.6f} ({2.0:.1f}×ATR)")
        logger.info(f"   TP3: {take_profits[2]:.6f} ({3.0:.1f}×ATR)")
        logger.info(f"   SL: {stop_loss:.6f} ({sl_atr_mult:.1f}×ATR, {(risk/entry_price)*100:.1f}%)")
        logger.info(f"   💰 R/R Esperado: {rr_ratio:.2f}")
        
        return take_profits, round(stop_loss, 6)
    
    def calculate_targets(self, entry_price, atr, direction, adx_value, symbol="", agent_type="monster"):
        """
        Wrapper que escolhe o método de cálculo baseado no agente
        """
        if agent_type == "monster":
            return self.calculate_targets_monster_v2(entry_price, atr, direction, symbol)
        elif agent_type == "intraday":
            return self.calculate_targets_intraday(entry_price, atr, direction, symbol)
        else:
            # Fallback para o método original
            return self.calculate_targets_monster_v2(entry_price, atr, direction, symbol)
    
    def is_acceptable_volatility(self, atr_current, atr_avg):
        """
        Verifica se a volatilidade está em faixa aceitável
        """
        volatility_ratio = atr_current / atr_avg if atr_avg > 0 else 1
        is_acceptable = 0.5 <= volatility_ratio <= 1.5
        
        if not is_acceptable:
            logger.info(f"⚠️ Volatilidade fora da faixa: {volatility_ratio:.2f} (aceito: 0.5-1.5)")
        
        return is_acceptable
    
    def evaluate_trade_result_monster(self, result: str, agent_type: str = "monster") -> Dict:
        """
        Avalia resultado do trade Monster V2 e ajusta parâmetros
        ✅ Modo segurança: após 2 stops consecutivos reduzir risco 50%
        """
        evaluation = {
            'should_enter_safe_mode': False,
            'risk_reduction_factor': 1.0,
            'action_taken': 'none'
        }
        
        if result in ['LOSER', 'FALSE', 'STOP_LOSS']:
            self.consecutive_losses += 1
            logger.info(f"📉 [MONSTER V2] Perda registrada. Consecutivas: {self.consecutive_losses}")
            
            # MONSTER V2: após 2 stops consecutivos reduzir risco 50%
            if self.consecutive_losses >= 2:
                evaluation['risk_reduction_factor'] = 0.5
                evaluation['should_enter_safe_mode'] = True
                evaluation['action_taken'] = f'risk_reduced_50_percent_after_{self.consecutive_losses}_losses'
                logger.warning(f"🛡️ [MONSTER V2] MODO SEGURANÇA: {self.consecutive_losses} perdas - Risco reduzido 50%")
        else:
            self.consecutive_losses = 0
            evaluation['action_taken'] = 'losses_reset'
            logger.info("📈 [MONSTER V2] Trade positivo. Reset de perdas consecutivas.")
        
        return evaluation
    
    def evaluate_trade_result_intraday(self, result: str) -> Dict:
        """
        Avalia resultado do trade Intraday
        ✅ Modo defesa: após 3 stops seguidos, pausar 30min + ML > 65%
        """
        evaluation = {
            'should_pause_trading': False,
            'pause_duration_minutes': 0,
            'ml_threshold_increased': False,
            'action_taken': 'none'
        }
        
        if result in ['LOSER', 'FALSE', 'STOP_LOSS']:
            self.consecutive_losses += 1
            logger.info(f"📉 [INTRADAY] Perda registrada. Consecutivas: {self.consecutive_losses}")
            
            # INTRADAY: após 3 stops, pausar 30min e ML > 65%
            if self.consecutive_losses >= 3:
                evaluation['should_pause_trading'] = True
                evaluation['pause_duration_minutes'] = 30
                evaluation['ml_threshold_increased'] = True  # ML threshold para 65%
                evaluation['action_taken'] = f'trading_paused_30min_ml_65_after_{self.consecutive_losses}_losses'
                
                # Define quando o pause termina
                self.safe_mode_until = datetime.now() + timedelta(minutes=30)
                
                logger.warning(f"🛡️ [INTRADAY] MODO DEFESA: {self.consecutive_losses} perdas - Pausando 30min, ML > 65%")
        else:
            self.consecutive_losses = 0
            evaluation['action_taken'] = 'losses_reset'
            logger.info("📈 [INTRADAY] Trade positivo. Reset de perdas consecutivas.")
        
        return evaluation
    
    def evaluate_trade_result(self, result, agent_type="monster"):
        """
        Wrapper que escolhe o método de avaliação baseado no agente
        """
        if agent_type == "monster":
            return self.evaluate_trade_result_monster(result, agent_type)
        elif agent_type == "intraday":
            return self.evaluate_trade_result_intraday(result)
        else:
            return self.evaluate_trade_result_monster(result, "monster")
    
    def is_intraday_trading_paused(self) -> bool:
        """
        Verifica se o trading intraday está pausado
        """
        if self.safe_mode_until is None:
            return False
        
        is_paused = datetime.now() < self.safe_mode_until
        
        if not is_paused and self.safe_mode_until is not None:
            logger.info("✅ [INTRADAY] Período de pausa finalizado. Trading reativado.")
            self.safe_mode_until = None
        
        return is_paused
    
    def calculate_trailing_stop_monster(self, entry_price: float, current_price: float, 
                                      direction: str, atr: float, tp1_hit: bool, tp2_hit: bool) -> Optional[float]:
        """
        Trailing Stop para Monster V2
        ✅ Stop para break-even após TP1
        ✅ Trailing stop dinâmico 1×ATR após TP2
        """
        if not tp1_hit:
            return None  # Ainda não atingiu TP1
        
        direction_mult = 1 if direction == "BUY" else -1
        
        if tp1_hit and not tp2_hit:
            # Após TP1: move stop para break-even
            new_stop = entry_price
            logger.info(f"🎯 [MONSTER V2] TP1 atingido - Stop movido para break-even: {new_stop:.6f}")
            return new_stop
        
        elif tp2_hit:
            # Após TP2: trailing stop 1×ATR
            trailing_distance = atr * 1.0
            new_stop = current_price - (direction_mult * trailing_distance)
            logger.info(f"🎯 [MONSTER V2] TP2 atingido - Trailing stop 1×ATR: {new_stop:.6f}")
            return new_stop
        
        return None
    
    def calculate_trailing_stop_intraday(self, entry_price: float, current_price: float,
                                       direction: str, atr: float, tp1_hit: bool, tp2_hit: bool) -> Optional[float]:
        """
        Trailing Stop para Intraday
        ✅ Stop para break-even após TP1
        ✅ Trailing stop 0.8×ATR após TP2
        """
        if not tp1_hit:
            return None
        
        direction_mult = 1 if direction == "BUY" else -1
        
        if tp1_hit and not tp2_hit:
            # Após TP1: move stop para break-even
            new_stop = entry_price
            logger.info(f"🎯 [INTRADAY] TP1 atingido - Stop movido para break-even: {new_stop:.6f}")
            return new_stop
        
        elif tp2_hit:
            # Após TP2: trailing stop 0.8×ATR
            trailing_distance = atr * 0.8
            new_stop = current_price - (direction_mult * trailing_distance)
            logger.info(f"🎯 [INTRADAY] TP2 atingido - Trailing stop 0.8×ATR: {new_stop:.6f}")
            return new_stop
        
        return None
    
    def enter_safe_mode(self, duration_minutes=240):
        """
        Ativa modo seguro temporário
        """
        logger.warning(f"🛡️ MODO SEGURO ATIVO por {duration_minutes} minutos")
        # Aqui você implementaria a lógica para parar geração de sinais
        # por um período determinado
        return True

def calculate_atr_volatility(df, window=14):
    """
    Calcula volatilidade baseada em ATR
    """
    if len(df) < window:
        return 1.0
    
    atr_current = AverageTrueRange(df['high'], df['low'], df['close'], window=window).average_true_range().iloc[-1]
    atr_avg = AverageTrueRange(df['high'], df['low'], df['close'], window=window).average_true_range().rolling(50).mean().iloc[-1]
    
    return atr_current / atr_avg if atr_avg > 0 else 1.0

def detect_market_stress(df, volume_threshold=2.0, volatility_threshold=1.5):
    """
    Detecta stress do mercado baseado em volume e volatilidade
    """
    if len(df) < 20:
        return False
    
    # Volume spike
    current_vol = df['volume'].iloc[-1]
    avg_vol = df['volume'].rolling(20).mean().iloc[-1]
    volume_spike = current_vol / avg_vol if avg_vol > 0 else 1
    
    # Volatilidade extrema
    volatility = calculate_atr_volatility(df)
    
    is_stressed = volume_spike > volume_threshold or volatility > volatility_threshold
    
    if is_stressed:
        logger.warning(f"🚨 STRESS DO MERCADO detectado: Volume: {volume_spike:.2f}x, Volatilidade: {volatility:.2f}x")
    
    return is_stressed