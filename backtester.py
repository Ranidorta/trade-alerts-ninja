
import pandas as pd
import numpy as np
import requests
import json
from datetime import datetime, timedelta
import os
import sys

# Add project root to path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the real signal generator and utilities
try:
    from signals.signal_generator import generate_signal, SMA, RSI
    from utils.indicators import calculate_targets
except ImportError:
    print("Warning: Could not import signal generator modules. Using fallback implementations.")
    
    def SMA(series, period):
        return series.rolling(window=period).mean()
    
    def RSI(series, period):
        delta = series.diff()
        up = delta.clip(lower=0)
        down = -delta.clip(upper=0)
        gain = up.ewm(com=period-1, adjust=False).mean()
        loss = down.ewm(com=period-1, adjust=False).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

# Load configuration
config_path = 'config.json'
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    config = {
        "moving_avg_short": 10,
        "moving_avg_long": 50,
        "rsi_period": 14,
        "risk_per_trade": 0.02,
        "leverage_range": {
            "conservador": 3,
            "moderado": 5,
            "agressivo": 10
        }
    }

# Backtesting configuration
SYMBOL = "BTCUSDT"
INTERVAL = "15"  # minutes
START_DATE = "2024-01-01"
END_DATE = "2024-05-01"
RISK_PER_TRADE = config.get("risk_per_trade", 0.02)
ACCOUNT_START = 10000

def fetch_klines(symbol, start, end, interval="15"):
    """
    Fetch historical candlestick data from Bybit API.
    """
    url = "https://api.bybit.com/v5/market/kline"
    params = {
        "category": "linear",
        "symbol": symbol,
        "interval": interval,
        "start": int(start.timestamp() * 1000),
        "end": int(end.timestamp() * 1000),
        "limit": 1000
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        candles = data.get("result", {}).get("list", [])
        
        if not candles:
            return pd.DataFrame()
            
        df = pd.DataFrame(candles, columns=[
            "open_time", "open", "high", "low", "close", "volume", "turnover"
        ])
        
        df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
        df = df.astype({
            "open": float,
            "high": float,
            "low": float,
            "close": float,
            "volume": float,
            "turnover": float
        })
        
        return df.sort_values("open_time").reset_index(drop=True)
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        return pd.DataFrame()

def calculate_targets(entry_price, atr, direction):
    """
    Calculate stop loss and take profit targets based on ATR.
    """
    if direction == "BUY":
        sl = entry_price - atr
        tp1 = entry_price + 0.5 * atr
        tp2 = entry_price + 1.0 * atr
        tp3 = entry_price + 1.5 * atr
    else:
        sl = entry_price + atr
        tp1 = entry_price - 0.5 * atr
        tp2 = entry_price - 1.0 * atr
        tp3 = entry_price - 1.5 * atr
    
    return round(sl, 6), round(tp1, 6), round(tp2, 6), round(tp3, 6)

def simulate_trade(df, entry_idx, direction, entry, sl, tp1, tp2, tp3, max_minutes=60):
    """
    Simulate trade execution after signal generation.
    Returns result and exit price.
    """
    if entry_idx + max_minutes >= len(df):
        max_minutes = len(df) - entry_idx - 1
    
    sliced = df.iloc[entry_idx + 1:entry_idx + max_minutes + 1]
    
    for i, row in sliced.iterrows():
        if direction == "BUY":
            # Check stop loss first
            if row["low"] <= sl:
                return "LOSER", sl
            # Check take profits
            elif row["high"] >= tp3:
                return "WINNER", tp3
            elif row["high"] >= tp2:
                return "PARTIAL", tp2
            elif row["high"] >= tp1:
                return "PARTIAL", tp1
        else:  # SELL
            # Check stop loss first
            if row["high"] >= sl:
                return "LOSER", sl
            # Check take profits
            elif row["low"] <= tp3:
                return "WINNER", tp3
            elif row["low"] <= tp2:
                return "PARTIAL", tp2
            elif row["low"] <= tp1:
                return "PARTIAL", tp1
    
    # No target or stop hit within time limit
    return "FALSE", entry

def generate_trading_signal(window_df):
    """
    Generate trading signal using the same logic as the real agent.
    """
    if len(window_df) < max(config["moving_avg_long"], config["rsi_period"]):
        return None
    
    close = window_df["close"]
    high = window_df["high"]
    low = window_df["low"]
    
    # Calculate indicators
    sma_short = SMA(close, config["moving_avg_short"]).iloc[-1]
    sma_long = SMA(close, config["moving_avg_long"]).iloc[-1]
    rsi = RSI(close, config["rsi_period"]).iloc[-1]
    
    # Calculate ATR
    tr1 = abs(high - low)
    tr2 = abs(high - close.shift(1))
    tr3 = abs(low - close.shift(1))
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=14).mean().iloc[-1]
    
    # Signal generation logic
    direction = None
    if sma_short > sma_long and rsi > 50 and rsi < 70:
        direction = "BUY"
    elif sma_short < sma_long and rsi < 50 and rsi > 30:
        direction = "SELL"
    
    if not direction:
        return None
    
    entry_price = close.iloc[-1]
    sl, tp1, tp2, tp3 = calculate_targets(entry_price, atr, direction)
    
    return {
        "direction": direction,
        "entry_price": entry_price,
        "sl": sl,
        "tp1": tp1,
        "tp2": tp2,
        "tp3": tp3,
        "atr": atr,
        "rsi": rsi,
        "sma_diff": (sma_short - sma_long) / entry_price
    }

