
import json
from datetime import datetime
from api.fetch_data import fetch_data
from utils.data import get_binance_data, get_bybit_data
from indicators.optimized import rsi_numba
import numpy as np
import pandas as pd
import os

# Load configuration
config_path = os.path.join(os.path.dirname(__file__), '../config.json')
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    # Default configuration if file doesn't exist
    config = {
        "moving_avg_short": 10,
        "moving_avg_long": 50,
        "rsi_period": 14,
        "account_balance": 1000,
        "risk_per_trade": 0.02,
        "leverage_range": {
            "conservador": 3,
            "moderado": 5,
            "agressivo": 10
        }
    }

def calculate_targets(entry_price, atr, direction):
    """
    Calculate stop loss and take profit targets based on ATR.
    """
    if direction == "buy" or direction == "BUY" or direction == "long" or direction == "LONG":
        sl = entry_price - atr
        tp1 = entry_price + atr
        tp2 = entry_price + 2 * atr
        tp3 = entry_price + 3 * atr
    else:
        sl = entry_price + atr
        tp1 = entry_price - atr
        tp2 = entry_price - 2 * atr
        tp3 = entry_price - 3 * atr
    return round(sl, 2), round(tp1, 2), round(tp2, 2), round(tp3, 2)

def decide_leverage(rsi, sma_diff):
    """
    Determine leverage based on RSI and SMA difference.
    """
    if rsi > 70 and abs(sma_diff) > 0.01:
        return config["leverage_range"]["agressivo"]
    elif rsi > 60:
        return config["leverage_range"]["moderado"]
    else:
        return config["leverage_range"]["conservador"]

def SMA(series, period):
    """
    Calculate Simple Moving Average.
    """
    return series.rolling(window=period).mean()

def RSI(series, period):
    """
    Calculate Relative Strength Index.
    """
    delta = series.diff()
    up = delta.clip(lower=0)
    down = -delta.clip(upper=0)
    gain = up.ewm(com=period-1, adjust=False).mean()
    loss = down.ewm(com=period-1, adjust=False).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def get_current_price(df):
    """
    Get the latest closing price from historical data.
    """
    if df is None or df.empty:
        return 0.0
    return float(df['close'].iloc[-1])

def generate_signal(symbol):
    """
    Generate trading signal based on technical indicators.
    """
    try:
        # Try to get data from Bybit first
        df = fetch_data(symbol, "15m")
        
        # If Bybit data is unavailable, try Binance
        if df is None or df.empty:
            df = get_bybit_data(symbol=symbol, interval="15m")
        
        # If both are unavailable, try Binance as last resort
        if df is None or df.empty:
            df = get_binance_data(symbol=symbol, interval="15m")
            
        if df is None or df.empty:
            print(f"Could not fetch data for {symbol}")
            return None
        
        # Calculate indicators
        close = df['close'].astype(float)
        sma_short = SMA(close, config["moving_avg_short"]).iloc[-1]
        sma_long = SMA(close, config["moving_avg_long"]).iloc[-1]
        
        # Use optimized RSI if available, otherwise fallback to pandas implementation
        try:
            rsi = rsi_numba(close.values, config["rsi_period"])[-1]
        except:
            rsi = RSI(close, config["rsi_period"]).iloc[-1]
            
        sma_diff = (sma_short - sma_long) / close.iloc[-1]
        
        # Determine signal direction
        direction = "buy" if sma_short > sma_long else "sell"
        
        # Get current price
        entry_price = get_current_price(df)
        
        # Calculate ATR
        high = df['high'].astype(float)
        low = df['low'].astype(float)
        tr1 = abs(high - low)
        tr2 = abs(high - close.shift(1))
        tr3 = abs(low - close.shift(1))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(window=14).mean().iloc[-1]
        
        # Calculate targets
        sl, tp1, tp2, tp3 = calculate_targets(entry_price, atr, direction)
        
        # Determine leverage
        leverage = decide_leverage(rsi, sma_diff)
        
        # Create and return signal
        return {
            "symbol": symbol,
            "signal": direction,
            "entry_price": round(entry_price, 2),
            "sl": sl,
            "tp1": tp1,
            "tp2": tp2,
            "tp3": tp3,
            "rsi": round(rsi, 2),
            "sma_diff": round(sma_diff, 4),
            "atr": round(atr, 2),
            "leverage": leverage,
            "risk_pct": config["risk_per_trade"],
            "time": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error generating signal for {symbol}: {str(e)}")
        return None
