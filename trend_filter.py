# trend_filter.py

from ta.trend import EMAIndicator, ADXIndicator
import pandas as pd

def get_trend(df: pd.DataFrame) -> str:
    """
    Detecta a tendência com base em EMA e ADX.
    Retorna: 'UP', 'DOWN' ou None
    """
    if df is None or df.empty or len(df) < 50:
        return None

    ema_fast = EMAIndicator(df['close'], window=20).ema_indicator()
    ema_slow = EMAIndicator(df['close'], window=50).ema_indicator()
    adx = ADXIndicator(df['high'], df['low'], df['close'], window=14).adx()

    last_ema_fast = ema_fast.iloc[-1]
    last_ema_slow = ema_slow.iloc[-1]
    last_adx = adx.iloc[-1]

    if last_adx < 20:
        return None

    if last_ema_fast > last_ema_slow:
        return 'UP'
    elif last_ema_fast < last_ema_slow:
        return 'DOWN'
    else:
        return None

def detect_structure(df: pd.DataFrame) -> str:
    """
    Detecta estrutura HH/HL ou LH/LL para reforçar leitura da tendência.
    Retorna 'UP', 'DOWN' ou None.
    """
    closes = df['close'].iloc[-5:]
    highs = df['high'].iloc[-5:]
    lows = df['low'].iloc[-5:]

    if highs.is_monotonic_increasing and lows.is_monotonic_increasing:
        return 'UP'
    elif highs.is_monotonic_decreasing and lows.is_monotonic_decreasing:
        return 'DOWN'
    else:
        return None