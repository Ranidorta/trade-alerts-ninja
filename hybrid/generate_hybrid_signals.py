"""
Hybrid signal generation module that combines multiple timeframes
(15m, 1h, 4h) to generate high-confidence trading signals.

This module validates trend alignment, volume, momentum, and price action
across timeframes before generating a BUY or SELL signal.
"""

import pandas as pd
from datetime import datetime
from ta import add_all_ta_features
from ta.trend import ADXIndicator
from pathlib import Path
from utils.save_signal import save_signal
from data.fetch_data import fetch_data


def calculate_indicators(df, label):
    """
    Calculates technical indicators for a given DataFrame and appends
    timeframe label suffix to column names.
    
    Args:
        df (pd.DataFrame): OHLCV data.
        label (str): Timeframe label (e.g., '15m', '1h').

    Returns:
        pd.DataFrame: DataFrame with renamed columns containing indicators.
    """
    df = df.copy()
    df = add_all_ta_features(df, open='open', high='high', low='low', close='close', volume='volume')
    df['sma_200'] = df['close'].rolling(200).mean()
    df['macd_cross'] = df['trend_macd'] > df['trend_macd_signal']
    df['macd_cross_down'] = df['trend_macd'] < df['trend_macd_signal']
    df['rsi_ok'] = df['momentum_rsi'] > 30
    df['rsi_overbought'] = df['momentum_rsi'] > 70
    df['rsi_oversold'] = df['momentum_rsi'] < 30
    df['trend_valid'] = (df['close'] > df['sma_200']) & df['macd_cross'] & df['rsi_ok']
    df['trend_short'] = (df['close'] < df['sma_200']) & df['macd_cross_down'] & df['rsi_overbought']
    df['volume_ma_20'] = df['volume'].rolling(20).mean()
    df['adx'] = ADXIndicator(df['high'], df['low'], df['close']).adx()
    high = df['high'].rolling(100).max()
    low = df['low'].rolling(100).min()
    df['fib_618'] = high - 0.618 * (high - low)
    df['poc'] = df.groupby('close')['volume'].transform('max')

    df.rename(columns={
        'close': f'close_{label}',
        'sma_200': f'sma_200_{label}',
        'volume': f'volume_{label}',
        'volume_ma_20': f'volume_ma_20_{label}',
        'adx': f'adx_{label}',
        'fib_618': f'fib_618_{label}',
        'poc': f'poc_{label}'
    }, inplace=True)

    return df


def is_trend_aligned(df_15m, df_1h, df_4h, short=False):
    """
    Validates if the trend is aligned across 15m, 1h, 4h using weighted scores.
    OTIMIZADO: Maior peso para timeframes mais longos

    Args:
        df_15m (pd.DataFrame): Indicators for 15m.
        df_1h (pd.DataFrame): Indicators for 1h.
        df_4h (pd.DataFrame): Indicators for 4h.
        short (bool): If True, checks bearish trend.

    Returns:
        bool: True if weighted trend score ≥ 0.7
    """
    # NOVOS PESOS: Favorece timeframes mais longos
    weights = {'4h': 0.60, '1h': 0.25, '15m': 0.15}
    s15 = df_15m.iloc[-1]
    s1h = df_1h.iloc[-1]
    s4h = df_4h.iloc[-1]

    if short:
        score = (
            (s4h['close_4h'] < s4h['sma_200_4h']) * weights['4h'] +
            (s1h['close_1h'] < s1h['sma_200_1h']) * weights['1h'] +
            (s15['close_15m'] < s15['sma_200_15m']) * weights['15m']
        )
    else:
        score = (
            (s4h['close_4h'] > s4h['sma_200_4h']) * weights['4h'] +
            (s1h['close_1h'] > s1h['sma_200_1h']) * weights['1h'] +
            (s15['close_15m'] > s15['sma_200_15m']) * weights['15m']
        )
    return score >= 0.7


