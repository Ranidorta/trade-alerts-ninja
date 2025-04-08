import logging
from datetime import datetime, timedelta
from ta.trend import EMAIndicator
from ta.volatility import AverageTrueRange
from data.fetch_data import fetch_data

logger = logging.getLogger("HybridLogic")

def confirm_volume(df, min_factor=1.2):
    try:
        df['volume_ma'] = df['volume'].rolling(20).mean()
        return df['volume'].iloc[-1] > df['volume_ma'].iloc[-1] * min_factor
    except Exception as e:
        logger.error(f"Erro ao confirmar volume: {e}")
        return False

def confirm_candle_pattern(df, trend_direction):
    try:
        candle = df.iloc[-1]
        body = abs(candle['close'] - candle['open'])
        range_total = candle['high'] - candle['low']
        if trend_direction == 'UP':
            return body > range_total * 0.6 and candle['close'] > candle['open']
        else:
            return body > range_total * 0.6 and candle['close'] < candle['open']
    except Exception as e:
        logger.error(f"Erro no padrão de candle: {e}")
        return False

def generate_entry(symbol, direction, timeframe='15m', risk_reward_ratio=1.5):
    try:
        df = fetch_data(symbol, timeframe)
        atr = AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range().iloc[-1]
        close = df['close'].iloc[-1]

        if direction == 'UP':
            entry = close - (atr * 0.3)
            sl = entry - (atr * 1.5)
            tp = entry + (atr * 1.5 * risk_reward_ratio)
        else:
            entry = close + (atr * 0.3)
            sl = entry + (atr * 1.5)
            tp = entry - (atr * 1.5 * risk_reward_ratio)

        risk = abs(entry - sl) / entry

        return {
            "entry": entry,
            "sl": sl,
            "tp": tp,
            "atr": atr,
            "risk": risk,
            "risk_reward_ratio": risk_reward_ratio
        }
    except Exception as e:
        logger.error(f"Erro ao gerar entrada: {e}")
        return None
