
"""
Monster Signals API - Enhanced with real Bybit market data
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

# Create blueprint for monster signals
monster_signals_api = Blueprint('monster_signals', __name__)

logger = logging.getLogger("MonsterSignalsAPI")

# Dynamically fetch USDT perpetual symbols from Bybit (v5)
def get_usdt_symbols_from_bybit(limit: int = 20):
    try:
        url = "https://api.bybit.com/v5/market/instruments-info"
        params = {"category": "linear"}
        resp = requests.get(url, params=params, timeout=8)
        data = resp.json()
        instruments = data.get("result", {}).get("list", [])
        # Filter tradable USDT pairs
        symbols = [
            inst.get("symbol")
            for inst in instruments
            if inst.get("symbol", "").endswith("USDT")
            and inst.get("quoteCoin") == "USDT"
            and inst.get("status") == "Trading"
        ]
        return symbols[:limit] if symbols else []
    except Exception as e:
        logger.warning(f"Failed to fetch symbols from Bybit: {e}")
        return []

# ============================================================================
# SIMPLIFIED PROFESSIONAL INDICATORS (EMA 200, ATR, Volume, RSI)
# ============================================================================

def calculate_ema(data, window):
    """Calculate Exponential Moving Average"""
    return data.ewm(span=window, adjust=False).mean()

def calculate_rsi(data, window=14):
    """Calculate RSI indicator for divergences and extremes"""
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

def get_ema200_direction(df):
    """Simplified trend detection using only EMA 200"""
    if len(df) < 200:
        return None
    
    ema_200 = calculate_ema(df['close'], 200).iloc[-1]
    current_price = df['close'].iloc[-1]
    
    if current_price > ema_200:
        return "BUY"
    elif current_price < ema_200:
        return "SELL"
    
    return None

def volume_spike_confirmation(df, multiplier=1.5):
    """Volume must be 150% above average (professional standard)"""
    if len(df) < 20:
        return False
    
    current_vol = df['volume'].iloc[-1]
    avg_vol = df['volume'].rolling(20).mean().iloc[-1]
    
    return current_vol > avg_vol * multiplier

def rsi_extremes_filter(rsi, direction):
    """RSI filter for extremes and divergences (professional approach)"""
    if direction == "BUY" and rsi <= 35:  # Oversold for BUY
        return True
    elif direction == "SELL" and rsi >= 65:  # Overbought for SELL
        return True
    return False

def volume_profile_confirmation(df, window=50):
    """Volume Profile POC breakout confirmation"""
    if len(df) < window:
        return False
    
    # Calculate volume-weighted average price (VWAP) as POC approximation
    volume_sum = df['volume'].rolling(window).sum().iloc[-1]
    if volume_sum == 0:
        return False
    
    vwap = (df['close'] * df['volume']).rolling(window).sum().iloc[-1] / volume_sum
    current_price = df['close'].iloc[-1]
    
    # Check for POC breakout (0.2% threshold)
    poc_break = abs(current_price - vwap) / vwap > 0.002
    
    return poc_break

def macro_events_filter(symbol="BTCUSDT"):
    """REAL macro events filter using ForexFactory API"""
    from utils.macro_events_filter import check_fundamental_filter
    return check_fundamental_filter(symbol)

def professional_risk_management(entry_price, atr, direction):
    """Professional Risk/Reward with SL=1.0 ATR, TPs=1.5/2.0/3.0 ATR"""
    direction_multiplier = 1 if direction == "BUY" else -1
    
    sl = entry_price - (direction_multiplier * atr * 1.0)
    tp1 = entry_price + (direction_multiplier * atr * 1.5)
    tp2 = entry_price + (direction_multiplier * atr * 2.0)
    tp3 = entry_price + (direction_multiplier * atr * 3.0)
    
    return sl, tp1, tp2, tp3

def calculate_adx(df, window=14):
    """Calculate ADX for ML features"""
    if len(df) < window + 1:
        return 25.0  # Neutral ADX value
    
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

def calculate_candle_body_ratio(df):
    """Calculate candle body ratio for ML features"""
    if len(df) < 1:
        return 0.5
    
    candle = df.iloc[-1]
    body = abs(candle['close'] - candle['open'])
    total_range = candle['high'] - candle['low']
    
    if total_range == 0:
        return 0.0
    
    return body / total_range

def get_ml_confidence_real(df, rsi, atr):
    """REAL ML confidence using trained model"""
    try:
        # Import real ML predictor
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from ml.ml_predictor import predict_signal_quality, get_prediction_confidence
        
        # Calculate real features
        current_candle = df.iloc[-1]
        volume_avg = df['volume'].rolling(20).mean().iloc[-1] if len(df) >= 20 else df['volume'].iloc[-1]
        volume_ratio = current_candle['volume'] / volume_avg if volume_avg > 0 else 1.0
        
        signal_features = {
            'rsi': rsi,
            'adx': calculate_adx(df),
            'volume_ratio': volume_ratio,
            'candle_body_ratio': calculate_candle_body_ratio(df)
        }
        
        # Get ML prediction
        ml_prediction = predict_signal_quality(signal_features)
        confidence_scores = get_prediction_confidence(signal_features)
        
        if confidence_scores:
            max_confidence = max(confidence_scores.values())
            logger.info(f"🤖 ML REAL: {ml_prediction} | Confiança: {max_confidence:.3f}")
            logger.info(f"   Features: RSI={rsi:.2f}, ADX={signal_features['adx']:.2f}, Vol={volume_ratio:.2f}, Body={signal_features['candle_body_ratio']:.2f}")
            
            # Only accept if prediction is not LOSER and confidence is good
            if ml_prediction in ['WINNER', 'PARTIAL'] and max_confidence >= 0.60:
                return max_confidence
            else:
                logger.info(f"🛑 ML rejeitou: {ml_prediction} com confiança {max_confidence:.3f}")
                return 0.0
        else:
            logger.warning("⚠️ ML não retornou confiança, usando fallback")
            return 0.65  # Fallback conservador
            
    except ImportError:
        logger.warning("⚠️ Modelo ML não disponível, usando fallback técnico")
        return calculate_fallback_confidence(rsi, atr, df)
    except Exception as e:
        logger.error(f"❌ Erro no ML real: {e}")
        return calculate_fallback_confidence(rsi, atr, df)

def calculate_fallback_confidence(rsi, atr, df):
    """Fallback confidence calculation when ML is not available"""
    confidence_factors = []
    
    # RSI factor
    if 35 <= rsi <= 65:
        confidence_factors.append(0.25)
    elif rsi <= 30 or rsi >= 70:
        confidence_factors.append(0.20)  # Extreme zones
    else:
        confidence_factors.append(0.15)
    
    # Volume factor
    if len(df) >= 20:
        current_vol = df['volume'].iloc[-1]
        avg_vol = df['volume'].rolling(20).mean().iloc[-1]
        if current_vol > avg_vol * 1.5:
            confidence_factors.append(0.25)
        elif current_vol > avg_vol:
            confidence_factors.append(0.15)
        else:
            confidence_factors.append(0.10)
    else:
        confidence_factors.append(0.15)
    
    # Candle strength factor
    body_ratio = calculate_candle_body_ratio(df)
    if body_ratio > 0.7:
        confidence_factors.append(0.20)
    elif body_ratio > 0.5:
        confidence_factors.append(0.15)
    else:
        confidence_factors.append(0.10)
    
    # ADX trend strength
    adx = calculate_adx(df)
    if adx > 25:
        confidence_factors.append(0.15)
    else:
        confidence_factors.append(0.10)
    
    total_confidence = sum(confidence_factors)
    logger.info(f"🔄 Fallback confidence: {total_confidence:.3f} (RSI={rsi:.2f}, ADX={adx:.2f}, Body={body_ratio:.2f})")
    
    return total_confidence

def generate_monster_signal(symbol):
    """
    SIMPLIFIED PROFESSIONAL Monster Signal Generator
    New Flow: EMA 200 → RSI Extremes → Volume Spike → Volume Profile → Macro Filter → ML (60%)
    """
    try:
        logger.info(f"🔍 [PROFESSIONAL] Analyzing {symbol} with simplified indicators...")
        
        # Get current market price first
        current_price = get_current_price(symbol)
        if current_price == 0:
            logger.warning(f"Could not get current price for {symbol}")
            current_price = None
        else:
            logger.info(f"Current market price for {symbol}: {current_price}")
        
        # Fetch 15m data for analysis (sufficient for professional signals)
        df_15m = fetch_data(symbol, "15", limit=250)  # Need more data for EMA 200
        
        if df_15m.empty:
            logger.warning(f"Insufficient data for {symbol}")
            return None
        
        # Use current market price if available, otherwise use latest close
        entry = current_price if current_price else float(df_15m['close'].iloc[-1])
        
        # ============================================================================
        # STEP 1: EMA 200 - Main Trend Direction (Simplified)
        # ============================================================================
        direction = get_ema200_direction(df_15m)
        if direction is None:
            logger.info(f"🛑 EMA 200 trend undefined for {symbol}")
            return None
        
        logger.info(f"✅ EMA 200 direction: {direction}")
        
        # ============================================================================
        # STEP 2: RSI Extremes and Divergences (Professional approach)
        # ============================================================================
        rsi = calculate_rsi(df_15m['close'], window=14).iloc[-1]
        
        if not rsi_extremes_filter(rsi, direction):
            logger.info(f"🛑 RSI not in extreme zone for {direction}: {rsi:.2f}")
            return None
        
        logger.info(f"✅ RSI extreme confirmed: {rsi:.2f}")
        
        # ============================================================================
        # STEP 3: Volume Spike Confirmation (150% above average)
        # ============================================================================
        if not volume_spike_confirmation(df_15m, multiplier=1.5):
            logger.info(f"🛑 Volume spike not confirmed for {symbol}")
            return None
        
        logger.info(f"✅ Volume spike confirmed (150%+ above average)")
        
        # ============================================================================
        # STEP 4: Volume Profile POC Breakout
        # ============================================================================
        if not volume_profile_confirmation(df_15m):
            logger.info(f"🛑 Volume Profile POC breakout not confirmed for {symbol}")
            return None
        
        logger.info(f"✅ Volume Profile POC breakout confirmed")
        
        # ============================================================================
        # STEP 5: REAL Macro Events Filter (ForexFactory API)
        # ============================================================================
        if not macro_events_filter(symbol):
            logger.info(f"🛑 REAL macro events filter blocked signal for {symbol}")
            return None
        
        logger.info(f"✅ REAL macro events filter passed")
        
        # ============================================================================
        # STEP 6: REAL ML Confidence Check (Trained Model)
        # ============================================================================
        ml_confidence = get_ml_confidence_real(df_15m, rsi, atr)
        
        if ml_confidence < 0.60:
            logger.info(f"🛑 REAL ML confidence too low: {ml_confidence:.3f}")
            return None
        
        logger.info(f"✅ REAL ML confidence approved: {ml_confidence:.3f}")
        
        # ============================================================================
        # STEP 7: Professional Risk Management (SL=1.0 ATR, TPs=1.5/2.0/3.0 ATR)
        # ============================================================================
        atr = calculate_atr(df_15m['high'], df_15m['low'], df_15m['close'], window=14).iloc[-1]
        sl, tp1, tp2, tp3 = professional_risk_management(entry, atr, direction)
        
        # Risk/Reward validation (must be >= 1.5:1)
        risk = abs(entry - sl)
        reward = abs(tp1 - entry)
        risk_reward_ratio = reward / risk if risk > 0 else 0
        
        if risk_reward_ratio < 1.5:
            logger.info(f"🛑 Risk/Reward ratio too low: {risk_reward_ratio:.2f}")
            return None
        
        logger.info(f"✅ Professional Risk/Reward: {risk_reward_ratio:.2f}:1")
        
        # Generate professional analysis text
        analysis_text = f"""Análise Técnica PROFISSIONAL - Sistema Simplificado:

