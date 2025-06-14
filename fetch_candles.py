# fetch_candles.py

import pandas as pd
from datetime import datetime, timedelta

def fetch_candles(symbol, start_time, limit=48, timeframe='15m'):
    """
    Função mockada que simula candles futuros.
    Substitua por uma chamada real à API de dados de mercado.

    Parâmetros:
    - symbol: string, ex: 'BTCUSDT'
    - start_time: datetime.datetime, momento do sinal
    - limit: número de candles a buscar
    - timeframe: string, ex: '15m'

    Retorno:
    - DataFrame Pandas com colunas: 'timestamp', 'high', 'low'
    """
    dates = pd.date_range(start=start_time, periods=limit, freq='15T')
    data = {
        'timestamp': dates,
        'high': [100 + i for i in range(limit)],
        'low': [99 + i for i in range(limit)],
    }
    return pd.DataFrame(data)