def run_backtest():
    """
    Run the complete backtest simulation.
    """
    print(f"🚀 Starting backtest for {SYMBOL} from {START_DATE} to {END_DATE}")
    print("=" * 60)
    
    # 1. Download historical data
    print("📥 Downloading historical candles...")
    start_dt = datetime.strptime(START_DATE, "%Y-%m-%d")
    end_dt = datetime.strptime(END_DATE, "%Y-%m-%d")
    
    df_all = []
    current = start_dt
    
    while current < end_dt:
        batch_end = min(current + timedelta(days=5), end_dt)
        print(f"   Fetching {current.strftime('%Y-%m-%d')} to {batch_end.strftime('%Y-%m-%d')}")
        
        df_batch = fetch_klines(SYMBOL, current, batch_end, interval=INTERVAL)
        if not df_batch.empty:
            df_all.append(df_batch)
        
        current = batch_end
    
    if not df_all:
        print("❌ No data downloaded. Exiting.")
        return
    
    df_full = pd.concat(df_all).drop_duplicates(subset=["open_time"]).reset_index(drop=True)
    print(f"✅ Downloaded {len(df_full)} candles")
    
    # 2. Generate signals and simulate trades
    print("🔍 Generating signals and simulating trades...")
    results = []
    balance = ACCOUNT_START
    equity_curve = [balance]
    
    # Start after enough data for indicators
    window_size = max(config["moving_avg_long"], config["rsi_period"]) + 10
    
    for i in range(window_size, len(df_full) - 60):
        # Get window for signal generation
        window = df_full.iloc[i - window_size:i].copy()
        
        # Generate signal
        signal = generate_trading_signal(window)
        if not signal:
            continue
        
        # Trade parameters
        direction = signal["direction"]
        entry = signal["entry_price"]
        sl = signal["sl"]
        tp1 = signal["tp1"]
        tp2 = signal["tp2"]
        tp3 = signal["tp3"]
        
        # Calculate position size based on risk
        risk_amount = balance * RISK_PER_TRADE
        stop_distance = abs(entry - sl)
        if stop_distance == 0:
            continue
            
        position_size = risk_amount / stop_distance
        
        # Simulate the trade
        result, exit_price = simulate_trade(
            df_full, i, direction, entry, sl, tp1, tp2, tp3, max_minutes=60
        )
        
        # Calculate PnL
        if direction == "BUY":
            pnl = (exit_price - entry) * position_size
        else:
            pnl = (entry - exit_price) * position_size
        
        # Apply risk management for losers
        if result == "LOSER":
            pnl = -risk_amount
        
        balance += pnl
        equity_curve.append(balance)
        
        results.append({
            "time": df_full.iloc[i]["open_time"],
            "direction": direction,
            "entry": entry,
            "exit": exit_price,
            "result": result,
            "position_size": position_size,
            "pnl": pnl,
            "balance": balance,
            "rsi": signal["rsi"],
            "atr": signal["atr"]
        })
        
        if len(results) % 10 == 0:
            print(f"   Processed {len(results)} signals...")
    
    # 3. Calculate statistics
    print("\n📊 Calculating performance metrics...")
    df_results = pd.DataFrame(results)
    
    if df_results.empty:
        print("❌ No trades generated during backtest period")
        return
    
    # Count results
    result_counts = df_results["result"].value_counts()
    winners = result_counts.get("WINNER", 0)
    losers = result_counts.get("LOSER", 0)
    partials = result_counts.get("PARTIAL", 0)
    false_signals = result_counts.get("FALSE", 0)
    
    total_trades = len(df_results)
    completed_trades = winners + losers + partials
    
    # Calculate metrics
    accuracy = (winners / completed_trades * 100) if completed_trades > 0 else 0
    win_rate = ((winners + partials) / completed_trades * 100) if completed_trades > 0 else 0
    
    total_pnl = balance - ACCOUNT_START
    max_balance = max(equity_curve)
    min_balance = min(equity_curve)
    max_drawdown = ((max_balance - min_balance) / max_balance * 100) if max_balance > 0 else 0
    
    roi = (total_pnl / ACCOUNT_START * 100)
    
    # 4. Display results
    print("\n" + "=" * 60)
    print(f"🎯 BACKTEST RESULTS - {SYMBOL} ({START_DATE} to {END_DATE})")
    print("=" * 60)
    print(f"📈 Total Trades: {total_trades}")
    print(f"✅ Winners: {winners}")
    print(f"❌ Losers: {losers}")
    print(f"⚠️  Partials: {partials}")
    print(f"🚫 False Signals: {false_signals}")
    print(f"📊 Accuracy: {accuracy:.2f}%")
    print(f"🏆 Win Rate: {win_rate:.2f}%")
    print(f"💰 Final Balance: ${balance:,.2f}")
    print(f"📈 Total PnL: ${total_pnl:,.2f}")
    print(f"📊 ROI: {roi:.2f}%")
    print(f"📉 Max Drawdown: {max_drawdown:.2f}%")
    print("=" * 60)
    
    # 5. Save results
    print("\n💾 Saving results...")
    
    # Save equity curve
    equity_df = pd.DataFrame({"balance": equity_curve})
    equity_df.to_csv("equity_curve.csv", index=False)
    
    # Save trade details
    df_results.to_csv("backtest_trades.csv", index=False)
    
    # Save summary
    summary = {
        "symbol": SYMBOL,
        "period": f"{START_DATE} to {END_DATE}",
        "total_trades": total_trades,
        "winners": winners,
        "losers": losers,
        "partials": partials,
        "false_signals": false_signals,
        "accuracy": accuracy,
        "win_rate": win_rate,
        "starting_balance": ACCOUNT_START,
        "final_balance": balance,
        "total_pnl": total_pnl,
        "roi": roi,
        "max_drawdown": max_drawdown
    }
    
    with open("backtest_summary.json", "w") as f:
        json.dump(summary, f, indent=2, default=str)
    
    print("✅ Results saved:")
    print("   - equity_curve.csv (balance progression)")
    print("   - backtest_trades.csv (detailed trade log)")
    print("   - backtest_summary.json (performance summary)")
    
    return summary

if __name__ == "__main__":
    try:
        run_backtest()
    except KeyboardInterrupt:
        print("\n⏹️  Backtest interrupted by user")
    except Exception as e:
        print(f"\n❌ Error during backtest: {str(e)}")
        import traceback
        traceback.print_exc()
