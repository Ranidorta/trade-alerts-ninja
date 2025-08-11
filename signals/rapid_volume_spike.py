
"""
Rapid Volume Spike - Identificação rápida de fluxo institucional
Detecção de spikes de volume para Day Trade
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional
from utils.logger import logger

def calculate_volume_metrics(df: pd.DataFrame, window: int = 20) -> Dict:
    """
    Calcula métricas de volume para análise
    
    Args:
        df: DataFrame com dados OHLCV
        window: Janela para cálculo de médias
    
    Returns:
        dict: Métricas de volume calculadas
    """
    try:
        if len(df) < window:
            logger.warning(f"Dados insuficientes para cálculo de volume: {len(df)} < {window}")
            return {}
        
        volume = df['volume']
        current_volume = volume.iloc[-1]
        
        # Médias de volume
        sma_5 = volume.rolling(5).mean().iloc[-1]
        sma_20 = volume.rolling(window).mean().iloc[-1]
        sma_50 = volume.rolling(50).mean().iloc[-1] if len(df) >= 50 else sma_20
        
        # Volume spike ratios
        spike_ratio_5m = current_volume / sma_5 if sma_5 > 0 else 1
        spike_ratio_20m = current_volume / sma_20 if sma_20 > 0 else 1
        spike_ratio_50m = current_volume / sma_50 if sma_50 > 0 else 1
        
        # Volume trend (últimos 3 períodos)
        recent_volumes = volume.tail(3).values
        volume_trend = 'INCREASING' if all(recent_volumes[i] <= recent_volumes[i+1] for i in range(len(recent_volumes)-1)) else 'MIXED'
        
        return {
            'current_volume': current_volume,
            'sma_5': sma_5,
            'sma_20': sma_20,
            'sma_50': sma_50,
            'spike_ratio_5m': spike_ratio_5m,
            'spike_ratio_20m': spike_ratio_20m,
            'spike_ratio_50m': spike_ratio_50m,
            'volume_trend': volume_trend,
            'above_average': current_volume > sma_20
        }
        
    except Exception as e:
        logger.error(f"Erro no cálculo de métricas de volume: {e}")
        return {}

def rapid_volume_spike(current_volume: float, avg_volume_5m: float, threshold: float = 2.0) -> bool:
    """
    Detecta spike rápido de volume
    
    Args:
        current_volume: Volume atual
        avg_volume_5m: Média de volume 5 minutos
        threshold: Multiplicador para considerar spike (default: 2x)
    
    Returns:
        bool: True se detectou spike significativo
    """
    try:
        if avg_volume_5m <= 0:
            return False
        
        spike_ratio = current_volume / avg_volume_5m
        is_spike = spike_ratio > threshold
        
        logger.info(f"📊 Volume atual: {current_volume:.0f}, Média 5m: {avg_volume_5m:.0f}, Ratio: {spike_ratio:.2f}x, Spike: {is_spike}")
        
        return is_spike
        
    except Exception as e:
        logger.error(f"Erro na detecção de spike: {e}")
        return False

def analyze_volume_profile(df: pd.DataFrame) -> Dict:
    """
    Analisa perfil de volume para identificar pressão compradora/vendedora
    
    Args:
        df: DataFrame com dados OHLCV
    
    Returns:
        dict: Análise do perfil de volume
    """
    try:
        if len(df) < 10:
            return {}
        
        # Últimos 10 períodos
        recent_data = df.tail(10)
        
        # Volume em candles de alta vs baixa
        bullish_candles = recent_data[recent_data['close'] > recent_data['open']]
        bearish_candles = recent_data[recent_data['close'] < recent_data['open']]
        
        bullish_volume = bullish_candles['volume'].sum() if len(bullish_candles) > 0 else 0
        bearish_volume = bearish_candles['volume'].sum() if len(bearish_candles) > 0 else 0
        total_volume = bullish_volume + bearish_volume
        
        if total_volume == 0:
            return {}
        
        # Ratios de pressão
        bullish_pressure = bullish_volume / total_volume
        bearish_pressure = bearish_volume / total_volume
        
        # Determina dominância
        if bullish_pressure > 0.6:
            dominance = 'BULLISH'
        elif bearish_pressure > 0.6:
            dominance = 'BEARISH'
        else:
            dominance = 'NEUTRAL'
        
        return {
            'bullish_volume': bullish_volume,
            'bearish_volume': bearish_volume,
            'total_volume': total_volume,
            'bullish_pressure': bullish_pressure,
            'bearish_pressure': bearish_pressure,
            'dominance': dominance,
            'pressure_ratio': bullish_pressure / bearish_pressure if bearish_pressure > 0 else float('inf')
        }
        
    except Exception as e:
        logger.error(f"Erro na análise do perfil de volume: {e}")
        return {}

def validate_volume_support(df: pd.DataFrame, intended_direction: str) -> bool:
    """
    Valida se o volume suporta a direção pretendida do trade
    
    Args:
        df: DataFrame com dados
        intended_direction: 'BUY' ou 'SELL'
    
    Returns:
        bool: True se volume suporta a direção
    """
    try:
        metrics = calculate_volume_metrics(df)
        profile = analyze_volume_profile(df)
        
        if not metrics or not profile:
            logger.warning("Dados insuficientes para validação de volume")
            return False
        
        # Critérios básicos: volume acima da média
        volume_above_average = metrics.get('above_average', False)
        spike_detected = metrics.get('spike_ratio_5m', 1) > 1.5
        
        # Critérios direcionais
        dominance = profile.get('dominance', 'NEUTRAL')
        
        if intended_direction == 'BUY':
            directional_support = dominance in ['BULLISH', 'NEUTRAL']
            pressure_support = profile.get('bullish_pressure', 0) > 0.4
            
        elif intended_direction == 'SELL':
            directional_support = dominance in ['BEARISH', 'NEUTRAL']
            pressure_support = profile.get('bearish_pressure', 0) > 0.4
            
        else:
            return False
        
        # Validação final
        is_supported = volume_above_average and directional_support and pressure_support
        
        if spike_detected:
            is_supported = True  # Spike de volume sempre é relevante
        
        logger.info(f"📊 Volume - Acima média: {volume_above_average}, Spike: {spike_detected}, Dominância: {dominance}, Suporta {intended_direction}: {is_supported}")
        
        return is_supported
        
    except Exception as e:
        logger.error(f"Erro na validação de suporte de volume: {e}")
        return False

def get_institutional_flow_score(df: pd.DataFrame) -> float:
    """
    Calcula score de fluxo institucional baseado no volume (0.0 a 1.0)
    
    Returns:
        float: Score de fluxo institucional
    """
    try:
        metrics = calculate_volume_metrics(df)
        profile = analyze_volume_profile(df)
        
        if not metrics or not profile:
            return 0.0
        
        score = 0.0
        
        # Score baseado em spikes
        spike_5m = metrics.get('spike_ratio_5m', 1)
        if spike_5m > 3.0:
            score += 0.4
        elif spike_5m > 2.0:
            score += 0.3
        elif spike_5m > 1.5:
            score += 0.2
        
        # Score baseado na tendência de volume
        if metrics.get('volume_trend') == 'INCREASING':
            score += 0.2
        
        # Score baseado na dominância
        dominance = profile.get('dominance', 'NEUTRAL')
        if dominance != 'NEUTRAL':
            score += 0.2
            
            # Bonus para dominância forte
            pressure_ratio = profile.get('pressure_ratio', 1)
            if pressure_ratio > 2.0 or pressure_ratio < 0.5:
                score += 0.2
        
        return min(score, 1.0)
        
    except Exception as e:
        logger.error(f"Erro no cálculo do score institucional: {e}")
        return 0.0

def detect_volume_anomaly(df: pd.DataFrame) -> Dict:
    """
    Detecta anomalias de volume que podem indicar movimentos especiais
    
    Returns:
        dict: Informações sobre anomalias detectadas
    """
    try:
        metrics = calculate_volume_metrics(df)
        
        if not metrics:
            return {}
        
        anomalies = []
        severity = 0
        
        # Spike extremo
        if metrics.get('spike_ratio_5m', 1) > 5.0:
            anomalies.append('EXTREME_SPIKE')
            severity += 3
        
        # Volume muito baixo (possível manipulação)
        elif metrics.get('spike_ratio_20m', 1) < 0.3:
            anomalies.append('UNUSUAL_LOW_VOLUME')
            severity += 1
        
        # Volume crescente consistente
        if metrics.get('volume_trend') == 'INCREASING':
            anomalies.append('SUSTAINED_VOLUME_INCREASE')
            severity += 1
        
        return {
            'anomalies': anomalies,
            'severity': severity,
            'has_anomaly': len(anomalies) > 0,
            'is_critical': severity >= 3
        }
        
    except Exception as e:
        logger.error(f"Erro na detecção de anomalias: {e}")
        return {}
