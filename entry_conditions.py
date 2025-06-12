# entry_conditions.py

from ta.momentum import RSIIndicator
import pandas as pd

def confirm_rsi(df: pd.DataFrame, direction: str) -> bool:
    """
    Confirma RSI alinhado com a direção.
    LONG → RSI > 45
    SHORT → RSI < 55
    """
    if df is None or df.empty or len(df) < 15:
        return False
    rsi = RSIIndicator(df['close'], window=14).rsi().iloc[-1]
    if direction == 'UP' and rsi > 45:
        return True
    elif direction == 'DOWN' and rsi < 55:
        return True
    return False

def confirm_volume(df: pd.DataFrame) -> bool:
    """
    Confirma volume do último candle 10% maior que a média dos últimos 20 candles.
    """
    if df is None or df.empty or len(df) < 20:
        return False
    current_vol = df['volume'].iloc[-1]
    avg_vol = df['volume'].rolling(20).mean().iloc[-1]
    return current_vol > avg_vol * 1.1

def confirm_candle_strength(df: pd.DataFrame, direction: str) -> bool:
    """
    Confirma se o último candle tem corpo forte e alinhado com a direção.
    """
    if df is None or df.empty:
        return False

    candle = df.iloc[-1]
    body = abs(candle['close'] - candle['open'])
    range_total = candle['high'] - candle['low']
    if range_total == 0:
        return False

    body_ratio = body / range_total
    bullish = candle['close'] > candle['open']
    bearish = candle['close'] < candle['open']

    if direction == 'UP' and bullish and body_ratio >= 0.4:
        return True
    elif direction == 'DOWN' and bearish and body_ratio >= 0.4:
        return True
    return False

def validate_entry(df: pd.DataFrame, direction: str) -> bool:
    """
    Só permite sinal se pelo menos 3 condições forem verdadeiras.
    """
    checks = [
        confirm_rsi(df, direction),
        confirm_volume(df),
        confirm_candle_strength(df, direction)
    ]
    return sum(checks) >= 2  # exige pelo menos 2 de 3 critérios válidos