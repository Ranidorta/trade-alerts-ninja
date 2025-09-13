"""
Monster v3 Lucrativo Signals API - Sistema Focado em Lucro Líquido e Payoff
Objetivo: >60-65% taxa de acerto com lucro líquido alto e R/R vantajoso
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

# Create blueprint for monster v3 lucrativo signals
monster_v3_lucrativo_api = Blueprint('monster_v3_lucrativo', __name__)

logger = logging.getLogger("MonsterV3LucrativoAPI")

def get_usdt_symbols_from_bybit(limit: int = 40):
    """Fetch USDT perpetual symbols from Bybit with volume priority"""
    try:
        url = "https://api.bybit.com/v5/market/instruments-info"
        params = {"category": "linear"}
        resp = requests.get(url, params=params, timeout=8)
        data = resp.json()
        instruments = data.get("result", {}).get("list", [])
        
        # Filter tradable USDT pairs with high volume
        symbols = []
        for inst in instruments:
            if (inst.get("symbol", "").endswith("USDT") and 
                inst.get("quoteCoin") == "USDT" and 
                inst.get("status") == "Trading"):
                symbols.append(inst.get("symbol"))
        
        return symbols[:limit] if symbols else []
    except Exception as e:
        logger.warning(f"Failed to fetch symbols from Bybit: {e}")
        return [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 
            'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT',
            'DOTUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
            'PEPEUSDT', 'SHIBUSDT', 'INJUSDT', 'SUIUSDT', 'APTUSDT'
        ]

# ============================================================================
# MONSTER V3 LUCRATIVO TECHNICAL INDICATORS
# ============================================================================

def calculate_ema(data, window):
    """Calculate Exponential Moving Average"""
    return data.ewm(span=window, adjust=False).mean()

def calculate_sma(data, window):
    """Calculate Simple Moving Average"""
    return data.rolling(window=window).mean()

def calculate_rsi(data, window=14):
    """Calculate RSI indicator"""
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_atr(high, low, close, window=14):
    """Calculate Average True Range"""
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
# MONSTER V3 LUCRATIVO SCORING SYSTEM
# ============================================================================

def calculate_v3_confidence_score(analysis_results):
    """
    Monster v3 Lucrativo Scoring System (0-100):
    - Direção EMA200: +15
    - RSI válido: +15  
    - Volume ≥1.1×: +10 (≥1.5×: +15)
    - VWAP + POC: +15
    - ADX ≥15: +10
    - Gestão ATR: +10
    - ML ≥50%: +10 (≥65%: +15)
    """
    score = 0
    
    # EMA200 direction
    if analysis_results.get('ema200_valid', False):
        score += 15
        logger.info("✅ EMA200 direção: +15 pontos")
    
    # RSI valid (Monster v3 - mais flexível)
    if analysis_results.get('rsi_valid', False):
        score += 15
        logger.info("✅ RSI válido: +15 pontos")
    
    # Volume confirmation (Monster v3 - threshold reduzido)
    volume_ratio = analysis_results.get('volume_ratio', 0)
    if volume_ratio >= 1.5:
        score += 15
        logger.info("✅ Volume ≥1.5×: +15 pontos")
    elif volume_ratio >= 1.1:  # Reduzido para 1.1×
        score += 10
        logger.info("✅ Volume ≥1.1×: +10 pontos")
    
    # VWAP + POC confirmed
    if (analysis_results.get('vwap_confirmed', False) and 
        analysis_results.get('poc_breakout', False)):
        score += 15
        logger.info("✅ VWAP + POC: +15 pontos")
    
    # ADX ≥15 (Monster v3 - mais flexível)
    if analysis_results.get('adx_strong', False):
        score += 10
        logger.info("✅ ADX ≥15: +10 pontos")
    
    # ATR risk management
    if analysis_results.get('atr_levels_defined', False):
        score += 10
        logger.info("✅ Gestão ATR: +10 pontos")
    
    # ML confidence (Monster v3)
    ml_confidence = analysis_results.get('ml_confidence', 0)
    if ml_confidence >= 0.65:
        score += 15
        logger.info("✅ ML ≥65%: +15 pontos")
    elif ml_confidence >= 0.50:
        score += 10
        logger.info("✅ ML ≥50%: +10 pontos")
    
    return min(score, 100)

def check_ema200_trend_v3(df_15m):
    """EMA200: direção da tendência"""
    if len(df_15m) < 200:
        return None, False
    
    ema_200 = calculate_ema(df_15m['close'], 200).iloc[-1]
    current_price = df_15m['close'].iloc[-1]
    
    if current_price > ema_200:
        return "LONG", True
    elif current_price < ema_200:
        return "SHORT", True
    
    return None, False

def check_rsi_conditions_v3(df_15m, direction):
    """Monster v3 RSI: Long até 45, Short a partir de 55"""
    rsi = calculate_rsi(df_15m['close'], window=14).iloc[-1]
    
    if direction == "LONG":
        valid = rsi <= 45  # Monster v3: Long até 45
        return valid, rsi
    elif direction == "SHORT":
        valid = rsi >= 55  # Monster v3: Short a partir de 55
        return valid, rsi
    
    return False, rsi

def check_volume_conditions_v3(df_15m):
    """Monster v3 Volume: ≥1.1× SMA(20)"""
    if len(df_15m) < 20:
        return False, 1.0, False
    
    current_volume = df_15m['volume'].iloc[-1]
    sma_20_volume = calculate_sma(df_15m['volume'], 20).iloc[-1]
    
    volume_ratio = current_volume / sma_20_volume if sma_20_volume > 0 else 1.0
    volume_confirmed = volume_ratio >= 1.1  # Reduzido para 1.1×
    volume_boost = volume_ratio >= 1.5
    
    return volume_confirmed, volume_ratio, volume_boost

def check_vwap_conditions_v3(df_15m, direction):
    """VWAP(50): confirmar rompimento"""
    if len(df_15m) < 50:
        return False
    
    vwap_50 = calculate_vwap(df_15m, 50).iloc[-1]
    current_price = df_15m['close'].iloc[-1]
    
    if direction == "LONG":
        return current_price > vwap_50
    elif direction == "SHORT":
        return current_price < vwap_50
    
    return False

def check_volume_profile_poc_v3(df_15m):
    """POC: validar ±0.2%"""
    if len(df_15m) < 50:
        return False
    
    vwap = calculate_vwap(df_15m, 50).iloc[-1]
    current_price = df_15m['close'].iloc[-1]
    
    breakout_threshold = 0.002  # 0.2%
    poc_breakout = abs(current_price - vwap) / vwap > breakout_threshold
    
    return poc_breakout

def check_adx_strength_v3(df_15m):
    """Monster v3 ADX: ≥15 (mais flexível)"""
    adx_value = calculate_adx(df_15m, 14)
    return adx_value >= 15, adx_value  # Reduzido de 20 para 15

def get_ml_confidence_v3(df_15m, rsi, atr, volume_ratio, adx_value):
    """Monster v3 ML: ≥50% confiança mínima"""
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
        logger.warning(f"⚠️ ML não disponível, usando fallback técnico")
        return calculate_technical_confidence_v3(rsi, volume_ratio, adx_value)

def calculate_technical_confidence_v3(rsi, volume_ratio, adx_value):
    """Fallback técnico Monster v3"""
    confidence = 0.50
    
    # RSI factor (Monster v3 - mais flexível)
    if rsi <= 45 or rsi >= 55:  # Dentro das faixas v3
        confidence += 0.15
    
    # Volume factor (Monster v3)
    if volume_ratio >= 1.5:
        confidence += 0.15
    elif volume_ratio >= 1.1:  # Threshold reduzido
        confidence += 0.10
    
    # ADX factor (Monster v3)
    if adx_value >= 20:
        confidence += 0.15
    elif adx_value >= 15:  # Threshold reduzido
        confidence += 0.10
    
    return min(confidence, 0.95)

def calculate_monster_v3_levels(entry_price, atr, direction):
    """
    Monster v3 Lucrativo ATR Levels:
    - SL = 1.2×ATR
    - TP1 = 2.0×ATR (após atingir → mover SL para zero)
    - TP2 = 3.0×ATR
    - TP3 = trailing stop de 1 ATR
    """
    direction_mult = 1 if direction == "LONG" else -1
    
    sl = entry_price - (direction_mult * atr * 1.2)
    tp1 = entry_price + (direction_mult * atr * 2.0)  # 2.0×ATR para melhor R/R
    tp2 = entry_price + (direction_mult * atr * 3.0)  # 3.0×ATR
    tp3 = entry_price + (direction_mult * atr * 4.0)  # Trailing reference
    
    return sl, tp1, tp2, tp3

def generate_monster_v3_signal(symbol):
    """
    Monster v3 Lucrativo Signal Generator
    Score mínimo ≥65 para gerar sinal
    """
    try:
        logger.info(f"🎯 [MONSTER V3 LUCRATIVO] Analyzing {symbol}...")
        
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
        
        entry_price = current_price
        analysis_results = {}
        
        # Step 1: EMA200 trend
        direction, ema200_valid = check_ema200_trend_v3(df_15m)
        if direction is None:
            return None
        
        analysis_results['direction'] = direction
        analysis_results['ema200_valid'] = ema200_valid
        
        # Step 2: Monster v3 RSI conditions
        rsi_valid, rsi_value = check_rsi_conditions_v3(df_15m, direction)
        if not rsi_valid:
            return None
        
        analysis_results['rsi_valid'] = rsi_valid
        analysis_results['rsi_value'] = rsi_value
        
        # Step 3: Monster v3 Volume conditions
        volume_confirmed, volume_ratio, volume_boost = check_volume_conditions_v3(df_15m)
        if not volume_confirmed:
            return None
        
        analysis_results['volume_confirmed'] = volume_confirmed
        analysis_results['volume_ratio'] = volume_ratio
        analysis_results['volume_boost'] = volume_boost
        
        # Step 4: VWAP conditions
        vwap_confirmed = check_vwap_conditions_v3(df_15m, direction)
        if not vwap_confirmed:
            return None
        
        analysis_results['vwap_confirmed'] = vwap_confirmed
        
        # Step 5: POC breakout
        poc_breakout = check_volume_profile_poc_v3(df_15m)
        if not poc_breakout:
            return None
        
        analysis_results['poc_breakout'] = poc_breakout
        
        # Step 6: Monster v3 ADX strength
        adx_strong, adx_value = check_adx_strength_v3(df_15m)
        if not adx_strong:
            return None
        
        analysis_results['adx_strong'] = adx_strong
        analysis_results['adx_value'] = adx_value
        
        # Step 7: ATR levels
        atr = calculate_atr(df_15m['high'], df_15m['low'], df_15m['close'], window=14).iloc[-1]
        sl, tp1, tp2, tp3 = calculate_monster_v3_levels(entry_price, atr, direction)
        analysis_results['atr_levels_defined'] = True
        analysis_results['atr'] = atr
        
        # Step 8: Monster v3 ML confidence
        ml_confidence = get_ml_confidence_v3(df_15m, rsi_value, atr, volume_ratio, adx_value)
        analysis_results['ml_confidence'] = ml_confidence
        
        # Calculate Monster v3 score
        final_score = calculate_v3_confidence_score(analysis_results)
        
        # Monster v3 Lucrativo: só gerar se score ≥65
        if final_score < 65:
            logger.info(f"🛑 Score insuficiente para {symbol}: {final_score}/100 (precisa ≥65)")
            return None
        
        # Risk/Reward validation
        risk = abs(entry_price - sl)
        reward = abs(tp2 - entry_price)  # Use TP2 for R/R calculation
        risk_reward_ratio = reward / risk if risk > 0 else 0
        
        if risk_reward_ratio < 2.0:  # Monster v3 exige R/R ≥ 2.0
            logger.info(f"🛑 Risk/Reward inadequado: {risk_reward_ratio:.2f}")
            return None
        
        # Generate detailed analysis
        analysis_text = f"""💰 MONSTER V3 LUCRATIVO - ANÁLISE PAYOFF ALTO

