# signal_evaluator.py

import pandas as pd

def evaluate_signal(signal: dict, future_df: pd.DataFrame) -> str:
    """
    Avalia o resultado do sinal com base nos preços futuros.
    Classificação possível:
    - WINNER: Se atingiu TP3 sem tocar o SL
    - PARTIAL: Se atingiu TP1 ou TP2 mas não TP3, e depois voltou no SL
    - LOSER: Se bateu o SL antes de atingir qualquer TP
    - FALSE: Se dentro do período de validade o sinal não atingiu nenhum alvo nem o SL

    future_df deve conter colunas: high, low, close
    """
    if not signal or future_df is None or future_df.empty:
        return "FALSE"

    entry = signal["entry"]
    sl = signal["sl"]
    tp1 = signal["tp1"]
    tp2 = signal["tp2"]
    tp3 = signal["tp3"]
    direction = signal["direction"]

    hit_tp1 = hit_tp2 = hit_tp3 = False

    for _, row in future_df.iterrows():
        high = row['high']
        low = row['low']

        if direction == 'UP':
            if high >= tp3:
                return "WINNER"
            if high >= tp2:
                hit_tp2 = True
            if high >= tp1:
                hit_tp1 = True
            if low <= sl:
                if hit_tp2:
                    return "PARTIAL"
                elif hit_tp1:
                    return "PARTIAL"
                else:
                    return "LOSER"
        elif direction == 'DOWN':
            if low <= tp3:
                return "WINNER"
            if low <= tp2:
                hit_tp2 = True
            if low <= tp1:
                hit_tp1 = True
            if high >= sl:
                if hit_tp2:
                    return "PARTIAL"
                elif hit_tp1:
                    return "PARTIAL"
                else:
                    return "LOSER"

    # Se nenhum TP nem SL foi atingido no período analisado
    return "FALSE"