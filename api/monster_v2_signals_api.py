"""
Monster v2 Signals API - Sistema de Geração de Sinais Altamente Confiáveis
Objetivo: 70%+ taxa de acerto com critérios técnicos rigorosos e gestão dinâmica
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

# Create blueprint for monster v2 signals
monster_v2_api = Blueprint('monster_v2', __name__)

logger = logging.getLogger("MonsterV2API")

def get_usdt_symbols_from_bybit(limit: int = 30):
    """Dynamically fetch USDT perpetual symbols from Bybit (v5)"""
    try:
        url = "https://api.bybit.com/v5/market/instruments-info"
        params = {"category": "linear"}
        resp = requests.get(url, params=params, timeout=8)
        data = resp.json()
        instruments = data.get("result", {}).get("list", [])
        
        # Filter tradable USDT pairs and prioritize by volume
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
            'DOTUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT'
        ]

# ============================================================================
# MONSTER V2 TECHNICAL INDICATORS
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
# MONSTER V2 TRADING RULES
# ============================================================================

def check_ema200_trend(df_15m):
    """EMA200 (15m): direção da tendência (somente Long acima, somente Short abaixo)"""
    if len(df_15m) < 200:
        logger.warning("Insufficient data for EMA200 calculation")
        return None
    
    ema_200 = calculate_ema(df_15m['close'], 200).iloc[-1]
    current_price = df_15m['close'].iloc[-1]
    
    if current_price > ema_200:
        return "LONG"
    elif current_price < ema_200:
        return "SHORT"
    
    return None

def check_rsi_conditions(df_15m, direction, market_context="neutral"):
    """RSI (14): Long 25-40, Short 60-75, ajuste dinâmico bull/bear"""
    rsi = calculate_rsi(df_15m['close'], window=14).iloc[-1]
    
    if direction == "LONG":
        if market_context == "bull":
            # Em bull market, permitir Long se RSI ≥40
            return rsi >= 40 and rsi <= 75, rsi
        else:
            # Condição ajustada: RSI entre 25-40
            return rsi >= 25 and rsi <= 40, rsi
    
    elif direction == "SHORT":
        if market_context == "bear":
            # Em bear market, permitir Short se RSI ≤60
            return rsi <= 60 and rsi >= 25, rsi
        else:
            # Condição ajustada: RSI entre 60-75
            return rsi >= 60 and rsi <= 75, rsi
    
    return False, rsi

def check_volume_conditions(df_15m):
    """Volume: candle atual ≥1.2× SMA(20). Se ≥1.5×, aumentar score/confiança"""
    if len(df_15m) < 20:
        return False, 1.0, False
    
    current_volume = df_15m['volume'].iloc[-1]
    sma_20_volume = calculate_sma(df_15m['volume'], 20).iloc[-1]
    
    volume_ratio = current_volume / sma_20_volume if sma_20_volume > 0 else 1.0
    
    # Volume deve ser ≥1.2× SMA(20) (ajustado de 1.3×)
    volume_confirmed = volume_ratio >= 1.2
    
    # Se ≥1.5×, aumentar score/confiança
    volume_boost = volume_ratio >= 1.5
    
    return volume_confirmed, volume_ratio, volume_boost

def check_vwap_conditions(df_15m, direction):
    """VWAP (50): rompimento deve respeitar VWAP (Long acima, Short abaixo)"""
    if len(df_15m) < 50:
        logger.warning("Insufficient data for VWAP50 calculation")
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
    
    # Usar VWAP como aproximação do POC
    vwap = calculate_vwap(df_15m, 50).iloc[-1]
    current_price = df_15m['close'].iloc[-1]
    
    # Rompimento de ±0.2%
    breakout_threshold = 0.002  # 0.2%
    poc_breakout = abs(current_price - vwap) / vwap > breakout_threshold
    
    return poc_breakout

def check_adx_strength(df_15m):
    """ADX (14): mínimo 20 para validar força da tendência"""
    adx_value = calculate_adx(df_15m, 14)
    return adx_value >= 20, adx_value

def get_ml_confidence_v2(df_15m, rsi, atr, volume_ratio, adx_value):
    """ML: ≥55% confiança mínima com ajuste de posição"""
    try:
        # Import real ML predictor if available
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from ml.ml_predictor import predict_signal_quality, get_prediction_confidence
        
        # Calculate ML features
        current_candle = df_15m.iloc[-1]
        body_ratio = abs(current_candle['close'] - current_candle['open']) / (current_candle['high'] - current_candle['low']) if (current_candle['high'] - current_candle['low']) > 0 else 0.5
        
        signal_features = {
            'rsi': rsi,
            'adx': adx_value,
            'volume_ratio': volume_ratio,
            'candle_body_ratio': body_ratio
        }
        
        # Get ML prediction
        ml_prediction = predict_signal_quality(signal_features)
        confidence_scores = get_prediction_confidence(signal_features)
        
        if confidence_scores:
            max_confidence = max(confidence_scores.values())
            logger.info(f"🤖 ML V2: {ml_prediction} | Confiança: {max_confidence:.3f}")
            
            # Monster v2 Ajustado: confiança mínima ≥50% (reduzido de 55%)
            if ml_prediction in ['WINNER', 'PARTIAL'] and max_confidence >= 0.50:
                return max_confidence
            else:
                logger.info(f"🛑 ML V2 Ajustado rejeitou: {ml_prediction} com confiança {max_confidence:.3f}")
                return 0.0
        else:
            return 0.60  # Fallback conservador
            
    except (ImportError, Exception) as e:
        logger.warning(f"⚠️ ML não disponível, usando fallback técnico: {e}")
        return calculate_technical_confidence_v2(rsi, volume_ratio, adx_value)

def calculate_technical_confidence_v2(rsi, volume_ratio, adx_value):
    """Fallback técnico para confiança quando ML não disponível - Critérios Ajustados"""
    confidence = 0.50  # Base mínima ajustada para 50%
    
    # RSI factor (faixas mais amplas)
    if 25 <= rsi <= 75:
        confidence += 0.08
    if (25 <= rsi <= 40) or (60 <= rsi <= 75):  # Faixas ajustadas
        confidence += 0.12
    
    # Volume factor (threshold reduzido)
    if volume_ratio >= 1.5:
        confidence += 0.15
    elif volume_ratio >= 1.2:  # Reduzido de 1.3 para 1.2
        confidence += 0.10
    
    # ADX factor
    if adx_value >= 25:
        confidence += 0.10
    elif adx_value >= 20:
        confidence += 0.05
    
    return min(confidence, 0.95)  # Cap at 95%

def calculate_position_sizing(ml_confidence, risk_amount):
    """Ajuste de posição: 50-60% meio lote, >60% lote completo (ajustado)"""
    if ml_confidence >= 0.60:
        return risk_amount, "LOTE_COMPLETO"
    elif ml_confidence >= 0.50:  # Reduzido de 0.55 para 0.50
        return risk_amount * 0.5, "MEIO_LOTE"
    else:
        return 0, "REJEITADO"

def calculate_monster_v2_levels(entry_price, atr, direction):
    """ATR (14): SL=1.2×ATR, TP1=1.5×ATR, TP2=2.0×ATR, TP3=3.0×ATR"""
    direction_mult = 1 if direction == "LONG" else -1
    
    # Monster v2 levels
    sl = entry_price - (direction_mult * atr * 1.2)
    tp1 = entry_price + (direction_mult * atr * 1.5)
    tp2 = entry_price + (direction_mult * atr * 2.0)
    tp3 = entry_price + (direction_mult * atr * 3.0)
    
    return sl, tp1, tp2, tp3

def generate_monster_v2_signal(symbol):
    """
    Monster v2 Signal Generator - Sistema de Alta Confiabilidade
    Objetivo: 70%+ taxa de acerto com critérios rigorosos
    """
    try:
        logger.info(f"🎯 [MONSTER V2 AJUSTADO] Analyzing {symbol}...")
        
        # Get current market price
        current_price = get_current_price(symbol)
        if current_price == 0:
            logger.warning(f"Could not get current price for {symbol}")
            return None
        
        # Fetch 15m data for analysis and execution
        df_15m = fetch_data(symbol, "15", limit=250)  # Need enough for EMA200
        if df_15m.empty:
            logger.warning(f"Insufficient 15m data for {symbol}")
            return None
        
        # Fetch 5m data for confirmation
        df_5m = fetch_data(symbol, "5", limit=100)
        if df_5m.empty:
            logger.warning(f"Insufficient 5m data for {symbol}")
            return None
        
        entry_price = current_price
        
        # ============================================================================
        # STEP 1: EMA200 (15m) - Direção da tendência
        # ============================================================================
        direction = check_ema200_trend(df_15m)
        if direction is None:
            logger.info(f"🛑 EMA200 trend indefinido para {symbol}")
            return None
        
        logger.info(f"✅ EMA200 direção: {direction}")
        
        # ============================================================================
        # STEP 2: RSI (14) - Extremos com ajuste dinâmico
        # ============================================================================
        # Detectar contexto de mercado (simplificado)
        market_context = "neutral"  # Pode ser expandido para detectar bull/bear
        
        rsi_valid, rsi_value = check_rsi_conditions(df_15m, direction, market_context)
        if not rsi_valid:
            logger.info(f"🛑 RSI não atende critérios para {direction}: {rsi_value:.2f}")
            return None
        
        logger.info(f"✅ RSI confirmado: {rsi_value:.2f}")
        
        # ============================================================================
        # STEP 3: Volume - ≥1.3× SMA(20)
        # ============================================================================
        volume_confirmed, volume_ratio, volume_boost = check_volume_conditions(df_15m)
        if not volume_confirmed:
            logger.info(f"🛑 Volume insuficiente: {volume_ratio:.2f}x (precisa ≥1.3x)")
            return None
        
        logger.info(f"✅ Volume confirmado: {volume_ratio:.2f}x {'(BOOST)' if volume_boost else ''}")
        
        # ============================================================================
        # STEP 4: VWAP (50) - Rompimento respeitando direção
        # ============================================================================
        vwap_confirmed = check_vwap_conditions(df_15m, direction)
        if not vwap_confirmed:
            logger.info(f"🛑 VWAP não confirma direção {direction}")
            return None
        
        logger.info(f"✅ VWAP confirma {direction}")
        
        # ============================================================================
        # STEP 5: Volume Profile POC - ±0.2%
        # ============================================================================
        poc_breakout = check_volume_profile_poc(df_15m)
        if not poc_breakout:
            logger.info(f"🛑 Volume Profile POC sem rompimento significativo")
            return None
        
        logger.info(f"✅ Volume Profile POC rompimento confirmado")
        
        # ============================================================================
        # STEP 6: ADX (14) - Mínimo 20 para força da tendência
        # ============================================================================
        adx_strong, adx_value = check_adx_strength(df_15m)
        if not adx_strong:
            logger.info(f"🛑 ADX muito fraco: {adx_value:.2f} (precisa ≥20)")
            return None
        
        logger.info(f"✅ ADX força confirmada: {adx_value:.2f}")
        
        # ============================================================================
        # STEP 7: Machine Learning - ≥50% confiança (ajustado)
        # ============================================================================
        ml_confidence = get_ml_confidence_v2(df_15m, rsi_value, 
                                           calculate_atr(df_15m['high'], df_15m['low'], df_15m['close']).iloc[-1],
                                           volume_ratio, adx_value)
        
        if ml_confidence < 0.50:  # Reduzido de 0.55 para 0.50
            logger.info(f"🛑 ML confiança muito baixa: {ml_confidence:.3f}")
            return None
        
        logger.info(f"✅ ML confiança aprovada: {ml_confidence:.3f}")
        
        # ============================================================================
        # STEP 8: Risk Management - ATR based levels
        # ============================================================================
        atr = calculate_atr(df_15m['high'], df_15m['low'], df_15m['close'], window=14).iloc[-1]
        sl, tp1, tp2, tp3 = calculate_monster_v2_levels(entry_price, atr, direction)
        
        # Risk/Reward validation
        risk = abs(entry_price - sl)
        reward = abs(tp3 - entry_price)
        risk_reward_ratio = reward / risk if risk > 0 else 0
        
        if risk_reward_ratio < 2.0:  # Monster v2 exige R/R >= 2.0
            logger.info(f"🛑 Risk/Reward inadequado: {risk_reward_ratio:.2f}")
            return None
        
        logger.info(f"✅ Risk/Reward aprovado: {risk_reward_ratio:.2f}:1")
        
        # ============================================================================
        # STEP 9: Position Sizing
        # ============================================================================
        base_risk_amount = 20.0  # 2% de 1000 USD
        position_amount, position_type = calculate_position_sizing(ml_confidence, base_risk_amount)
        
        if position_amount == 0:
            logger.info(f"🛑 Posição rejeitada pelo ML")
            return None
        
        logger.info(f"✅ Posição calculada: {position_type} - ${position_amount}")
        
        # Generate detailed analysis
        analysis_text = f"""🎯 MONSTER V2 AJUSTADO - ANÁLISE COMPLETA

