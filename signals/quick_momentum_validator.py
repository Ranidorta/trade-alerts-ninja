
"""
Quick Momentum Validator - Validação rápida de momentum com RSI, VWAP e Stochastics
Análise de momentum intradiário para Day Trade
"""

import pandas as pd
import numpy as np
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.volume import VolumWeightedAveragePrice
from typing import Dict, Optional
from utils.logger import logger

def calculate_vwap(df: pd.DataFrame) -> Optional[float]:
    """
    Calcula VWAP (Volume Weighted Average Price)
    
    Args:
        df: DataFrame com dados OHLCV
    
    Returns:
        float: Valor atual do VWAP
    """
    try:
        if len(df) < 10:
            return None
        
        # Usando a biblioteca ta
        vwap_indicator = VolumWeightedAveragePrice(
            high=df['high'],
            low=df['low'], 
            close=df['close'],
            volume=df['volume']
        )
        
        vwap_values = vwap_indicator.volume_weighted_average_price()
        return vwap_values.iloc[-1] if not vwap_values.empty else None
        
    except Exception as e:
        logger.error(f"Erro no cálculo do VWAP: {e}")
        return None

def calculate_stochastic(df: pd.DataFrame, k_period: int = 14, d_period: int = 3) -> Dict:
    """
    Calcula Stochastic Oscillator
    
    Args:
        df: DataFrame com dados OHLCV
        k_period: Período para %K
        d_period: Período para %D
    
    Returns:
        dict: Valores de %K e %D
    """
    try:
        if len(df) < k_period + d_period:
            return {}
        
        stoch = StochasticOscillator(
            high=df['high'],
            low=df['low'],
            close=df['close'],
            window=k_period,
            smooth_window=d_period
        )
        
        stoch_k = stoch.stoch()
        stoch_d = stoch.stoch_signal()
        
        return {
            'stoch_k': stoch_k.iloc[-1],
            'stoch_d': stoch_d.iloc[-1],
            'k_above_d': stoch_k.iloc[-1] > stoch_d.iloc[-1],
            'k_below_d': stoch_k.iloc[-1] < stoch_d.iloc[-1],
            'oversold': stoch_k.iloc[-1] < 20,
            'overbought': stoch_k.iloc[-1] > 80
        }
        
    except Exception as e:
        logger.error(f"Erro no cálculo do Stochastic: {e}")
        return {}

def quick_momentum_entry(price: float, vwap: float, rsi_5: float, stochastic_k: float, stochastic_d: float) -> str:
    """
    Determina sinal de entrada baseado em momentum rápido
    
    Args:
        price: Preço atual
        vwap: VWAP atual
        rsi_5: RSI de 5 períodos
        stochastic_k: Valor %K do Stochastic
        stochastic_d: Valor %D do Stochastic
    
    Returns:
        str: Sinal de entrada ('LONG', 'SHORT', 'NEUTRAL')
    """
    try:
        # Condições para LONG
        if (price > vwap and 
            rsi_5 > 55 and 
            stochastic_k > stochastic_d and 
            stochastic_k < 80):
            return 'LONG'
        
        # Condições para SHORT
        elif (price < vwap and 
              rsi_5 < 45 and 
              stochastic_k < stochastic_d and 
              stochastic_k > 20):
            return 'SHORT'
        
        else:
            return 'NEUTRAL'
            
    except Exception as e:
        logger.error(f"Erro na análise de momentum: {e}")
        return 'NEUTRAL'

def analyze_momentum_confluence(df: pd.DataFrame) -> Dict:
    """
    Analisa confluência de indicadores de momentum
    
    Args:
        df: DataFrame com dados OHLCV
    
    Returns:
        dict: Análise completa de momentum
    """
    try:
        if len(df) < 20:
            return {}
        
        current_price = df['close'].iloc[-1]
        
        # Calcula indicadores
        vwap = calculate_vwap(df)
        
        # RSI rápido (5 períodos)
        rsi_5 = RSIIndicator(close=df['close'], window=5).rsi().iloc[-1]
        
        # RSI padrão (14 períodos)
        rsi_14 = RSIIndicator(close=df['close'], window=14).rsi().iloc[-1]
        
        # Stochastic
        stoch_data = calculate_stochastic(df)
        
        if not vwap or not stoch_data:
            return {}
        
        stoch_k = stoch_data['stoch_k']
        stoch_d = stoch_data['stoch_d']
        
        # Sinal principal
        primary_signal = quick_momentum_entry(current_price, vwap, rsi_5, stoch_k, stoch_d)
        
        # Análise de confluência
        bullish_factors = 0
        bearish_factors = 0
        
        # VWAP
        if current_price > vwap:
            bullish_factors += 1
        else:
            bearish_factors += 1
        
        # RSI 5
        if rsi_5 > 50:
            bullish_factors += 1
        else:
            bearish_factors += 1
        
        # RSI 14
        if rsi_14 > 50:
            bullish_factors += 1
        else:
            bearish_factors += 1
        
        # Stochastic
        if stoch_k > stoch_d:
            bullish_factors += 1
        else:
            bearish_factors += 1
        
        # Nível do Stochastic
        if stoch_k < 80 and stoch_k > 20:  # Zona neutra
            if stoch_k > 50:
                bullish_factors += 1
            else:
                bearish_factors += 1
        
        # Confluência final
        total_factors = bullish_factors + bearish_factors
        bullish_confluence = bullish_factors / total_factors if total_factors > 0 else 0
        bearish_confluence = bearish_factors / total_factors if total_factors > 0 else 0
        
        return {
            'current_price': current_price,
            'vwap': vwap,
            'rsi_5': rsi_5,
            'rsi_14': rsi_14,
            'stoch_k': stoch_k,
            'stoch_d': stoch_d,
            'primary_signal': primary_signal,
            'bullish_factors': bullish_factors,
            'bearish_factors': bearish_factors,
            'bullish_confluence': bullish_confluence,
            'bearish_confluence': bearish_confluence,
            'strong_confluence': max(bullish_confluence, bearish_confluence) >= 0.7
        }
        
    except Exception as e:
        logger.error(f"Erro na análise de confluência: {e}")
        return {}

