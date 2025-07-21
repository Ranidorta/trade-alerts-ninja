#!/usr/bin/env python3
"""
Classic Signals Agent
Backend agent for generating classic technical analysis signals
Uses rigid rules without ML for reliable signal generation
"""

import json
import csv
import os
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import requests
import time
from typing import Dict, Optional, List, Tuple

app = Flask(__name__)
CORS(app)

# Configuration
BINANCE_API_BASE = "https://api.binance.com/api/v3"
CLASSIC_HISTORY_FILE = "signals_classic_history.csv"

# Symbol list for rotation
SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "DOGEUSDT", 
    "BNBUSDT", "XRPUSDT", "MATICUSDT", "DOTUSDT", "LINKUSDT"
]

def get_klines(symbol: str, interval: str, limit: int = 200) -> pd.DataFrame:
    """Fetch klines data from Binance API"""
    try:
        url = f"{BINANCE_API_BASE}/klines"
        params = {
            'symbol': symbol,
            'interval': interval,
            'limit': limit
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        df = pd.DataFrame(data, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_asset_volume', 'number_of_trades',
            'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
        ])
        
        # Convert to numeric
        numeric_columns = ['open', 'high', 'low', 'close', 'volume']
        for col in numeric_columns:
            df[col] = pd.to_numeric(df[col])
            
        return df
        
    except Exception as e:
        print(f"Error fetching klines for {symbol}: {e}")
        return pd.DataFrame()

def calculate_ema(prices: pd.Series, period: int) -> pd.Series:
    """Calculate Exponential Moving Average"""
    return prices.ewm(span=period).mean()

def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """Calculate RSI"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Average True Range"""
    high_low = df['high'] - df['low']
    high_close = np.abs(df['high'] - df['close'].shift())
    low_close = np.abs(df['low'] - df['close'].shift())
    
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr = true_range.rolling(window=period).mean()
    return atr

def get_ema_trend(df_1h: pd.DataFrame, df_15m: pd.DataFrame) -> str:
    """Check EMA trend on both timeframes"""
    try:
        # 1h EMA trend
        ema50_1h = calculate_ema(df_1h['close'], 50)
        ema200_1h = calculate_ema(df_1h['close'], 200)
        
        # 15m EMA trend
        ema50_15m = calculate_ema(df_15m['close'], 50)
        ema200_15m = calculate_ema(df_15m['close'], 200)
        
        # Check if both timeframes align
        if (ema50_1h.iloc[-1] > ema200_1h.iloc[-1] and 
            ema50_15m.iloc[-1] > ema200_15m.iloc[-1]):
            return "BULLISH"
        elif (ema50_1h.iloc[-1] < ema200_1h.iloc[-1] and 
              ema50_15m.iloc[-1] < ema200_15m.iloc[-1]):
            return "BEARISH"
        else:
            return "NEUTRAL"
            
    except Exception as e:
        print(f"Error calculating EMA trend: {e}")
        return "NEUTRAL"

def check_volume_spike(df: pd.DataFrame, threshold: float = 0.20) -> bool:
    """Check if volume is above 20% of 20-period average"""
    try:
        volume_avg = df['volume'].rolling(window=20).mean()
        current_volume = df['volume'].iloc[-1]
        avg_volume = volume_avg.iloc[-1]
        
        return current_volume > (avg_volume * (1 + threshold))
    except:
        return False

def check_strong_candle(df: pd.DataFrame) -> bool:
    """Check if candle body is >60% of the range"""
    try:
        last_candle = df.iloc[-1]
        body_size = abs(last_candle['close'] - last_candle['open'])
        range_size = last_candle['high'] - last_candle['low']
        
        if range_size == 0:
            return False
            
        body_ratio = body_size / range_size
        return body_ratio > 0.60
    except:
        return False

def calculate_confidence(rsi: float, volume_spike: bool, strong_candle: bool, 
                        atr_ratio: float, trend_strength: str) -> float:
    """Calculate confidence based on technical indicators"""
    confidence = 0.5  # Base confidence
    
    # RSI contribution (closer to 50 is better for classic)
    rsi_distance = abs(rsi - 50)
    if rsi_distance <= 5:
        confidence += 0.2
    elif rsi_distance <= 10:
        confidence += 0.1
    
    # Volume spike
    if volume_spike:
        confidence += 0.1
    
    # Strong candle
    if strong_candle:
        confidence += 0.1
    
    # ATR volatility (sweet spot between 0.5% and 2.5%)
    if 0.005 <= atr_ratio <= 0.025:
        confidence += 0.1
    
    # Trend strength
    if trend_strength in ["BULLISH", "BEARISH"]:
        confidence += 0.1
    
    return min(confidence, 0.95)  # Cap at 95%