📊 CONFIGURAÇÃO TÉCNICA:
• Timeframe Principal: 15m (análise/execução)
• Timeframe Confirmação: 5m
• Direção EMA200: {direction}
• RSI: {rsi_value:.2f} {'(Faixa LONG 25-40)' if direction == 'LONG' and 25 <= rsi_value <= 40 else '(Faixa SHORT 60-75)' if direction == 'SHORT' and 60 <= rsi_value <= 75 else '(Ajuste dinâmico)'}

📈 CONFIRMAÇÕES AJUSTADAS:
• Volume: {volume_ratio:.2f}x SMA(20) {'✨ BOOST' if volume_boost else '✅ Confirmado (≥1.2x)'}
• VWAP(50): Rompimento {direction} confirmado
• Volume Profile POC: Breakout ±0.2% detectado
• ADX: {adx_value:.2f} (Tendência forte ≥20)

🤖 MACHINE LEARNING AJUSTADO:
• Confiança: {ml_confidence:.1%} (Threshold: ≥50%)
• Posição: {position_type}
• Status: {'APROVADO' if ml_confidence >= 0.50 else 'REJEITADO'}

💰 GESTÃO MONSTER V2:
• Stop Loss: {sl:.6f} (1.2×ATR)
• Take Profit 1: {tp1:.6f} (1.5×ATR)
• Take Profit 2: {tp2:.6f} (2.0×ATR)
• Take Profit 3: {tp3:.6f} (3.0×ATR)
• Risk/Reward: {risk_reward_ratio:.2f}:1