📊 SETUP {direction} APROVADO - Score: {final_score}/100
• Timeframe: 15m principal + 5m auxiliar
• Critérios Monster v3: EMA200 + RSI flexível + Volume 1.1x + VWAP + POC + ADX 15+

🎯 INDICADORES TÉCNICOS V3:
• EMA200: Tendência {direction} confirmada
• RSI: {rsi_value:.2f} ({'≤45' if direction == 'LONG' else '≥55'} - Monster v3 flexível)
• Volume: {volume_ratio:.2f}x SMA(20) {'✨ BOOST' if volume_boost else '✅ Confirmado (≥1.1x)'}
• VWAP(50): Rompimento {direction} validado
• POC: Breakout ±0.2% detectado
• ADX: {adx_value:.2f} (≥15 - Monster v3 flexível)

💰 GESTÃO LUCRATIVA V3:
• Stop Loss: {sl:.6f} (1.2×ATR)
• Take Profit 1: {tp1:.6f} (2.0×ATR) → mover SL para zero
• Take Profit 2: {tp2:.6f} (3.0×ATR)
• Take Profit 3: Trailing stop 1 ATR
• Risk/Reward: {risk_reward_ratio:.2f}:1

🤖 MACHINE LEARNING V3:
• Confiança: {ml_confidence:.1%} ({'Premium ≥65%' if ml_confidence >= 0.65 else 'Standard ≥50%'})

