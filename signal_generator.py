# signal_generator.py

from datetime import datetime
from trend_filter import get_trend, detect_structure
from entry_conditions import validate_entry
from risk_manager import define_trade_levels
from ml.ml_predictor import predict_signal_quality
import pandas as pd

def generate_trade_signal(symbol: str, df_4h: pd.DataFrame, df_current: pd.DataFrame) -> dict:
    """
    Gera um sinal completo de trade com base na tendência (EMA + estrutura),
    confluência de indicadores e gestão de risco por ATR.

    Retorna um dicionário com dados do sinal ou None.
    """
    if df_4h is None or df_current is None:
        return None

    # Etapa 1: Detectar tendência
    trend = get_trend(df_4h)
    structure = detect_structure(df_4h)

    if trend is None or structure is None or trend != structure:
        print(f"[{symbol}] Tendência indefinida ou estrutura em conflito")
        return None

    # Etapa 2: Confirmar critérios de entrada
    if not validate_entry(df_current, trend):
        print(f"[{symbol}] Critérios de entrada não confirmados para {trend}")
        return None

    # Etapa 3: Calcular níveis de entrada e saída
    trade_levels = define_trade_levels(df_current, trend)
    if trade_levels is None:
        print(f"[{symbol}] Níveis de trade não puderam ser definidos")
        return None

    # Etapa 4: Calcular features para ML
    # Usando valores do dataframe atual para calcular features
    close_prices = df_current['close']
    rsi = close_prices.rolling(14).apply(lambda x: 100 - (100 / (1 + (x.diff().clip(lower=0).rolling(14).mean() / (-x.diff().clip(upper=0)).rolling(14).mean()))))
    
    # Calcular ADX (simplificado)
    high_low = df_current['high'] - df_current['low']
    adx = high_low.rolling(14).mean() / close_prices.rolling(14).mean() * 100
    
    # Volume ratio
    volume_ma = df_current['volume'].rolling(20).mean()
    volume_ratio = df_current['volume'].iloc[-1] / volume_ma.iloc[-1] if volume_ma.iloc[-1] > 0 else 1.0
    
    # Candle body ratio
    candle_body = abs(df_current['close'].iloc[-1] - df_current['open'].iloc[-1])
    candle_range = df_current['high'].iloc[-1] - df_current['low'].iloc[-1]
    candle_body_ratio = candle_body / candle_range if candle_range > 0 else 0.5
    
    # Preparar features para ML
    signal_features = {
        'rsi': rsi.iloc[-1] if not rsi.isna().iloc[-1] else 50.0,
        'adx': adx.iloc[-1] if not adx.isna().iloc[-1] else 25.0,
        'volume_ratio': volume_ratio,
        'candle_body_ratio': candle_body_ratio
    }
    
    # Etapa 5: Verificação ML
    ml_prediction = predict_signal_quality(signal_features)
    
    if ml_prediction not in ['WINNER', 'PARTIAL']:
        print(f"[{symbol}] 🚫 Sinal bloqueado pelo ML: previsão = {ml_prediction}")
        return None

    # Etapa 6: Montar sinal final aprovado
    signal = {
        "symbol": symbol,
        "direction": trend,
        "entry": trade_levels["entry"],
        "sl": trade_levels["sl"],
        "tp1": trade_levels["tp1"],
        "tp2": trade_levels["tp2"],
        "tp3": trade_levels["tp3"],
        "atr": trade_levels["atr"],
        "risk_reward_ratio": trade_levels["risk_reward_ratio"],
        "risk": trade_levels["risk"],
        "ml_prediction": ml_prediction,
        "ml_features": signal_features,
        "time": datetime.utcnow().isoformat()
    }

    print(f"[{symbol}] ✅ Sinal aprovado pelo ML ({ml_prediction}): {signal}")
    return signal