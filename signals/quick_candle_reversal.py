
"""
Quick Candle Reversal - Detecção rápida de reversão por padrões de candles
Identifica padrões de reversão específicos para Day Trade
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional
from utils.logger import logger

def analyze_candle_pattern(candle: Dict) -> Dict:
    """
    Analisa padrão individual do candle
    
    Args:
        candle: Dict com 'open', 'high', 'low', 'close'
    
    Returns:
        dict: Análise detalhada do candle
    """
    try:
        o, h, l, c = candle['open'], candle['high'], candle['low'], candle['close']
        
        # Cálculos básicos
        body_size = abs(c - o)
        total_range = h - l
        upper_shadow = h - max(o, c)
        lower_shadow = min(o, c) - l
        
        if total_range == 0:
            return {'pattern': 'INVALID', 'strength': 0}
        
        # Ratios importantes
        body_ratio = body_size / total_range
        upper_shadow_ratio = upper_shadow / total_range
        lower_shadow_ratio = lower_shadow / total_range
        
        return {
            'body_size': body_size,
            'total_range': total_range,
            'body_ratio': body_ratio,
            'upper_shadow_ratio': upper_shadow_ratio,
            'lower_shadow_ratio': lower_shadow_ratio,
            'is_bullish': c > o,
            'is_bearish': c < o,
            'is_doji': body_ratio < 0.1
        }
        
    except Exception as e:
        logger.error(f"Erro na análise do candle: {e}")
        return {'pattern': 'ERROR', 'strength': 0}

def quick_candle_reversal(candle: Dict) -> str:
    """
    Detecta padrões de reversão rápida em candles individuais
    
    Args:
        candle: Dict com dados OHLC do candle
    
    Returns:
        str: Tipo de reversão detectada
    """
    try:
        analysis = analyze_candle_pattern(candle)
        
        if analysis['pattern'] in ['INVALID', 'ERROR']:
            return 'NEUTRAL'
        
        body_ratio = analysis['body_ratio']
        upper_shadow_ratio = analysis['upper_shadow_ratio']
        lower_shadow_ratio = analysis['lower_shadow_ratio']
        
        o, h, l, c = candle['open'], candle['high'], candle['low'], candle['close']
        
        # Hammer / Doji de fundo (Bullish Reversal)
        if (body_ratio < 0.3 and 
            lower_shadow_ratio > 0.5 and 
            upper_shadow_ratio < 0.2 and
            c > l + 0.7 * (h - l)):
            return 'BULLISH_REVERSAL'
        
        # Shooting Star / Doji de topo (Bearish Reversal)
        elif (body_ratio < 0.3 and 
              upper_shadow_ratio > 0.5 and 
              lower_shadow_ratio < 0.2 and
              c < l + 0.3 * (h - l)):
            return 'BEARISH_REVERSAL'
        
        # Engulfing Bullish simples (precisa do candle anterior)
        elif analysis['is_bullish'] and body_ratio > 0.7:
            return 'STRONG_BULLISH'
        
        # Engulfing Bearish simples
        elif analysis['is_bearish'] and body_ratio > 0.7:
            return 'STRONG_BEARISH'
        
        # Doji (indecisão)
        elif analysis['is_doji']:
            return 'DOJI_INDECISION'
        
        return 'NEUTRAL'
        
    except Exception as e:
        logger.error(f"Erro na detecção de reversão: {e}")
        return 'NEUTRAL'

def analyze_multi_candle_pattern(df: pd.DataFrame, lookback: int = 3) -> Dict:
    """
    Analisa padrões de múltiplos candles para reversões
    
    Args:
        df: DataFrame com dados OHLCV
        lookback: Número de candles para analisar
    
    Returns:
        dict: Padrões detectados
    """
    try:
        if len(df) < lookback:
            return {'pattern': 'INSUFFICIENT_DATA', 'strength': 0}
        
        recent_candles = df.tail(lookback)
        patterns = []
        
        for i, (_, candle) in enumerate(recent_candles.iterrows()):
            candle_dict = {
                'open': candle['open'],
                'high': candle['high'], 
                'low': candle['low'],
                'close': candle['close']
            }
            pattern = quick_candle_reversal(candle_dict)
            patterns.append(pattern)
        
        # Detecta padrões compostos
        if len(patterns) >= 2:
            last_two = patterns[-2:]
            
            # Duas reversões bullish consecutivas
            if all('BULLISH' in p for p in last_two):
                return {'pattern': 'STRONG_BULLISH_MOMENTUM', 'strength': 0.8}
            
            # Duas reversões bearish consecutivas  
            elif all('BEARISH' in p for p in last_two):
                return {'pattern': 'STRONG_BEARISH_MOMENTUM', 'strength': 0.8}
            
            # Indecisão seguida de direção
            elif 'DOJI' in last_two[0] and 'BULLISH' in last_two[1]:
                return {'pattern': 'BULLISH_BREAKOUT', 'strength': 0.7}
            
            elif 'DOJI' in last_two[0] and 'BEARISH' in last_two[1]:
                return {'pattern': 'BEARISH_BREAKOUT', 'strength': 0.7}
        
        # Padrão do último candle
        last_pattern = patterns[-1] if patterns else 'NEUTRAL'
        strength = 0.6 if 'REVERSAL' in last_pattern else 0.3
        
        return {'pattern': last_pattern, 'strength': strength}
        
    except Exception as e:
        logger.error(f"Erro na análise multi-candle: {e}")
        return {'pattern': 'ERROR', 'strength': 0}

def validate_reversal_signal(df: pd.DataFrame, intended_direction: str) -> bool:
    """
    Valida se padrões de candle suportam a direção pretendida
    
    Args:
        df: DataFrame com dados
        intended_direction: 'BUY' ou 'SELL'
    
    Returns:
        bool: True se padrões suportam a direção
    """
    try:
        pattern_analysis = analyze_multi_candle_pattern(df)
        pattern = pattern_analysis.get('pattern', 'NEUTRAL')
        strength = pattern_analysis.get('strength', 0)
        
        # Para sinais de compra
        if intended_direction == 'BUY':
            bullish_patterns = [
                'BULLISH_REVERSAL', 'STRONG_BULLISH', 
                'STRONG_BULLISH_MOMENTUM', 'BULLISH_BREAKOUT'
            ]
            is_supported = any(bp in pattern for bp in bullish_patterns)
            
        # Para sinais de venda
        elif intended_direction == 'SELL':
            bearish_patterns = [
                'BEARISH_REVERSAL', 'STRONG_BEARISH',
                'STRONG_BEARISH_MOMENTUM', 'BEARISH_BREAKOUT'
            ]
            is_supported = any(bp in pattern for bp in bearish_patterns)
            
        else:
            return False
        
        # Requer força mínima
        min_strength_required = 0.5
        final_validation = is_supported and strength >= min_strength_required
        
        logger.info(f"🕯️ Padrão: {pattern}, Força: {strength:.2f}, Suporta {intended_direction}: {final_validation}")
        
        return final_validation
        
    except Exception as e:
        logger.error(f"Erro na validação de reversão: {e}")
        return False

def get_candle_reversal_score(df: pd.DataFrame) -> float:
    """
    Calcula score de qualidade dos padrões de candle (0.0 a 1.0)
    
    Returns:
        float: Score de qualidade dos padrões
    """
    try:
        pattern_analysis = analyze_multi_candle_pattern(df)
        base_strength = pattern_analysis.get('strength', 0)
        
        # Análise do último candle
        if len(df) > 0:
            last_candle = {
                'open': df['open'].iloc[-1],
                'high': df['high'].iloc[-1],
                'low': df['low'].iloc[-1], 
                'close': df['close'].iloc[-1]
            }
            
            candle_analysis = analyze_candle_pattern(last_candle)
            
            # Bonus para candles com bom body ratio
            if 0.3 <= candle_analysis.get('body_ratio', 0) <= 0.8:
                base_strength += 0.1
            
            # Bonus para candles definitivos (não doji)
            if not candle_analysis.get('is_doji', True):
                base_strength += 0.1
        
        return min(base_strength, 1.0)
        
    except Exception as e:
        logger.error(f"Erro no cálculo do score de candle: {e}")
        return 0.0
