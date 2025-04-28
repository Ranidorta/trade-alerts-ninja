import pandas as pd
from pybit.unified_trading import HTTP

session = HTTP(testnet=False)

def fetch_data(symbol: str, timeframe: str) -> pd.DataFrame:
    raw = session.get_kline(
        category='linear',
        symbol=symbol,
        interval=timeframe.replace('m', ''),
        limit=100
    )['result']['list']

    df = pd.DataFrame(raw, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume', 'turnover'
    ])
    df = df.astype(float)
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    return df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