def validate_momentum_alignment(df: pd.DataFrame, intended_direction: str) -> bool:
    """
    Valida se momentum está alinhado com a direção pretendida
    
    Args:
        df: DataFrame com dados
        intended_direction: 'BUY' ou 'SELL'
    
    Returns:
        bool: True se momentum suporta a direção
    """
    try:
        analysis = analyze_momentum_confluence(df)
        
        if not analysis:
            logger.warning("Dados insuficientes para análise de momentum")
            return False
        
        primary_signal = analysis.get('primary_signal', 'NEUTRAL')
        strong_confluence = analysis.get('strong_confluence', False)
        bullish_confluence = analysis.get('bullish_confluence', 0)
        bearish_confluence = analysis.get('bearish_confluence', 0)
        
        # Para sinais de compra
        if intended_direction == 'BUY':
            signal_match = primary_signal == 'LONG'
            confluence_support = bullish_confluence >= 0.6
            
        # Para sinais de venda
        elif intended_direction == 'SELL':
            signal_match = primary_signal == 'SHORT'
            confluence_support = bearish_confluence >= 0.6
            
        else:
            return False
        
        # Requer tanto sinal quanto confluência
        is_aligned = signal_match and confluence_support
        
        logger.info(f"🚀 Momentum - Sinal: {primary_signal}, Bull: {bullish_confluence:.2f}, Bear: {bearish_confluence:.2f}, Confluência forte: {strong_confluence}, Alinhado {intended_direction}: {is_aligned}")
        
        return is_aligned
        
    except Exception as e:
        logger.error(f"Erro na validação de momentum: {e}")
        return False

def get_momentum_score(df: pd.DataFrame) -> float:
    """
    Calcula score de qualidade do momentum (0.0 a 1.0)
    
    Returns:
        float: Score de momentum
    """
    try:
        analysis = analyze_momentum_confluence(df)
        
        if not analysis:
            return 0.0
        
        score = 0.0
        
        # Score baseado na confluência
        max_confluence = max(
            analysis.get('bullish_confluence', 0),
            analysis.get('bearish_confluence', 0)
        )
        score += max_confluence * 0.5
        
        # Score baseado na força do sinal
        if analysis.get('strong_confluence', False):
            score += 0.3
        
        # Score baseado nos níveis dos indicadores
        rsi_5 = analysis.get('rsi_5', 50)
        stoch_k = analysis.get('stoch_k', 50)
        
        # Bonus para RSI em zona favorável (não extremo)
        if 30 <= rsi_5 <= 70:
            score += 0.1
        
        # Bonus para Stochastic em zona favorável
        if 20 <= stoch_k <= 80:
            score += 0.1
        
        return min(score, 1.0)
        
    except Exception as e:
        logger.error(f"Erro no cálculo do score de momentum: {e}")
        return 0.0

def get_vwap_distance_ratio(df: pd.DataFrame) -> float:
    """
    Calcula a distância do preço em relação ao VWAP
    
    Returns:
        float: Ratio de distância (positivo = acima, negativo = abaixo)
    """
    try:
        if len(df) == 0:
            return 0.0
        
        current_price = df['close'].iloc[-1]
        vwap = calculate_vwap(df)
        
        if not vwap or vwap == 0:
            return 0.0
        
        distance_ratio = (current_price - vwap) / vwap
        return distance_ratio
        
    except Exception as e:
        logger.error(f"Erro no cálculo da distância VWAP: {e}")
        return 0.0
