import logging
from datetime import datetime, timedelta
from ta.trend import EMAIndicator, ADXIndicator
from ta.volatility import AverageTrueRange
from ta.momentum import RSIIndicator
from api.fetch_data import fetch_data

logger = logging.getLogger("HybridLogic")
last_signals = {}

# Verificação de tendência em timeframe superior (4h)
def get_trend(symbol):
    try:
        df = fetch_data(symbol, timeframe='4h')
        if df is None or df.empty or len(df) < 50:
            logger.warning(f"[{symbol}] Dados insuficientes para análise de tendência 4h (len={len(df) if df is not None else 0})")
            return None
            
        ema_fast = EMAIndicator(df['close'], window=20).ema_indicator().iloc[-1]
        ema_slow = EMAIndicator(df['close'], window=50).ema_indicator().iloc[-1]
        adx = ADXIndicator(df['high'], df['low'], df['close'], window=14).adx().iloc[-1]
        
        logger.info(f"[{symbol}] 4h - EMA20: {ema_fast:.6f}, EMA50: {ema_slow:.6f}, ADX: {adx:.2f}")

        # ADX mais flexível - reduzido de 25 para 15 (super relaxado)
        if adx < 15:
            logger.info(f"[{symbol}] ADX baixo ({adx:.2f}) para tendência definida (mín: 15)")
            return None

        trend = 'UP' if ema_fast > ema_slow else 'DOWN'
        logger.info(f"[{symbol}] Tendência definida: {trend} (EMA20 {'>' if trend == 'UP' else '<'} EMA50)")
        return trend
        
    except Exception as e:
        logger.error(f"[{symbol}] Erro ao calcular tendência 4h: {e}")
        return None

# Confirmação por volume forte (último candle 20% acima da média)
def confirm_volume(df):
    try:
        if df is None or df.empty or len(df) < 20:
            logger.warning(f"Dados insuficientes para análise de volume (len={len(df) if df is not None else 0})")
            return False
            
        current_vol = df['volume'].iloc[-1]
        avg_vol = df['volume'].rolling(20).mean().iloc[-1]
        vol_ratio = current_vol / avg_vol if avg_vol > 0 else 0
        required_ratio = 1.10  # Reduzido de 1.2 para 1.10 (10% em vez de 20%)
        
        logger.info(f"Volume atual: {current_vol:.0f}, Média 20p: {avg_vol:.0f}, Ratio: {vol_ratio:.2f} (mín: {required_ratio})")
        
        if vol_ratio > required_ratio:
            logger.info(f"✅ Volume confirmado ({vol_ratio:.2f}x da média)")
            return True
        else:
            logger.info(f"❌ Volume insuficiente ({vol_ratio:.2f}x < {required_ratio}x da média)")
            return False
            
    except Exception as e:
        logger.error(f"Erro ao confirmar volume: {e}")
        return False

