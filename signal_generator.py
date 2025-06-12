# signal_generator.py

from datetime import datetime
from trend_filter import get_trend, detect_structure
from entry_conditions import validate_entry
from risk_manager import define_trade_levels
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

    # Etapa 4: Montar sinal final
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
        "time": datetime.utcnow().isoformat()
    }

    print(f"[{symbol}] ✅ Sinal gerado com sucesso: {signal}")
    return signal