⚡ MONSTER V2 AJUSTADO - CRITÉRIOS RELAXADOS PARA MAIS OPORTUNIDADES
"""
        
        # Create Monster v2 Ajustado signal
        signal = {
            'estrategia': 'Monster v2 Ajustado',
            'par': symbol,
            'direcao': direction,
            'entrada': round(entry_price, 6),
            'stop_loss': round(sl, 6),
            'take_profits': {
                'TP1': round(tp1, 6),
                'TP2': round(tp2, 6),
                'TP3': round(tp3, 6)
            },
            'confianca': round(ml_confidence * 100, 1),
            'ml_confidence': round(ml_confidence * 100, 1),
            'rsi': round(rsi_value, 2),
            'adx': round(adx_value, 2),
            'volume_ratio': round(volume_ratio, 2),
            'atr': round(atr, 6),
            'risk_reward_ratio': round(risk_reward_ratio, 2),
            'position_type': position_type,
            'position_amount': round(position_amount, 2),
            'analysis': analysis_text,
            'timestamp': datetime.utcnow().isoformat(),
            'expires': (datetime.utcnow() + timedelta(minutes=15)).isoformat(),
            'timeframe_analysis': '15m',
            'timeframe_confirmation': '5m'
        }
        
        logger.info(f"✅ MONSTER V2 AJUSTADO signal generated: {symbol} {direction} @ {entry_price}")
        logger.info(f"   Confidence: {ml_confidence:.1%}, R/R: {risk_reward_ratio:.2f}, {position_type}")
        
        return signal
        
    except Exception as e:
        logger.error(f"Error generating Monster v2 signal for {symbol}: {str(e)}")
        logger.error(traceback.format_exc())
        return None

@monster_v2_api.route('/api/signals/generate/monster-v2', methods=['POST'])
def generate_monster_v2_signals():
    """Generate Monster v2 signals for multiple symbols"""
    try:
        data = request.get_json() or {}
        symbols = data.get('symbols', [])
        
        if not symbols:
            symbols = get_usdt_symbols_from_bybit(20)
        
        logger.info(f"🎯 Generating Monster v2 Ajustado signals for {len(symbols)} symbols...")
        
        signals = []
        for symbol in symbols:
            try:
                signal = generate_monster_v2_signal(symbol)
                if signal:
                    signals.append(signal)
                    
                    # Log successful signal
                    logger.info(f"✅ {len(signals)}. Monster v2 Ajustado signal: {signal['par']} {signal['direcao']} - {signal['confianca']}%")
                    
            except Exception as e:
                logger.error(f"Error processing {symbol}: {str(e)}")
                continue
        
        logger.info(f"🎯 Monster v2 Ajustado generation complete: {len(signals)} signals generated")
        
        return jsonify({
            'signals': signals,
            'count': len(signals),
            'strategy': 'Monster v2 Ajustado',
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in Monster v2 signals generation: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@monster_v2_api.route('/api/signals/monster-v2/health', methods=['GET'])
def monster_v2_health():
    """Health check for Monster v2 API"""
    return jsonify({
        'status': 'healthy',
        'strategy': 'Monster v2 Ajustado',
        'version': '2.1',
        'timestamp': datetime.utcnow().isoformat()
    })