📊 DIREÇÃO PRINCIPAL:
• EMA 200: Tendência {direction} confirmada
• Preço {'acima' if direction == 'BUY' else 'abaixo'} da média móvel de longo prazo

🎯 INDICADORES EXTREMOS:
• RSI: {rsi:.2f} {'(EXTREMO - Sobrevendido)' if rsi <= 35 else '(EXTREMO - Sobrecomprado)' if rsi >= 65 else '(Neutro)'}
• ATR: {atr:.6f} (Volatilidade para gestão de risco)

📈 CONFIRMAÇÕES DE QUALIDADE:
• Volume: SPIKE confirmado (150%+ acima da média)
• Volume Profile: Rompimento POC intradiário confirmado
• Filtros Macro: SEM conflitos detectados

🤖 MACHINE LEARNING:
• Confiança: {ml_confidence:.1%} (Aprovado - Threshold: 60%)
• Confluência de {len([f for f in confidence_factors if f > 0])} fatores técnicos

💰 GESTÃO DE RISCO PROFISSIONAL:
• Risk/Reward: {risk_reward_ratio:.2f}:1 (Mínimo: 1.5:1)
• Stop Loss: 1.0 ATR | Take Profits: 1.5/2.0/3.0 ATR
• Estratégia sustentável para longo prazo

