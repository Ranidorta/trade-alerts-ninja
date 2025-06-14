# evaluate_signals.py

from datetime import datetime
from fetch_candles import fetch_candles
from classify_signal import classify_signal
import pandas as pd

def evaluate_signals(signal_list):
    """
    Avalia uma lista de sinais.

    Parâmetros:
    - signal_list: lista de dicts, cada um com os campos: id, symbol, direction, entry_min, entry_max, sl, tp1, tp2, tp3, time

    Retorno:
    - Lista de resultados, um por sinal
    """
    results = []

    for signal in signal_list:
        start_time = datetime.strptime(signal['time'], "%Y-%m-%dT%H:%M:%S")
        candles = fetch_candles(signal['symbol'], start_time)
        result = classify_signal(signal, candles)

        results.append({
            'signal_id': signal['id'],
            'result': result
        })

    return results

# Exemplo de uso
if __name__ == "__main__":
    signals = [
        {
            'id': 1,
            'symbol': 'BTCUSDT',
            'direction': 'LONG',
            'entry_min': 100,
            'entry_max': 105,
            'sl': 95,
            'tp1': 110,
            'tp2': 115,
            'tp3': 120,
            'time': '2025-06-14T10:00:00'
        }
    ]

    results = evaluate_signals(signals)
    df_results = pd.DataFrame(results)
    print(df_results)