def save_classic_signal(signal_data: Dict):
    """Save classic signal to CSV history"""
    try:
        file_exists = os.path.exists(CLASSIC_HISTORY_FILE)
        
        with open(CLASSIC_HISTORY_FILE, 'a', newline='') as csvfile:
            fieldnames = [
                'timestamp', 'symbol', 'direction', 'entry_price', 
                'stop_loss', 'tp1', 'tp2', 'tp3', 'confidence', 'strategy'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            if not file_exists:
                writer.writeheader()
            
            # Prepare data for CSV
            csv_data = {
                'timestamp': datetime.now().isoformat(),
                'symbol': signal_data['symbol'],
                'direction': signal_data['direction'],
                'entry_price': signal_data['entry_price'],
                'stop_loss': signal_data['stop_loss'],
                'tp1': signal_data['targets'][0] if len(signal_data['targets']) > 0 else None,
                'tp2': signal_data['targets'][1] if len(signal_data['targets']) > 1 else None,
                'tp3': signal_data['targets'][2] if len(signal_data['targets']) > 2 else None,
                'confidence': signal_data['confidence'],
                'strategy': signal_data['strategy']
            }
            
            writer.writerow(csv_data)
            print(f"✅ Classic signal saved to {CLASSIC_HISTORY_FILE}")
            
    except Exception as e:
        print(f"❌ Error saving classic signal: {e}")

@app.route('/generate_classic_signal', methods=['GET'])
def generate_classic_signal():
    """Generate classic technical analysis signal"""
    try:
        # Select random symbol for diversity
        symbol = np.random.choice(SYMBOLS)
        
        # Get data for both timeframes
        df_1h = get_klines(symbol, '1h', 200)
        df_15m = get_klines(symbol, '15m', 200)
        
        if df_1h.empty or df_15m.empty:
            return jsonify({"message": "No valid classic signal now - data unavailable"})
        
        # Current price
        current_price = float(df_15m['close'].iloc[-1])
        
        # Calculate indicators
        atr_15m = calculate_atr(df_15m)
        current_atr = atr_15m.iloc[-1]
        atr_ratio = current_atr / current_price
        
        rsi_15m = calculate_rsi(df_15m['close'])
        current_rsi = rsi_15m.iloc[-1]
        
        # Check trend on both timeframes
        trend = get_ema_trend(df_1h, df_15m)
        
        # Check volume and candle strength
        volume_spike = check_volume_spike(df_15m)
        strong_candle = check_strong_candle(df_15m)
        
        # Classic rules validation
        rsi_valid = 45 <= current_rsi <= 55
        atr_valid = 0.003 <= atr_ratio <= 0.03  # 0.3% to 3%
        trend_valid = trend in ["BULLISH", "BEARISH"]
        
        print(f"🔍 Classic Analysis for {symbol}:")
        print(f"   RSI: {current_rsi:.2f} (Valid: {rsi_valid})")
        print(f"   ATR Ratio: {atr_ratio*100:.3f}% (Valid: {atr_valid})")
        print(f"   Trend: {trend} (Valid: {trend_valid})")
        print(f"   Volume Spike: {volume_spike}")
        print(f"   Strong Candle: {strong_candle}")
        
        # All conditions must be met for classic signal
        if all([rsi_valid, atr_valid, trend_valid, volume_spike, strong_candle]):
            
            # Determine direction based on trend
            direction = "BUY" if trend == "BULLISH" else "SELL"
            
            # Calculate stop loss and targets
            if direction == "BUY":
                stop_loss = current_price - (current_atr * 1.2)
                targets = [
                    current_price + (current_atr * 0.8),  # TP1
                    current_price + (current_atr * 1.5),  # TP2
                    current_price + (current_atr * 2.2)   # TP3
                ]
            else:  # SELL
                stop_loss = current_price + (current_atr * 1.2)
                targets = [
                    current_price - (current_atr * 0.8),  # TP1
                    current_price - (current_atr * 1.5),  # TP2
                    current_price - (current_atr * 2.2)   # TP3
                ]
            
            # Calculate confidence
            confidence = calculate_confidence(
                current_rsi, volume_spike, strong_candle, atr_ratio, trend
            )
            
            signal_data = {
                "symbol": symbol,
                "direction": direction,
                "entry_price": round(current_price, 6),
                "stop_loss": round(stop_loss, 6),
                "targets": [round(target, 6) for target in targets],
                "confidence": round(confidence, 3),
                "strategy": "classic_ai"
            }
            
            # Save to history
            save_classic_signal(signal_data)
            
            print(f"✅ Classic signal generated for {symbol}: {direction} at {current_price}")
            return jsonify(signal_data)
        
        else:
            print(f"❌ No valid classic signal for {symbol} - conditions not met")
            return jsonify({"message": "No valid classic signal now"})
            
    except Exception as e:
        print(f"❌ Error generating classic signal: {e}")
        return jsonify({"message": "No valid classic signal now - error occurred"})

@app.route('/classic_signals_health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "agent": "classic_signals",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/classic_signals_history', methods=['GET'])
def get_classic_history():
    """Get classic signals history"""
    try:
        if not os.path.exists(CLASSIC_HISTORY_FILE):
            return jsonify([])
        
        df = pd.read_csv(CLASSIC_HISTORY_FILE)
        return jsonify(df.to_dict('records'))
        
    except Exception as e:
        print(f"Error reading classic history: {e}")
        return jsonify([])

if __name__ == '__main__':
    print("🚀 Starting Classic Signals Agent...")
    print(f"📊 Monitoring {len(SYMBOLS)} symbols")
    print(f"💾 History saved to: {CLASSIC_HISTORY_FILE}")
    app.run(host='0.0.0.0', port=5001, debug=True)