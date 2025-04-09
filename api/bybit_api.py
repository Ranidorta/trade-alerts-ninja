import ccxt
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class BybitFuturesAPI:
    def __init__(self):
        self.exchange = ccxt.bybit({
            'options': {
                'defaultType': 'contract'  # Modo futuros
            },
            'enableRateLimit': True
        })
    
    def fetch_ohlcv(self, symbol: str, timeframe: str = '4h', days: int = 30) -> pd.DataFrame:
        """Busca dados OHLCV"""
        since = self.exchange.parse8601((datetime.now() - timedelta(days=days)).isoformat())
        try:
            data = self.exchange.fetch_ohlcv(
                symbol=symbol,
                timeframe=timeframe,
                since=since,
                params={'price': 'index'}  # Preço de índice
            )
            df = pd.DataFrame(data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except Exception as e:
            print(f"Erro ao buscar {symbol}: {e}")
            return pd.DataFrame()

    def calculate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calcula indicadores técnicos"""
        if df.empty:
            return df
            
        # Cálculo de indicadores
        df['rsi'] = 100 - (100 / (1 + df['close'].rolling(14).mean()))
        df['atr'] = df['high'].rolling(14).max() - df['low'].rolling(14).min()
        df['ema_diff'] = df['close'].ewm(span=50).mean() - df['close'].ewm(span=200).mean()
        return df.dropna()

    def prepare_training_data(self, symbols: List[str], lookback_days: int) -> Tuple[np.ndarray, np.ndarray]:
        """Prepara dados para treino"""
        X, y = [], []
        
        for symbol in symbols:
            df = self.fetch_ohlcv(symbol, days=lookback_days)
            if df.empty:
                continue
                
            df = self.calculate_features(df)
            df['label'] = (df['close'].shift(-4) > df['close']).astype(int)  # Label simples
            
            valid = df.dropna()
            X.extend(valid[['rsi', 'atr', 'ema_diff']].values)
            y.extend(valid['label'].values)
            
        return np.array(X), np.array(y)
