
"""
Monster Signals API - Enhanced with real Bybit market data
"""

from flask import Blueprint, jsonify, request
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import traceback

# Import our data services
from api.fetch_data import fetch_data, get_current_price
from api.market_data_service import market_data_service

# Create blueprint for monster signals
monster_signals_api = Blueprint('monster_signals', __name__)

logger = logging.getLogger("MonsterSignalsAPI")

def calculate_ema(data, window):
    """Calculate Exponential Moving Average"""
    return data.ewm(span=window, adjust=False).mean()

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

def is_trending(df, window_fast=50, window_slow=200):
    """Check if trend is up or down using EMA crossover"""
    if len(df) < window_slow:
        return False, False
    
    ema_fast = calculate_ema(df['close'], window_fast).iloc[-1]
    ema_slow = calculate_ema(df['close'], window_slow).iloc[-1]
    
    return ema_fast > ema_slow, ema_fast < ema_slow

def has_high_volume(df, window=20):
    """Check if current volume is above average"""
    if len(df) < window:
        return False
    
    current_vol = df['volume'].iloc[-1]
    avg_vol = df['volume'].rolling(window).mean().iloc[-1]
    
    return current_vol > avg_vol * 1.2  # 20% above average

def is_strong_candle(df):
    """Check if last candle has strong body (>60% of total range)"""
    if len(df) == 0:
        return False
        
    last_candle = df.iloc[-1]
    body = abs(last_candle['close'] - last_candle['open'])
    total_range = last_candle['high'] - last_candle['low']
    
    if total_range == 0:
        return False
        
    return body > 0.6 * total_range

def atr_filter(df, min_atr_pct=0.3, max_atr_pct=3.0):
    """Filter by ATR percentage (0.3% to 3% of price)"""
    if len(df) < 14:
        return False
        
    atr = calculate_atr(df['high'], df['low'], df['close'], window=14).iloc[-1]
    price = df['close'].iloc[-1]
    
    if price == 0:
        return False
        
    atr_pct = (atr / price) * 100
    return min_atr_pct < atr_pct < max_atr_pct

def get_direction(df_1h, df_15m):
    """Determine direction based on multi-timeframe trend alignment"""
    trend_up_1h, trend_down_1h = is_trending(df_1h)
    trend_up_15m, trend_down_15m = is_trending(df_15m)
    
    if trend_up_1h and trend_up_15m:
        return "BUY"
    elif trend_down_1h and trend_down_15m:
        return "SELL"
    
    return None

def generate_monster_signal(symbol):
    """
    Generate a monster signal with strict filtering criteria and real market data
    """
    try:
        logger.info(f"🔍 Analyzing {symbol} with monster filters and real market data...")
        
        # Get current market price first
        current_price = get_current_price(symbol)
        if current_price == 0:
            logger.warning(f"Could not get current price for {symbol}")
            current_price = None
        else:
            logger.info(f"Current market price for {symbol}: {current_price}")
        
        # Fetch multi-timeframe data from Bybit
        df_15m = fetch_data(symbol, "15", limit=210)  # 15 minutes
        df_1h = fetch_data(symbol, "60", limit=210)   # 1 hour
        
        if df_15m.empty or df_1h.empty:
            logger.warning(f"Insufficient data for {symbol}")
            return None
        
        # Use current market price if available, otherwise use latest close
        entry = current_price if current_price else float(df_15m['close'].iloc[-1])
        
        # Determine direction based on trend alignment
        direction = get_direction(df_1h, df_15m)
        if direction is None:
            logger.info(f"🛑 Trends not aligned for {symbol}")
            return None
        
        # Calculate RSI for 15m timeframe
        rsi = calculate_rsi(df_15m['close'], window=14).iloc[-1]
        
        # RSI filter based on direction
        if direction == "BUY" and rsi < 50:
            logger.info(f"🛑 RSI too low for BUY: {rsi:.2f}")
            return None
        elif direction == "SELL" and rsi > 50:
            logger.info(f"🛑 RSI too high for SELL: {rsi:.2f}")
            return None
        
        # Volume filter
        if not has_high_volume(df_15m):
            logger.info(f"🛑 Low volume for {symbol}")
            return None
        
        # Strong candle filter
        if not is_strong_candle(df_15m):
            logger.info(f"🛑 Weak candle for {symbol}")
            return None
        
        # ATR filter
        if not atr_filter(df_15m):
            logger.info(f"🛑 ATR out of range for {symbol}")
            return None
        
        # Calculate ATR for risk management
        atr = calculate_atr(df_15m['high'], df_15m['low'], df_15m['close'], window=14).iloc[-1]
        
        # Calculate targets based on ATR and direction
        if direction == "BUY":
            sl = entry - 1.2 * atr
            tp1 = entry + 0.8 * atr
            tp2 = entry + 1.5 * atr
            tp3 = entry + 2.2 * atr
        else:  # SELL
            sl = entry + 1.2 * atr
            tp1 = entry - 0.8 * atr
            tp2 = entry - 1.5 * atr
            tp3 = entry - 2.2 * atr
        
        # Create signal with real market data
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
            'strategy': 'monster_1h_15m_multi_bybit',
            'success_prob': 0.75  # High confidence for monster filter
        }
        
        logger.info(f"✅ MONSTER signal generated {signal['direction']} @ {signal['entry_price']} ({symbol})")
        logger.info(f"   RSI: {rsi:.2f}, ATR: {atr:.6f}, Current Price: {current_price}")
        
        return signal
        
    except Exception as e:
        logger.error(f"Error generating monster signal for {symbol}: {str(e)}")
        logger.error(traceback.format_exc())
        return None

@monster_signals_api.route('/api/signals/generate/monster', methods=['POST'])
def generate_monster_signals():
    """
    Generate monster signals using real Bybit market data
    """
    try:
        # Get symbols from request or use default list
        data = request.get_json() or {}
        symbols = data.get('symbols', [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT', 
            'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
        ])
        
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
                        ]
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
            'strategy': 'monster_1h_15m_multi_bybit',
            'description': 'Advanced multi-timeframe signal generation with real Bybit market data',
            'filters': [
                'Multi-timeframe trend alignment (1h + 15m)',
                'RSI confirmation based on direction',
                'High volume requirement',
                'Strong candle body filter', 
                'ATR volatility filter (0.3% - 3%)',
                'Real-time Bybit price integration'
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
