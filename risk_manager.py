# risk_manager.py

from ta.volatility import AverageTrueRange
import pandas as pd

def calculate_atr(df: pd.DataFrame, window: int = 14) -> float:
    """
    Calcula o ATR (Average True Range) para o DataFrame.
    """
    if df is None or df.empty or len(df) < window:
        return 0
    atr = AverageTrueRange(df['high'], df['low'], df['close'], window=window).average_true_range().iloc[-1]
    return atr

def define_trade_levels(df: pd.DataFrame, direction: str, rr: float = 2.0):
    """
    Define os níveis de entrada, SL e TPs com base em ATR e direção da operação.
    """
    if df is None or df.empty:
        return None

    atr = calculate_atr(df)
    close = df['close'].iloc[-1]

    # margem de entrada para evitar slippage
    entry_offset = atr * 0.25
    sl_distance = atr * 1.2
    tp_base = sl_distance * rr

    if direction == 'UP':
        entry = close - entry_offset
        sl = entry - sl_distance
        tp1 = entry + (tp_base * 0.6)
        tp2 = entry + (tp_base * 1.0)
        tp3 = entry + (tp_base * 1.4)
    elif direction == 'DOWN':
        entry = close + entry_offset
        sl = entry + sl_distance
        tp1 = entry - (tp_base * 0.6)
        tp2 = entry - (tp_base * 1.0)
        tp3 = entry - (tp_base * 1.4)
    else:
        return None

    return {
        "entry": entry,
        "sl": sl,
        "tp1": tp1,
        "tp2": tp2,
        "tp3": tp3,
        "atr": atr,
        "risk_reward_ratio": rr,
        "risk": abs(entry - sl) / entry
    }