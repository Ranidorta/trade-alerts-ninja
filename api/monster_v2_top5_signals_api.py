"""
Monster v2 Top5 Signals API - Sistema de Geração dos Top 5 Sinais
Objetivo: Escanear 10 pares mais líquidos e retornar apenas os 5 com maior score
"""

from flask import Blueprint, jsonify, request
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import traceback
import requests

# Import our data services
from api.fetch_data import fetch_data, get_current_price
from api.market_data_service import market_data_service

# Create blueprint for monster v2 top5 signals
monster_v2_top5_api = Blueprint('monster_v2_top5', __name__)

logger = logging.getLogger("MonsterV2Top5API")

# Top 10 most liquid pairs
TOP_10_LIQUID_PAIRS = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'USDCUSDT', 'CAMPUSDT', 
    'XRPUSDT', 'DOGEUSDT', 'SOMIUSDT', 'PEPEUSDT', 'AVAXUSDT'
]

# ============================================================================
# MONSTER V2 TOP5 TECHNICAL INDICATORS (same as Monster v2 Ajustado)
# ============================================================================

def calculate_ema(data, window):
    """Calculate Exponential Moving Average"""
    return data.ewm(span=window, adjust=False).mean()

def calculate_sma(data, window):
    """Calculate Simple Moving Average"""
    return data.rolling(window=window).mean()

def calculate_rsi(data, window=14):
    """Calculate RSI indicator with proper handling"""
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_atr(high, low, close, window=14):
    """Calculate Average True Range for dynamic risk management"""
    tr1 = high - low
    tr2 = abs(high - close.shift())
    tr3 = abs(low - close.shift())
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=window).mean()
    return atr

def calculate_vwap(df, window=50):
    """Calculate Volume Weighted Average Price"""
    if len(df) < window:
        window = len(df)
    
    volume = df['volume'].rolling(window=window).sum()
    vwap = (df['close'] * df['volume']).rolling(window=window).sum() / volume
    return vwap

def calculate_adx(df, window=14):
    """Calculate ADX (Average Directional Index)"""
    if len(df) < window + 1:
        return 25.0
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    # Calculate True Range
    tr1 = high - low
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    
    # Calculate DM+ and DM-
    dm_plus = high.diff()
    dm_minus = low.diff() * -1
    
    dm_plus[dm_plus < 0] = 0
    dm_minus[dm_minus < 0] = 0
    
    # Calculate smoothed values
    tr_smooth = tr.rolling(window=window).mean()
    dm_plus_smooth = dm_plus.rolling(window=window).mean()
    dm_minus_smooth = dm_minus.rolling(window=window).mean()
    
    # Calculate DI+ and DI-
    di_plus = (dm_plus_smooth / tr_smooth) * 100
    di_minus = (dm_minus_smooth / tr_smooth) * 100
    
    # Calculate ADX
    dx = abs(di_plus - di_minus) / (di_plus + di_minus) * 100
    adx = dx.rolling(window=window).mean()
    
    return adx.iloc[-1] if not adx.empty else 25.0

# ============================================================================
# MONSTER V2 TOP5 SCORING SYSTEM
# ============================================================================

def calculate_confidence_score(analysis_results):
    """
    Calculate confidence score (0-100) based on Monster v2 Top5 criteria:
    - Direção EMA200 correta: +15
    - RSI válido: +15
    - Volume ≥1,2×: +10 (≥1,5×: +15)
    - VWAP/POC confirmados: +15
    - ADX ≥20: +10
    - SL/TP definidos via ATR: +10
    - ML ≥50%: +10 (≥60%: +15)
    Total = até 100 pontos
    """
    score = 0
    
    # EMA200 direction correct
    if analysis_results.get('ema200_valid', False):
        score += 15
        logger.info("✅ EMA200 direção correta: +15 pontos")
    
    # RSI valid
    if analysis_results.get('rsi_valid', False):
        score += 15
        logger.info("✅ RSI válido: +15 pontos")
    
    # Volume confirmation
    volume_ratio = analysis_results.get('volume_ratio', 0)
    if volume_ratio >= 1.5:
        score += 15
        logger.info("✅ Volume ≥1.5×: +15 pontos")
    elif volume_ratio >= 1.2:
        score += 10
        logger.info("✅ Volume ≥1.2×: +10 pontos")
    
    # VWAP/POC confirmed
    if (analysis_results.get('vwap_confirmed', False) and 
        analysis_results.get('poc_breakout', False)):
        score += 15
        logger.info("✅ VWAP/POC confirmados: +15 pontos")
    
    # ADX ≥20
    if analysis_results.get('adx_strong', False):
        score += 10
        logger.info("✅ ADX ≥20: +10 pontos")
    
    # SL/TP defined via ATR
    if analysis_results.get('atr_levels_defined', False):
        score += 10
        logger.info("✅ SL/TP via ATR: +10 pontos")
    
    # ML confidence
    ml_confidence = analysis_results.get('ml_confidence', 0)
    if ml_confidence >= 0.60:
        score += 15
        logger.info("✅ ML ≥60%: +15 pontos")
    elif ml_confidence >= 0.50:
        score += 10
        logger.info("✅ ML ≥50%: +10 pontos")
    
    return min(score, 100)  # Cap at 100

