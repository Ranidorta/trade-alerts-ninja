
"""
Quick Timeframe Validation - Validação rápida com EMA Cross em 1m/5m
Módulo complementar para aumentar assertividade em Day Trade
"""

import pandas as pd
import numpy as np
from ta.trend import EMAIndicator
from utils.logger import logger

def calculate_ema_cross(df, fast_period=9, slow_period=21):
    """
    Calcula EMA cross para timeframes rápidos
    
    Args:
        df: DataFrame com dados OHLCV
        fast_period: Período da EMA rápida (default: 9)
        slow_period: Período da EMA lenta (default: 21)
    
    Returns:
        dict: Informações sobre o cross das EMAs
    """
    if len(df) < slow_period:
        return None
    
    try:
        ema_fast = EMAIndicator(close=df['close'], window=fast_period).ema_indicator()
        ema_slow = EMAIndicator(close=df['close'], window=slow_period).ema_indicator()
        
        current_fast = ema_fast.iloc[-1]
        current_slow = ema_slow.iloc[-1]
        prev_fast = ema_fast.iloc[-2]
        prev_slow = ema_slow.iloc[-2]
        
        # Detecta crossover
        bullish_cross = (current_fast > current_slow) and (prev_fast <= prev_slow)
        bearish_cross = (current_fast < current_slow) and (prev_fast >= prev_slow)
        
        return {
            'ema_fast': current_fast,
            'ema_slow': current_slow,
            'trend': short_term_trend(current_fast, current_slow),
            'bullish_cross': bullish_cross,
            'bearish_cross': bearish_cross,
            'cross_strength': abs(current_fast - current_slow) / current_slow
        }
        
    except Exception as e:
        logger.error(f"Erro ao calcular EMA cross: {e}")
        return None

def short_term_trend(ema_fast, ema_slow):
    """
    Determina tendência de curto prazo baseada nas EMAs
    
    Args:
        ema_fast: Valor da EMA rápida
        ema_slow: Valor da EMA lenta
    
    Returns:
        str: Direção da tendência ('UP', 'DOWN', 'NEUTRAL')
    """
    if ema_fast > ema_slow:
        return 'UP'
    elif ema_fast < ema_slow:
        return 'DOWN'
    else:
        return 'NEUTRAL'

def validate_quick_trend_alignment(df_1m, df_5m, required_direction):
    """
    Valida alinhamento de tendência em timeframes rápidos
    
    Args:
        df_1m: DataFrame 1 minuto
        df_5m: DataFrame 5 minutos
        required_direction: Direção necessária ('BUY' ou 'SELL')
    
    Returns:
        bool: True se tendência está alinhada
    """
    try:
        ema_1m = calculate_ema_cross(df_1m)
        ema_5m = calculate_ema_cross(df_5m)
        
        if not ema_1m or not ema_5m:
            return False
        
        trend_1m = ema_1m['trend']
        trend_5m = ema_5m['trend']
        
        if required_direction == 'BUY':
            alignment = (trend_1m == 'UP' and trend_5m == 'UP')
        elif required_direction == 'SELL':
            alignment = (trend_1m == 'DOWN' and trend_5m == 'DOWN')
        else:
            return False
        
        logger.info(f"🔄 Tendência rápida: 1m={trend_1m}, 5m={trend_5m}, Alinhada={alignment}")
        return alignment
        
    except Exception as e:
        logger.error(f"Erro na validação de tendência rápida: {e}")
        return False

def get_ema_cross_signal_strength(df):
    """
    Calcula força do sinal baseado no cross das EMAs
    
    Returns:
        float: Força do sinal (0.0 a 1.0)
    """
    try:
        ema_data = calculate_ema_cross(df)
        if not ema_data:
            return 0.0
        
        base_strength = 0.5
        
        # Aumenta força se houve cross recente
        if ema_data['bullish_cross'] or ema_data['bearish_cross']:
            base_strength += 0.3
        
        # Aumenta força baseado na separação das EMAs
        if ema_data['cross_strength'] > 0.01:  # 1% de separação
            base_strength += 0.2
        
        return min(base_strength, 1.0)
        
    except Exception as e:
        logger.error(f"Erro ao calcular força do sinal EMA: {e}")
        return 0.0
