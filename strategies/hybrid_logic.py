import logging
from datetime import datetime, timedelta
from ta.trend import EMAIndicator, ADXIndicator
from ta.volatility import AverageTrueRange
from ta.momentum import RSIIndicator
from data.fetch_data import fetch_data

logger = logging.getLogger("HybridLogic")
last_signals = {}

# Verificação de tendência em timeframe superior (4h)
def get_trend(symbol):
    df = fetch_data(symbol, timeframe='4h')
    ema_fast = EMAIndicator(df['close'], window=20).ema_indicator().iloc[-1]
    ema_slow = EMAIndicator(df['close'], window=50).ema_indicator().iloc[-1]
    adx = ADXIndicator(df['high'], df['low'], df['close'], window=14).adx().iloc[-1]

    if adx < 25:
        logger.info(f"ADX baixo ({adx:.2f}) para {symbol}, tendência indefinida.")
        return None  # Sem tendência definida suficiente.

    return 'UP' if ema_fast > ema_slow else 'DOWN'

# Confirmação por volume forte (último candle 20% acima da média)
def confirm_volume(df):
    avg_vol = df['volume'].rolling(20).mean().iloc[-1]
    return df['volume'].iloc[-1] > avg_vol * 1.2

# Confirmação do candle forte alinhado à direção desejada
def confirm_candle(df, direction):
    candle = df.iloc[-1]
    body = abs(candle['close'] - candle['open'])
    range_total = candle['high'] - candle['low']

    if range_total == 0:
        return False

    strong_body = body >= range_total * 0.6
    bullish = candle['close'] > candle['open']
    bearish = candle['close'] < candle['open']

    return strong_body and ((direction == 'UP' and bullish) or (direction == 'DOWN' and bearish))

# Cooldown entre sinais do mesmo ativo - AUMENTADO para 30 minutos
def can_generate(symbol, cooldown_minutes=30):
    now = datetime.utcnow()
    last_time = last_signals.get(symbol)
    if last_time and now - last_time < timedelta(minutes=cooldown_minutes):
        logger.info(f"Sinal bloqueado por cooldown: {symbol}")
        return False
    last_signals[symbol] = now
    return True

# Gerar sinal definitivo com gestão de risco aprimorada
def generate_entry(symbol, timeframe='15m', risk_reward_ratio=2.0):
    if not can_generate(symbol):
        return None

    trend = get_trend(symbol)
    if not trend:
        logger.info(f"Sem tendência definida para {symbol}.")
        return None

    df = fetch_data(symbol, timeframe)
    
    if not confirm_volume(df):
        logger.info(f"Volume insuficiente para {symbol}.")
        return None
    
    if not confirm_candle(df, trend):
        logger.info(f"Candle incompatível com tendência para {symbol}.")
        return None

    rsi = RSIIndicator(df['close']).rsi().iloc[-1]
    if trend == 'UP' and rsi < 50:
        logger.info(f"RSI incompatível com Long: {rsi:.2f}")
        return None
    if trend == 'DOWN' and rsi > 50:
        logger.info(f"RSI incompatível com Short: {rsi:.2f}")
        return None

    atr = AverageTrueRange(df['high'], df['low'], df['close']).average_true_range().iloc[-1]
    close = df['close'].iloc[-1]

    if trend == 'UP':
        entry = close - (atr * 0.25)
        sl = entry - (atr * 1.2)
        tp = entry + (atr * 1.2 * risk_reward_ratio)
    else:
        entry = close + (atr * 0.25)
        sl = entry + (atr * 1.2)
        tp = entry - (atr * 1.2 * risk_reward_ratio)

    risk = abs(entry - sl) / entry

    # VALIDAÇÃO ANTI-CONTRADIÇÃO: Verificar se já existe sinal ativo para este símbolo
    if has_active_signal(symbol, trend):
        logger.info(f"Sinal contraditório bloqueado para {symbol}: direção {trend} já ativa")
        return None

    signal = {
        "symbol": symbol,
        "direction": trend,
        "entry": entry,
        "sl": sl,
        "tp": tp,
        "atr": atr,
        "risk": risk,
        "risk_reward_ratio": risk_reward_ratio,
        "time": datetime.utcnow().isoformat()
    }

    logger.info(f"Sinal gerado para {symbol}: {signal}")
    return signal

# Verificar se existe sinal ativo que conflita
def has_active_signal(symbol, new_direction):
    """
    Verifica se existe sinal ativo para o símbolo que conflita com a nova direção
    """
    # Esta função deve verificar sinais ativos nos últimos 30-60 minutos
    # Por enquanto, implementação básica - pode ser expandida com storage real
    recent_time = datetime.utcnow() - timedelta(minutes=60)
    
    # Implementação simplificada - na produção, consultar banco de dados/storage
    # Por ora, retorna False para permitir primeiro sinal
    return False