def check_ema200_trend(df_15m):
    """EMA200 (15m): direção da tendência"""
    if len(df_15m) < 200:
        return None, False
    
    ema_200 = calculate_ema(df_15m['close'], 200).iloc[-1]
    current_price = df_15m['close'].iloc[-1]
    
    if current_price > ema_200:
        return "LONG", True
    elif current_price < ema_200:
        return "SHORT", True
    
    return None, False

def check_rsi_conditions(df_15m, direction, market_context="neutral"):
    """RSI (14): Long 25-40, Short 60-75"""
    rsi = calculate_rsi(df_15m['close'], window=14).iloc[-1]
    
    if direction == "LONG":
        if market_context == "bull":
            valid = rsi >= 40 and rsi <= 75
        else:
            valid = rsi >= 25 and rsi <= 40
        return valid, rsi
    
    elif direction == "SHORT":
        if market_context == "bear":
            valid = rsi <= 60 and rsi >= 25
        else:
            valid = rsi >= 60 and rsi <= 75
        return valid, rsi
    
    return False, rsi

def check_volume_conditions(df_15m):
    """Volume: candle atual ≥1.2× SMA(20)"""
    if len(df_15m) < 20:
        return False, 1.0, False
    
    current_volume = df_15m['volume'].iloc[-1]
    sma_20_volume = calculate_sma(df_15m['volume'], 20).iloc[-1]
    
    volume_ratio = current_volume / sma_20_volume if sma_20_volume > 0 else 1.0
    volume_confirmed = volume_ratio >= 1.2
    volume_boost = volume_ratio >= 1.5
    
    return volume_confirmed, volume_ratio, volume_boost

def check_vwap_conditions(df_15m, direction):
    """VWAP (50): Long acima, Short abaixo"""
    if len(df_15m) < 50:
        return False
    
    vwap_50 = calculate_vwap(df_15m, 50).iloc[-1]
    current_price = df_15m['close'].iloc[-1]
    
    if direction == "LONG":
        return current_price > vwap_50
    elif direction == "SHORT":
        return current_price < vwap_50
    
    return False

def check_volume_profile_poc(df_15m):
    """Volume Profile POC: validar rompimento de ±0.2%"""
    if len(df_15m) < 50:
        return False
    
    vwap = calculate_vwap(df_15m, 50).iloc[-1]
    current_price = df_15m['close'].iloc[-1]
    
    breakout_threshold = 0.002  # 0.2%
    poc_breakout = abs(current_price - vwap) / vwap > breakout_threshold
    
    return poc_breakout

def check_adx_strength(df_15m):
    """ADX (14): mínimo 20"""
    adx_value = calculate_adx(df_15m, 14)
    return adx_value >= 20, adx_value