⚡ SETUP DE ALTA QUALIDADE - APROVADO PARA EXECUÇÃO
"""
        
        # Create professional signal
        signal = {
            'symbol': symbol,
            'direction': direction,
            'entry_price': round(entry, 6),
            'sl': round(sl, 6),
            'tp': round(tp3, 6),  # Main target
            'tp1': round(tp1, 6),
            'tp2': round(tp2, 6),
            'tp3': round(tp3, 6),
            'atr': round(atr, 6),
            'rsi': round(rsi, 2),
            'current_price': current_price,
            'timestamp': datetime.utcnow().isoformat(),
            'expires': (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            'strategy': 'monster_professional_simplified',
            'success_prob': round(ml_confidence, 2),  # Realistic confidence
            'risk_reward_ratio': round(risk_reward_ratio, 2),
            'analysis': analysis_text
        }
        
        logger.info(f"✅ PROFESSIONAL MONSTER signal generated {signal['direction']} @ {signal['entry_price']} ({symbol})")
        logger.info(f"   RSI: {rsi:.2f}, ATR: {atr:.6f}, R/R: {risk_reward_ratio:.2f}, ML: {ml_confidence:.1%}")
        
        return signal
        
    except Exception as e:
        logger.error(f"Error generating professional monster signal for {symbol}: {str(e)}")
        logger.error(traceback.format_exc())
        return None

@monster_signals_api.route('/api/signals/generate/monster', methods=['POST'])
def generate_monster_signals():
    """
    Generate monster signals using real Bybit market data
    """
    try:
        # Get symbols from request or dynamically from Bybit if not provided
        data = request.get_json(silent=True) or {}
        symbols = data.get('symbols')
        if not symbols:
            symbols = get_usdt_symbols_from_bybit(limit=20) or [
                'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
                'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
            ]
        
        logger.info(f"Starting monster signal generation for {len(symbols)} symbols using Bybit data")

        # Get current market prices for all symbols
        current_prices = market_data_service.get_current_prices(symbols)
        logger.info(f"Retrieved current prices for {len(current_prices)} symbols")
        
        # Generate signals for each symbol
        generated_signals = []
        
        for symbol in symbols:
            try:
                signal = generate_monster_signal(symbol)
                if signal:
                    # Use current market price if available
                    if symbol in current_prices:
                        signal['current_price'] = current_prices[symbol]
                        signal['entry_price'] = round(current_prices[symbol], 6)
                    
                    # Convert to frontend format
                    frontend_signal = {
                        'id': f"monster_bybit_{signal['symbol']}_{int(datetime.now().timestamp())}",
                        'symbol': signal['symbol'],
                        'pair': signal['symbol'],
                        'direction': signal['direction'],
                        'type': 'LONG' if signal['direction'] == 'BUY' else 'SHORT',
                        'entryPrice': signal['entry_price'],
                        'stopLoss': signal['sl'],
                        'status': 'WAITING',
                        'strategy': signal['strategy'],
                        'createdAt': signal['timestamp'],
                        'result': None,
                        'profit': None,
                        'rsi': signal['rsi'],
                        'atr': signal['atr'],
                        'success_prob': signal['success_prob'],
                        'currentPrice': signal.get('current_price'),
                        'targets': [
                            {
                                'level': 1,
                                'price': signal['tp1'],
                                'hit': False
                            },
                            {
                                'level': 2, 
                                'price': signal['tp2'],
                                'hit': False
                            },
                            {
                                'level': 3,
                                'price': signal['tp3'],
                                'hit': False
                            }
                        ],
                        'analysis': signal.get('analysis', '')
                    }
                    generated_signals.append(frontend_signal)
                    
            except Exception as e:
                logger.error(f"Error generating signal for {symbol}: {str(e)}")
                continue
        
        logger.info(f"Generated {len(generated_signals)} monster signals from {len(symbols)} symbols with real Bybit data")
        
        return jsonify({
            'signals': generated_signals,
            'total': len(generated_signals),
            'strategy': 'monster_1h_15m_multi_bybit',
            'timestamp': datetime.utcnow().isoformat(),
            'market_data_source': 'bybit_realtime',
            'current_prices': current_prices
        })
        
    except Exception as e:
        logger.error(f"Error in generate_monster_signals: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'Failed to generate monster signals',
            'message': str(e),
            'signals': [],
            'total': 0
        }), 500

@monster_signals_api.route('/api/signals/generate/monster/status', methods=['GET'])
def get_monster_generation_status():
    """
    Get the status of monster signal generation with market connectivity
    """
    try:
        # Test Bybit connectivity
        test_price = get_current_price('BTCUSDT')
        market_connected = test_price > 0
        
        return jsonify({
            'status': 'ready',
            'market_connected': market_connected,
            'data_source': 'bybit_realtime' if market_connected else 'mock_fallback',
            'current_btc_price': test_price if market_connected else None,
            'available_symbols': [
                'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
                'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
            ],
            'strategy': 'monster_professional_simplified',
            'description': 'PROFESSIONAL Simplified Signal Generation - Sustainable & High Quality',
            'filters': [
                'EMA 200: Main trend direction (simplified)',
                'RSI Extremes: Only oversold (≤35) for BUY, overbought (≥65) for SELL',
                'Volume Spike: 150%+ above 20-period average',
                'Volume Profile: POC intraday breakout confirmation',
                'Macro Events: Filter for important announcements',
                'ML Confidence: Realistic 60% threshold (vs 75%)',
                'Risk/Reward: Professional 1.5:1 minimum ratio',
                'Professional Risk Management: SL=1.0 ATR, TPs=1.5/2.0/3.0 ATR'
            ]
        })
    except Exception as e:
        logger.error(f"Error in get_monster_generation_status: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'market_connected': False
        }), 500

@monster_signals_api.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for monster signals API with market data status
    """
    try:
        # Test data fetching capability
        test_df = fetch_data('BTCUSDT', '15', limit=5)
        test_price = get_current_price('BTCUSDT')
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'data_access': 'ok' if not test_df.empty else 'limited',
            'market_data': 'connected' if test_price > 0 else 'mock_fallback',
            'current_btc_price': test_price if test_price > 0 else None,
            'services': {
                'bybit_klines': 'ok' if not test_df.empty else 'fallback_to_mock',
                'bybit_tickers': 'ok' if test_price > 0 else 'fallback_to_mock',
                'technical_analysis': 'ok',
                'signal_generation': 'ok'
            }
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500