# Confirmação do candle forte alinhado à direção desejada
def confirm_candle(df, direction):
    try:
        if df is None or df.empty:
            logger.warning("Dados insuficientes para análise de candle")
            return False
            
        candle = df.iloc[-1]
        body = abs(candle['close'] - candle['open'])
        range_total = candle['high'] - candle['low']
        
        logger.info(f"Candle - O:{candle['open']:.6f} H:{candle['high']:.6f} L:{candle['low']:.6f} C:{candle['close']:.6f}")
        logger.info(f"Body: {body:.6f}, Range: {range_total:.6f}")

        if range_total == 0:
            logger.warning("❌ Range do candle é zero")
            return False

        body_ratio = body / range_total
        required_ratio = 0.4  # Reduzido de 0.6 para 0.4 (40% em vez de 60%)
        bullish = candle['close'] > candle['open']
        bearish = candle['close'] < candle['open']
        
        strong_body = body_ratio >= required_ratio
        direction_aligned = (direction == 'UP' and bullish) or (direction == 'DOWN' and bearish)
        
        logger.info(f"Body ratio: {body_ratio:.2f} (mín: {required_ratio}), Bullish: {bullish}, Bearish: {bearish}")
        logger.info(f"Strong body: {strong_body}, Direction aligned ({direction}): {direction_aligned}")
        
        if strong_body and direction_aligned:
            logger.info(f"✅ Candle confirmado - corpo forte ({body_ratio:.2f}) alinhado com {direction}")
            return True
        else:
            if not strong_body:
                logger.info(f"❌ Corpo fraco ({body_ratio:.2f} < {required_ratio})")
            if not direction_aligned:
                logger.info(f"❌ Direção não alinhada - esperado {direction}, candle é {'BULLISH' if bullish else 'BEARISH'}")
            return False
            
    except Exception as e:
        logger.error(f"Erro ao confirmar candle: {e}")
        return False

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
    logger.info(f"🔍 [{symbol}] Iniciando análise para geração de sinal...")
    
    if not can_generate(symbol):
        logger.info(f"❌ [{symbol}] Cooldown ativo - não gera sinal")
        return None

    trend = get_trend(symbol)
    if not trend:
        logger.info(f"❌ [{symbol}] Sem tendência definida no timeframe 4h")
        return None

    logger.info(f"✅ [{symbol}] Tendência confirmada: {trend}")

    # Buscar dados do timeframe principal
    df = fetch_data(symbol, timeframe)
    if df is None or df.empty:
        logger.error(f"❌ [{symbol}] Falha ao obter dados do timeframe {timeframe}")
        return None
    
    logger.info(f"📊 [{symbol}] Dados obtidos: {len(df)} candles no timeframe {timeframe}")
    
    if not confirm_volume(df):
        logger.info(f"❌ [{symbol}] Volume insuficiente no timeframe {timeframe}")
        return None
    
    if not confirm_candle(df, trend):
        logger.info(f"❌ [{symbol}] Candle incompatível com tendência {trend}")
        return None

    # RSI mais flexível (super relaxado)
    rsi = RSIIndicator(df['close']).rsi().iloc[-1]
    rsi_min_long = 40  # Reduzido de 50 para 40
    rsi_max_short = 60  # Aumentado de 50 para 60
    
    logger.info(f"📈 [{symbol}] RSI atual: {rsi:.2f}")
    
    if trend == 'UP' and rsi < rsi_min_long:
        logger.info(f"❌ [{symbol}] RSI muito baixo para LONG: {rsi:.2f} < {rsi_min_long}")
        return None
    if trend == 'DOWN' and rsi > rsi_max_short:
        logger.info(f"❌ [{symbol}] RSI muito alto para SHORT: {rsi:.2f} > {rsi_max_short}")
        return None
        
    logger.info(f"✅ [{symbol}] RSI compatível com {trend}: {rsi:.2f}")

    # VALIDAÇÃO ANTI-CONTRADIÇÃO: Verificar se já existe sinal ativo para este símbolo
    if has_active_signal(symbol, trend):
        logger.info(f"❌ [{symbol}] Sinal contraditório bloqueado: direção {trend} já ativa")
        return None

    # Calcular preços de entrada e gestão de risco
    atr = AverageTrueRange(df['high'], df['low'], df['close']).average_true_range().iloc[-1]
    close = df['close'].iloc[-1]
    
    logger.info(f"📊 [{symbol}] Preços - Close: {close:.6f}, ATR: {atr:.6f}")

    if trend == 'UP':
        entry = close - (atr * 0.25)
        sl = entry - (atr * 1.2)
        tp = entry + (atr * 1.2 * risk_reward_ratio)
    else:
        entry = close + (atr * 0.25)
        sl = entry + (atr * 1.2)
        tp = entry - (atr * 1.2 * risk_reward_ratio)

    risk = abs(entry - sl) / entry

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

    logger.info(f"🎯 [{symbol}] SINAL GERADO:")
    logger.info(f"   📈 Direção: {trend}")
    logger.info(f"   💰 Entry: {entry:.6f}")
    logger.info(f"   🛡️ Stop Loss: {sl:.6f}")
    logger.info(f"   🎯 Take Profit: {tp:.6f}")
    logger.info(f"   ⚡ ATR: {atr:.6f}")
    logger.info(f"   📊 Risk: {risk:.2%}")
    logger.info(f"   📈 RSI: {rsi:.2f}")
    
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