def get_ml_confidence_top5(df_15m, rsi, atr, volume_ratio, adx_value):
    """ML: ≥50% confiança mínima"""
    try:
        # Import real ML predictor if available
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from ml.ml_predictor import predict_signal_quality, get_prediction_confidence
        
        current_candle = df_15m.iloc[-1]
        body_ratio = abs(current_candle['close'] - current_candle['open']) / (current_candle['high'] - current_candle['low']) if (current_candle['high'] - current_candle['low']) > 0 else 0.5
        
        signal_features = {
            'rsi': rsi,
            'adx': adx_value,
            'volume_ratio': volume_ratio,
            'candle_body_ratio': body_ratio
        }
        
        ml_prediction = predict_signal_quality(signal_features)
        confidence_scores = get_prediction_confidence(signal_features)
        
        if confidence_scores:
            max_confidence = max(confidence_scores.values())
            
            if ml_prediction in ['WINNER', 'PARTIAL'] and max_confidence >= 0.50:
                return max_confidence
            else:
                return 0.0
        else:
            return 0.60
            
    except (ImportError, Exception) as e:
        logger.warning(f"⚠️ ML não disponível para {df_15m.iloc[-1].name if not df_15m.empty else 'symbol'}, usando fallback técnico")
        return calculate_technical_confidence_top5(rsi, volume_ratio, adx_value)

def calculate_technical_confidence_top5(rsi, volume_ratio, adx_value):
    """Fallback técnico para confiança"""
    confidence = 0.50
    
    # RSI factor
    if 25 <= rsi <= 75:
        confidence += 0.08
    if (25 <= rsi <= 40) or (60 <= rsi <= 75):
        confidence += 0.12
    
    # Volume factor
    if volume_ratio >= 1.5:
        confidence += 0.15
    elif volume_ratio >= 1.2:
        confidence += 0.10
    
    # ADX factor
    if adx_value >= 25:
        confidence += 0.10
    elif adx_value >= 20:
        confidence += 0.05
    
    return min(confidence, 0.95)

def calculate_monster_top5_levels(entry_price, atr, direction):
    """ATR (14): SL=1.2×ATR, TP1=1.5×ATR, TP2=2.0×ATR, TP3=3.0×ATR"""
    direction_mult = 1 if direction == "LONG" else -1
    
    sl = entry_price - (direction_mult * atr * 1.2)
    tp1 = entry_price + (direction_mult * atr * 1.5)
    tp2 = entry_price + (direction_mult * atr * 2.0)
    tp3 = entry_price + (direction_mult * atr * 3.0)
    
    return sl, tp1, tp2, tp3

def analyze_symbol_for_top5(symbol):
    """
    Analyze a single symbol for Monster v2 Top5
    Returns analysis results with confidence score
    """
    try:
        logger.info(f"🎯 [MONSTER V2 TOP5] Analyzing {symbol}...")
        
        # Get current market price
        current_price = get_current_price(symbol)
        if current_price == 0:
            logger.warning(f"Could not get current price for {symbol}")
            return None
        
        # Fetch 15m data
        df_15m = fetch_data(symbol, "15", limit=250)
        if df_15m.empty:
            logger.warning(f"Insufficient 15m data for {symbol}")
            return None
        
        analysis_results = {}
        
        # Step 1: EMA200 trend
        direction, ema200_valid = check_ema200_trend(df_15m)
        if direction is None:
            return None
        
        analysis_results['direction'] = direction
        analysis_results['ema200_valid'] = ema200_valid
        
        # Step 2: RSI conditions
        rsi_valid, rsi_value = check_rsi_conditions(df_15m, direction)
        analysis_results['rsi_valid'] = rsi_valid
        analysis_results['rsi_value'] = rsi_value
        
        # Step 3: Volume conditions
        volume_confirmed, volume_ratio, volume_boost = check_volume_conditions(df_15m)
        analysis_results['volume_confirmed'] = volume_confirmed
        analysis_results['volume_ratio'] = volume_ratio
        analysis_results['volume_boost'] = volume_boost
        
        # Step 4: VWAP conditions
        vwap_confirmed = check_vwap_conditions(df_15m, direction)
        analysis_results['vwap_confirmed'] = vwap_confirmed
        
        # Step 5: Volume Profile POC
        poc_breakout = check_volume_profile_poc(df_15m)
        analysis_results['poc_breakout'] = poc_breakout
        
        # Step 6: ADX strength
        adx_strong, adx_value = check_adx_strength(df_15m)
        analysis_results['adx_strong'] = adx_strong
        analysis_results['adx_value'] = adx_value
        
        # Step 7: ATR levels
        atr = calculate_atr(df_15m['high'], df_15m['low'], df_15m['close'], window=14).iloc[-1]
        sl, tp1, tp2, tp3 = calculate_monster_top5_levels(current_price, atr, direction)
        analysis_results['atr_levels_defined'] = True
        analysis_results['atr'] = atr
        
        # Step 8: ML confidence
        ml_confidence = get_ml_confidence_top5(df_15m, rsi_value, atr, volume_ratio, adx_value)
        analysis_results['ml_confidence'] = ml_confidence
        
        # Calculate final confidence score
        confidence_score = calculate_confidence_score(analysis_results)
        
        # Create signal data
        signal_data = {
            'symbol': symbol,
            'direction': direction,
            'entry_price': current_price,
            'stop_loss': sl,
            'take_profits': {
                'TP1': tp1,
                'TP2': tp2,
                'TP3': tp3
            },
            'confidence_score': confidence_score,
            'ml_confidence': ml_confidence * 100,
            'rsi': rsi_value,
            'adx': adx_value,
            'volume_ratio': volume_ratio,
            'atr': atr,
            'analysis_results': analysis_results
        }
        
        logger.info(f"✅ {symbol}: Score {confidence_score}/100, ML: {ml_confidence:.1%}, {direction}")
        
        return signal_data
        
    except Exception as e:
        logger.error(f"Error analyzing {symbol}: {str(e)}")
        return None

