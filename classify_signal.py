# classify_signal.py

import pandas as pd

def classify_signal(signal, future_candles):
    """
    Classifica o sinal como: WINNER, PARTIAL, LOSER ou FALSE.

    Parâmetros:
    - signal: dict com os campos: direction, entry_min, entry_max, sl, tp1, tp2, tp3
    - future_candles: DataFrame com colunas 'high' e 'low'

    Retorno:
    - String: 'WINNER', 'PARTIAL', 'LOSER' ou 'FALSE'
    """
    direction = signal['direction'].upper()
    entry_min = signal['entry_min']
    entry_max = signal['entry_max']
    sl = signal['sl']
    tp1 = signal['tp1']
    tp2 = signal['tp2']
    tp3 = signal['tp3']

    df = future_candles.copy()
    entry_idx = None

    # Verificar toque na zona de entrada
    if direction == 'LONG':
        entry_event = df[df['low'] <= entry_max]
        if not entry_event.empty:
            entry_idx = entry_event.index[0]
    elif direction == 'DOWN':
        entry_event = df[df['high'] >= entry_min]
        if not entry_event.empty:
            entry_idx = entry_event.index[0]
    else:
        return "FALSE"

    if entry_idx is None:
        return "FALSE"

    df_after_entry = df.loc[entry_idx:]
    tp1_hit = tp2_hit = tp3_hit = False

    for idx, row in df_after_entry.iterrows():
        high = row['high']
        low = row['low']

        if direction == 'LONG':
            if not tp1_hit and high >= tp1:
                tp1_hit = True
            if not tp2_hit and high >= tp2:
                tp2_hit = True
            if not tp3_hit and high >= tp3:
                tp3_hit = True
            if low <= sl:
                if not (tp1_hit or tp2_hit or tp3_hit):
                    return "LOSER"
                elif tp1_hit and tp2_hit and tp3_hit:
                    return "WINNER"
                else:
                    return "PARTIAL"
        else:  # DOWN
            if not tp1_hit and low <= tp1:
                tp1_hit = True
            if not tp2_hit and low <= tp2:
                tp2_hit = True
            if not tp3_hit and low <= tp3:
                tp3_hit = True
            if high >= sl:
                if not (tp1_hit or tp2_hit or tp3_hit):
                    return "LOSER"
                elif tp1_hit and tp2_hit and tp3_hit:
                    return "WINNER"
                else:
                    return "PARTIAL"

        if tp1_hit and tp2_hit and tp3_hit:
            return "WINNER"

    if tp1_hit or tp2_hit or tp3_hit:
        return "PARTIAL"
    else:
        return "LOSER"