def generate_hybrid_signal(symbol):
    """
    Generates a hybrid BUY or SELL signal based on alignment of technicals
    across 15m, 1h, and 4h timeframes.

    Args:
        symbol (str): Trading symbol like 'BTCUSDT'

    Returns:
        None
    """
    try:
        df_15m = fetch_data(symbol=symbol, interval='15m', limit=250)
        df_1h = fetch_data(symbol=symbol, interval='1h', limit=250)
        df_4h = fetch_data(symbol=symbol, interval='4h', limit=250)

        df_15m = calculate_indicators(df_15m, '15m')
        df_1h = calculate_indicators(df_1h, '1h')
        df_4h = calculate_indicators(df_4h, '4h')

        s1h = df_1h.iloc[-1]
        s4h = df_4h.iloc[-1]
        s15 = df_15m.iloc[-1]

        # FILTRO DE VOLATILIDADE ADICIONADO
        atr_15m = s15.get('atr_15m', 0)
        atr_1h = s1h.get('atr_1h', 0) 
        volatility_ok = True
        if atr_15m > 0 and atr_1h > 0:
            volatility_ratio = atr_15m / atr_1h
            volatility_ok = 0.5 <= volatility_ratio <= 1.5
        
        logs_long = []
        trend_long = is_trend_aligned(df_15m, df_1h, df_4h, short=False)
        if not trend_long: logs_long.append("❌ Long: tendência desalinhada")
        if not (s1h['volume_1h'] > s1h['volume_ma_20_1h']): logs_long.append("❌ Long: volume 1h baixo")
        if not (s4h['adx_4h'] > 25): logs_long.append("❌ Long: ADX baixo")
        if not (s15['close_15m'] > s4h['fib_618_4h']): logs_long.append("❌ Long: abaixo do Fibonacci")
        if not (s15['close_15m'] > s4h['poc_4h']): logs_long.append("❌ Long: abaixo do POC")
        if not volatility_ok: logs_long.append("❌ Long: volatilidade extrema")

        logs_short = []
        trend_short = is_trend_aligned(df_15m, df_1h, df_4h, short=True)
        if not trend_short: logs_short.append("❌ Short: tendência desalinhada")
        if not (s1h['volume_1h'] > s1h['volume_ma_20_1h']): logs_short.append("❌ Short: volume 1h baixo")
        if not (s4h['adx_4h'] > 25): logs_short.append("❌ Short: ADX baixo")
        if not (s15['close_15m'] < s4h['fib_618_4h']): logs_short.append("❌ Short: acima do Fibonacci")
        if not (s15['close_15m'] < s4h['poc_4h']): logs_short.append("❌ Short: acima do POC")
        if not volatility_ok: logs_short.append("❌ Short: volatilidade extrema")

        if trend_long and not logs_long:
            entry_price = s15['close_15m']
            sl = entry_price * 0.98
            tp = entry_price * 1.03
            signal = {
                'timestamp': datetime.utcnow().isoformat(),
                'asset': symbol,
                'direction': 'BUY',
                'timeframe': 'hybrid',
                'score': 1.0,
                'entry_price': entry_price,
                'sl': sl,
                'tp': tp,
                'result': None
            }
            file = Path("data/historical_signals_hybrid.csv")
            df_signal = pd.DataFrame([signal])
            df_signal.to_csv(file, mode='a', header=not file.exists(), index=False)
            print(f"✅ Sinal LONG gerado para {symbol} @ {entry_price}")
        else:
            print(f"⛔ {symbol} (LONG): nenhum sinal. Motivos:")
            for log in logs_long:
                print(f"   - {log}")

        if trend_short and not logs_short:
            entry_price = s15['close_15m']
            sl = entry_price * 1.02
            tp = entry_price * 0.97
            signal = {
                'timestamp': datetime.utcnow().isoformat(),
                'asset': symbol,
                'direction': 'SELL',
                'timeframe': 'hybrid',
                'score': 1.0,
                'entry_price': entry_price,
                'sl': sl,
                'tp': tp,
                'result': None
            }
            file = Path("data/historical_signals_hybrid.csv")
            df_signal = pd.DataFrame([signal])
            df_signal.to_csv(file, mode='a', header=not file.exists(), index=False)
            print(f"✅ Sinal SHORT gerado para {symbol} @ {entry_price}")
        else:
            print(f"⛔ {symbol} (SHORT): nenhum sinal. Motivos:")
            for log in logs_short:
                print(f"   - {log}")

    except Exception as e:
        print(f"❌ Erro ao processar {symbol}: {e}")


if __name__ == "__main__":
    symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT']
    for symbol in symbols:
        generate_hybrid_signal(symbol=symbol)