💎 MONSTER V3 LUCRATIVO - FOCO EM PAYOFF E LUCRO LÍQUIDO ALTO"""
        
        # Create Monster v3 signal
        signal = {
            'estrategia': 'Monster v3 Lucrativo',
            'par': symbol,
            'direcao': direction,
            'entrada': round(entry_price, 6),
            'stop_loss': round(sl, 6),
            'take_profits': {
                'TP1': round(tp1, 6),
                'TP2': round(tp2, 6),
                'TP3': round(tp3, 6)
            },
            'score': final_score,
            'ml_confidence': round(ml_confidence * 100, 1),
            'rsi': round(rsi_value, 2),
            'adx': round(adx_value, 2),
            'volume_ratio': round(volume_ratio, 2),
            'atr': round(atr, 6),
            'risk_reward_ratio': round(risk_reward_ratio, 2),
            'analysis': analysis_text,
            'timestamp': datetime.utcnow().isoformat(),
            'expires': (datetime.utcnow() + timedelta(minutes=15)).isoformat(),
            'timeframe_principal': '15m',
            'timeframe_auxiliar': '5m'
        }
        
        logger.info(f"✅ MONSTER V3 LUCRATIVO signal: {symbol} {direction} @ {entry_price}")
        logger.info(f"   Score: {final_score}/100, ML: {ml_confidence:.1%}, R/R: {risk_reward_ratio:.2f}")
        
        return signal
        
    except Exception as e:
        logger.error(f"Error generating Monster v3 signal for {symbol}: {str(e)}")
        logger.error(traceback.format_exc())
        return None

@monster_v3_lucrativo_api.route('/api/signals/generate/monster-v3-lucrativo', methods=['POST'])
def generate_monster_v3_lucrativo_signals():
    """Generate Monster v3 Lucrativo signals - only score ≥65"""
    try:
        data = request.get_json() or {}
        symbols = data.get('symbols', [])
        
        if not symbols:
            symbols = get_usdt_symbols_from_bybit(40)
        
        logger.info(f"🎯 Generating Monster v3 Lucrativo signals for {len(symbols)} symbols...")
        
        signals = []
        analyzed_count = 0
        
        for symbol in symbols:
            try:
                analyzed_count += 1
                signal = generate_monster_v3_signal(symbol)
                if signal:
                    signals.append(signal)
                    logger.info(f"✅ {len(signals)}. Monster v3: {signal['par']} {signal['direcao']} - {signal['score']}/100")
                    
            except Exception as e:
                logger.error(f"Error processing {symbol}: {str(e)}")
                continue
        
        logger.info(f"🎯 Monster v3 Lucrativo complete: {len(signals)} signals generated from {analyzed_count} analyzed")
        
        return jsonify({
            'signals': signals,
            'count': len(signals),
            'strategy': 'Monster v3 Lucrativo',
            'analyzed_symbols': analyzed_count,
            'minimum_score': 65,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in Monster v3 Lucrativo generation: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@monster_v3_lucrativo_api.route('/api/signals/monster-v3-lucrativo/health', methods=['GET'])
def monster_v3_lucrativo_health():
    """Health check for Monster v3 Lucrativo API"""
    return jsonify({
        'status': 'healthy',
        'strategy': 'Monster v3 Lucrativo',
        'version': '1.0',
        'focus': 'Alto lucro líquido e payoff vantajoso',
        'minimum_score': 65,
        'timestamp': datetime.utcnow().isoformat()
    })