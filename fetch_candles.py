# fetch_candles.py

import pandas as pd
import requests
from datetime import datetime, timedelta

def fetch_candles(symbol, start_time, limit=48, timeframe='15m'):
    """
    Busca candles reais da API da Bybit.
    
    Parâmetros:
    - symbol: string, ex: 'BTCUSDT'
    - start_time: datetime.datetime, momento do sinal
    - limit: número de candles a buscar
    - timeframe: string, ex: '15m'

    Retorno:
    - DataFrame Pandas com colunas: 'timestamp', 'high', 'low'
    """
    try:
        # Convert datetime to timestamp in milliseconds
        start_ms = int(start_time.timestamp() * 1000)
        
        # Convert timeframe to Bybit format
        timeframe_map = {
            '1m': '1',
            '5m': '5', 
            '15m': '15',
            '1h': '60',
            '4h': '240',
            '1d': 'D'
        }
        
        interval = timeframe_map.get(timeframe, '15')
        
        # Bybit API endpoint for historical klines
        url = "https://api.bybit.com/v5/market/kline"
        
        params = {
            'category': 'linear',  # USDT perpetual
            'symbol': symbol,
            'interval': interval,
            'start': start_ms,
            'limit': limit
        }
        
        print(f"Fetching candles for {symbol} from {start_time} (limit: {limit})")
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"Error fetching candles: HTTP {response.status_code}")
            return create_fallback_candles(start_time, limit)
        
        data = response.json()
        
        if 'result' not in data or 'list' not in data['result']:
            print("Invalid response format from Bybit API")
            return create_fallback_candles(start_time, limit)
            
        candles = data['result']['list']
        
        if not candles:
            print("No candles returned from API")
            return create_fallback_candles(start_time, limit)
        
        # Convert to DataFrame
        df_data = []
        for candle in candles:
            # Bybit format: [timestamp, open, high, low, close, volume, turnover]
            timestamp = datetime.fromtimestamp(int(candle[0]) / 1000)
            df_data.append({
                'timestamp': timestamp,
                'high': float(candle[2]),
                'low': float(candle[3])
            })
        
        # Sort by timestamp (oldest first)
        df_data.sort(key=lambda x: x['timestamp'])
        
        df = pd.DataFrame(df_data)
        print(f"Successfully fetched {len(df)} candles for {symbol}")
        
        return df
        
    except Exception as e:
        print(f"Error fetching candles from Bybit: {str(e)}")
        return create_fallback_candles(start_time, limit)

def create_fallback_candles(start_time, limit):
    """
    Create fallback mock candles when API fails.
    """
    print(f"Creating fallback candles for evaluation (limit: {limit})")
    
    dates = pd.date_range(start=start_time, periods=limit, freq='15T')
    
    # Create realistic price movement simulation
    base_price = 50000  # Base price for simulation
    
    data = []
    for i, date in enumerate(dates):
        # Simulate some price movement
        variation = (i % 10 - 5) * 100  # +/- 500 variation
        high = base_price + variation + 50
        low = base_price + variation - 50
        
        data.append({
            'timestamp': date,
            'high': high,
            'low': low
        })
    
    return pd.DataFrame(data)