@monster_v2_top5_api.route('/api/signals/generate/monster-v2-top5', methods=['POST'])
def generate_monster_v2_top5_signals():
    """Generate Monster v2 Top5 signals - analyze 10 pairs, return top 5"""
    try:
        logger.info(f"🎯 [MONSTER V2 TOP5] Starting analysis of {len(TOP_10_LIQUID_PAIRS)} pairs...")
        
        # Analyze all 10 pairs
        analysis_results = []
        for symbol in TOP_10_LIQUID_PAIRS:
            try:
                result = analyze_symbol_for_top5(symbol)
                if result and result['confidence_score'] > 0:
                    analysis_results.append(result)
            except Exception as e:
                logger.error(f"Error processing {symbol}: {str(e)}")
                continue
        
        # Sort by confidence score (descending) and take top 5
        analysis_results.sort(key=lambda x: x['confidence_score'], reverse=True)
        top_5_results = analysis_results[:5]
        
        # Convert to signals format
        signals = []
        for i, result in enumerate(top_5_results, 1):
            signal = {
                'estrategia': 'Monster v2 Top5',
                'par': result['symbol'],
                'direcao': result['direction'],
                'entrada': round(result['entry_price'], 6),
                'stop_loss': round(result['stop_loss'], 6),
                'take_profits': {
                    'TP1': round(result['take_profits']['TP1'], 6),
                    'TP2': round(result['take_profits']['TP2'], 6),
                    'TP3': round(result['take_profits']['TP3'], 6)
                },
                'confianca': result['confidence_score'],
                'ml_confidence': round(result['ml_confidence'], 1),
                'rsi': round(result['rsi'], 2),
                'adx': round(result['adx'], 2),
                'volume_ratio': round(result['volume_ratio'], 2),
                'atr': round(result['atr'], 6),
                'rank': i,
                'timestamp': datetime.utcnow().isoformat(),
                'expires': (datetime.utcnow() + timedelta(minutes=15)).isoformat()
            }
            signals.append(signal)
        
        logger.info(f"🎯 Monster v2 Top5 complete: {len(signals)}/5 top signals generated")
        
        # Log top 5 results
        for i, signal in enumerate(signals, 1):
            logger.info(f"#{i}: {signal['par']} {signal['direcao']} - Score: {signal['confianca']}/100")
        
        return jsonify({
            'signals': signals,
            'count': len(signals),
            'strategy': 'Monster v2 Top5',
            'analyzed_pairs': len(analysis_results),
            'total_pairs': len(TOP_10_LIQUID_PAIRS),
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in Monster v2 Top5 generation: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@monster_v2_top5_api.route('/api/signals/monster-v2-top5/health', methods=['GET'])
def monster_v2_top5_health():
    """Health check for Monster v2 Top5 API"""
    return jsonify({
        'status': 'healthy',
        'strategy': 'Monster v2 Top5',
        'version': '1.0',
        'liquid_pairs': TOP_10_LIQUID_PAIRS,
        'timestamp': datetime.utcnow().isoformat()
    })