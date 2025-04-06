"""
Versão híbrida aprimorada do gerador de sinais com estilo enterprise:
- Filtro de tendência no 4h (EMA50 > EMA200)
- Entrada em tempo real no 15m com SL/TP dinâmicos baseados em ATR
- Confirmação por volume, padrão de candle e validade curta (5 minutos)
- Logging estruturado e tratamento de exceções robusto
"""

import pandas as pd
from datetime import datetime, timedelta
from ta.trend import EMAIndicator
from ta.volatility import AverageTrueRange
import logging
from utils.save_signal import save_signal
from data.fetch_data import fetch_data

# Setup de logging enterprise
logger = logging.getLogger("HybridSignalGenerator")
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')

def check_trend(symbol, timeframe='4h'):
    try:
        df = fetch_data(symbol, timeframe)
        df['ema_50'] = EMAIndicator(close=df['close'], window=50).ema_indicator()
        df['ema_200'] = EMAIndicator(close=df['close'], window=200).ema_indicator()
        is_uptrend = df['ema_50'].iloc[-1] > df['ema_200'].iloc[-1]
        logger.info(f"{symbol} tendência 4h: {'alta' if is_uptrend else 'baixa'}")
        return is_uptrend
    except Exception as e:
        logger.error(f"Erro ao verificar tendência: {e}")
        return False

def confirm_volume(df):
    try:
        df['volume_ma'] = df['volume'].rolling(20).mean()
        volume_confirmed = df['volume'].iloc[-1] > 1.5 * df['volume_ma'].iloc[-1]
        logger.info(f"Volume confirmado: {volume_confirmed}")
        return volume_confirmed
    except Exception as e:
        logger.error(f"Erro ao confirmar volume: {e}")
        return False

def confirm_candle_pattern(df):
    try:
        body = abs(df['close'] - df['open'])
        shadow = df['low'].rolling(2).min()
        is_hammer = (df['open'] - shadow).iloc[-1] > 2 * body.iloc[-1]
        logger.info(f"Padrão de candle detectado: {is_hammer}")
        return is_hammer
    except Exception as e:
        logger.error(f"Erro ao detectar padrão de candle: {e}")
        return False

def generate_entry(symbol, trend_direction, timeframe='15m'):
    try:
        df = fetch_data(symbol, timeframe)
        atr = AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range()
        last_close = df['close'].iloc[-1]
        atr_value = atr.iloc[-1]

        if trend_direction == 'UP':
            entry = last_close - (atr_value * 0.3)
            sl = entry - (atr_value * 1.5)
            tp = entry + (atr_value * 3)
        else:
            entry = last_close + (atr_value * 0.3)
            sl = entry + (atr_value * 1.5)
            tp = entry - (atr_value * 3)

        return {
            'entry': entry,
            'sl': sl,
            'tp': tp,
            'atr': atr_value
        }
    except Exception as e:
        logger.error(f"Erro ao calcular entrada: {e}")
        return None

def generate_signal(symbol):
    logger.info(f"🔍 Analisando {symbol} para geração de sinal híbrido...")
    try:
        trend_up = check_trend(symbol, '4h')
        trend_direction = 'UP' if trend_up else 'DOWN'

        df_15m = fetch_data(symbol, '15m')
        if df_15m.empty:
            logger.warning(f"❌ Dados vazios para {symbol} no 15m")
            return None

        if not confirm_volume(df_15m):
            logger.info(f"❌ Volume fraco para {symbol}, sinal descartado.")
            return None

        if not confirm_candle_pattern(df_15m):
            logger.info(f"❌ Sem padrão de candle confirmado para {symbol}.")
            return None

        entry_data = generate_entry(symbol, trend_direction, '15m')
        if not entry_data:
            return None

        signal = {
            'symbol': symbol,
            'direction': 'BUY' if trend_direction == 'UP' else 'SELL',
            'entry_price': round(entry_data['entry'], 2),
            'sl': round(entry_data['sl'], 2),
            'tp': round(entry_data['tp'], 2),
            'atr': round(entry_data['atr'], 2),
            'timestamp': datetime.utcnow().isoformat(),
            'expires': (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            'timeframe': 'hybrid_realtime',
            'score': 1.0,
            'result': None
        }

        save_signal(signal)
        logger.info(f"✅ Sinal gerado {signal['direction']} @ {signal['entry_price']} ({symbol})")
        return signal

    except Exception as e:
        logger.exception(f"Erro ao gerar sinal para {symbol}")
        return None

if __name__ == "__main__":
    symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
    for symbol in symbols:
        generate_signal(symbol)
