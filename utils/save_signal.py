"""
Advanced signal saving and evaluation module for Trade Alerts Ninja.
Handles saving signals from multiple strategies, automatic result evaluation,
and ensures compatibility with frontend expectations.
"""

import os
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

logger = logging.getLogger("SignalSaver")

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
CSV_PATH = DATA_DIR / "historical_signals.csv"


def save_signal(signal: Dict) -> bool:
    """
    Save a trading signal to the historical CSV file.

    Args:
        signal (dict): Signal with keys: timestamp, symbol, direction, entryPrice, takeProfit, stopLoss, strategy

    Returns:
        bool: True if saved, False otherwise
    """
    try:
        df = pd.DataFrame([signal])
        write_header = not CSV_PATH.exists()
        df.to_csv(CSV_PATH, mode='a', header=write_header, index=False)
        logger.info(f"✅ Signal saved: {signal['symbol']} @ {signal['entryPrice']}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to save signal: {e}")
        return False


def update_signal_result(timestamp: str, result: str) -> bool:
    """
    Update the result (WINNER, LOSER, etc.) of a signal based on timestamp.

    Args:
        timestamp (str): ISO timestamp string
        result (str): One of ['WINNER', 'LOSER', 'PARTIAL', 'FALSE']

    Returns:
        bool: True if updated
    """
    try:
        df = pd.read_csv(CSV_PATH)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        ts = pd.to_datetime(timestamp)

        if ts not in df['timestamp'].values:
            logger.warning(f"⛔ Timestamp not found: {timestamp}")
            return False

        df.loc[df['timestamp'] == ts, 'result'] = result
        df.to_csv(CSV_PATH, index=False)
        logger.info(f"📌 Updated result for {timestamp} -> {result}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to update result: {e}")
        return False


def evaluate_signal_result(df_candles: pd.DataFrame, entry_price: float, direction: str,
                            sl: float, tp: float) -> str:
    """
    Evaluate outcome of a signal based on candle data after entry.

    Args:
        df_candles (pd.DataFrame): OHLCV DataFrame
        entry_price (float): Entry price
        direction (str): 'BUY' or 'SELL'
        sl (float): Stop loss
        tp (float): Take profit

    Returns:
        str: Result category
    """
    hit_tp = False
    hit_partial = False

    for i in range(len(df_candles)):
        high = df_candles.iloc[i]['high']
        low = df_candles.iloc[i]['low']

        if direction == 'BUY':
            if low <= sl:
                return 'LOSER'
            if high >= tp:
                return 'WINNER'
            if high >= (entry_price + (tp - entry_price) * 0.5):
                hit_partial = True

        elif direction == 'SELL':
            if high >= sl:
                return 'LOSER'
            if low <= tp:
                return 'WINNER'
            if low <= (entry_price - (entry_price - tp) * 0.5):
                hit_partial = True

    return 'PARTIAL' if hit_partial else 'FALSE'


def auto_evaluate_latest_signal(fetch_func) -> Optional[str]:
    """
    Automatically evaluate last signal using fresh candle data.
    Requires a fetch_data(symbol, timeframe) function.

    Args:
        fetch_func (callable): Function to fetch candles -> DataFrame

    Returns:
        Optional[str]: Result if evaluated, else None
    """
    try:
        if not CSV_PATH.exists():
            return None

        df_signals = pd.read_csv(CSV_PATH)
        if df_signals.empty:
            return None

        last = df_signals.iloc[-1]

        symbol = last['symbol']
        direction = last['direction']
        entry = float(last['entryPrice'])
        tp = float(last['takeProfit'])
        sl = float(last['stopLoss'])
        timestamp = last['timestamp']

        df_candles = fetch_func(symbol, '15m')
        df_candles = df_candles[df_candles['timestamp'] > timestamp]

        if df_candles.empty:
            logger.warning("⚠️ No candle data after signal timestamp")
            return None

        result = evaluate_signal_result(df_candles, entry, direction, sl, tp)
        update_signal_result(timestamp, result)
        return result

    except Exception as e:
        logger.error(f"Error during auto evaluation: {e}")
        return None
