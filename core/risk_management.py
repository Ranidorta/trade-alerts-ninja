# core/risk_management.py

import numpy as np
import pandas as pd
from ta.volatility import AverageTrueRange
from ta.trend import ADXIndicator
from utils.logger import logger

class DynamicRiskManager:
    def __init__(self, base_risk_per_trade=0.02):
        self.base_risk_per_trade = base_risk_per_trade
        self.consecutive_losses = 0
        self.max_consecutive_losses = 3
    
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
    
    def calculate_targets(self, entry_price, atr, direction, adx_value, symbol=""):
        """
        Calcula alvos dinâmicos baseados na força da tendência (ADX)
        """
        # Fator de ajuste baseado no ADX (força da tendência)
        adx_factor = min(adx_value / 40, 1.5)  # Limita o fator a 1.5x
        
        # Multiplicadores base para take profits
        tp_multipliers = [1.2, 2.0, 3.5]
        
        direction_mult = 1 if direction == "BUY" else -1
        
        # Calcula take profits com ajuste por ADX
        take_profits = []
        for mult in tp_multipliers:
            adjusted_mult = mult * (1 + adx_factor * 0.3)  # 30% de boost máximo
            tp = entry_price + (direction_mult * atr * adjusted_mult)
            take_profits.append(round(tp, 6))
        
        # Stop loss com ajuste por ADX (menos agressivo em tendências fortes)
        sl_mult = 1.8 - (adx_factor * 0.2)  # Reduz SL em tendências fortes
        stop_loss = entry_price - (direction_mult * atr * sl_mult)
        
        logger.info(f"🎯 [{symbol}] Alvos dinâmicos (ADX: {adx_value:.1f}, Fator: {adx_factor:.2f}):")
        logger.info(f"   TP1: {take_profits[0]}, TP2: {take_profits[1]}, TP3: {take_profits[2]}")
        logger.info(f"   SL: {round(stop_loss, 6)}")
        
        return take_profits, round(stop_loss, 6)
    
    def is_acceptable_volatility(self, atr_current, atr_avg):
        """
        Verifica se a volatilidade está em faixa aceitável
        """
        volatility_ratio = atr_current / atr_avg if atr_avg > 0 else 1
        is_acceptable = 0.5 <= volatility_ratio <= 1.5
        
        if not is_acceptable:
            logger.info(f"⚠️ Volatilidade fora da faixa: {volatility_ratio:.2f} (aceito: 0.5-1.5)")
        
        return is_acceptable
    
    def evaluate_trade_result(self, result):
        """
        Avalia resultado do trade e ajusta parâmetros
        """
        if result in ['LOSER', 'FALSE']:
            self.consecutive_losses += 1
            logger.info(f"📉 Perda registrada. Consecutivas: {self.consecutive_losses}")
        else:
            self.consecutive_losses = 0
            logger.info("📈 Trade positivo. Reset de perdas consecutivas.")
        
        # Ativa modo seguro após muitas perdas
        if self.consecutive_losses >= self.max_consecutive_losses:
            logger.warning(f"🚨 MODO SEGURO ATIVADO: {self.consecutive_losses} perdas consecutivas")
            return True  # Indica que deve entrar em modo seguro
        
        return False
    
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