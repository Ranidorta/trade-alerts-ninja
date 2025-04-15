"""
Risk management utility functions with enhanced features.
"""

import pandas as pd
import numpy as np
from ta.volatility import AverageTrueRange
import logging

logger = logging.getLogger(__name__)

# --- CORE FUNCTIONS (MANTIDAS) ---
def calculate_atr(df, window=14):
    """Calcula ATR sem alterações"""
    df_copy = df.copy()
    atr_indicator = AverageTrueRange(
        high=df_copy['high'], 
        low=df_copy['low'], 
        close=df_copy['close'], 
        window=window
    )
    df_copy['atr'] = atr_indicator.average_true_range()
    return df_copy

def calculate_position_size(capital, risk_percentage, entry_price, stop_loss):
    """Mantido igual"""
    risk_amount = capital * (risk_percentage / 100)
    stop_distance = max(abs(entry_price - stop_loss), 0.0001)
    return risk_amount / stop_distance

def risk_reward_ratio(entry_price, take_profit, stop_loss):
    """Mantido igual"""
    reward = abs(take_profit - entry_price)
    risk = max(abs(entry_price - stop_loss), 0.0001)
    return reward / risk

# --- NEW FEATURES ---
def validate_spread(entry_price: float, bid: float, ask: float, max_pct: float = 0.1) -> bool:
    """Valida se o spread está dentro do limite aceitável"""
    spread_pct = ((ask - bid) / entry_price) * 100
    if spread_pct > max_pct:
        logger.warning(f"Spread {spread_pct:.2f}% excede limite de {max_pct}%")
        return False
    return True

def calculate_liquidity_score(df: pd.DataFrame, window: int = 20) -> float:
    """Calcula score de liquidez baseado no volume relativo"""
    mean_volume = df['volume'].rolling(window).mean().iloc[-1]
    return mean_volume / df['volume'].mean() if df['volume'].mean() > 0 else 0

def dynamic_sl_multiplier(atr: float, price: float, base_multiplier: float = 2.0) -> float:
    """Ajusta dinamicamente o multiplicador do ATR"""
    volatility_pct = (atr / price) * 100
    if volatility_pct > 5:  # Alta volatilidade
        return base_multiplier * 0.75
    elif volatility_pct < 1:  # Baixa volatilidade
        return base_multiplier * 1.25
    return base_multiplier

def calculate_stop_loss(df, atr_multiplier=2, mode='fixed'):
    """Versão aprimorada com suporte a modo dinâmico"""
    df_copy = df.copy()
    if 'atr' not in df_copy.columns:
        df_copy = calculate_atr(df_copy)
    
    close = df_copy['close'].iloc[-1]
    atr = df_copy['atr'].iloc[-1]
    
    # Modo dinâmico
    if isinstance(atr_multiplier, str) and atr_multiplier.lower() == 'auto':
        atr_multiplier = dynamic_sl_multiplier(atr, close)
    
    sl = close - (atr * atr_multiplier)
    tp1 = close + (atr * atr_multiplier)
    tp2 = close + (atr * atr_multiplier * 2)
    tp3 = close + (atr * atr_multiplier * 3)
    
    return pd.DataFrame({
        'timestamp': [df_copy.index[-1]],
        'close': [close],
        'atr': [atr],
        'stop_loss': [sl],
        'take_profit_1': [tp1],
        'take_profit_2': [tp2],
        'take_profit_3': [tp3]
    })
