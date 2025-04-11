import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Tuple
import ccxt

logger = logging.getLogger("BybitFetcher")

class BybitDataFetcher:
    def __init__(self, api_keys: dict = None):
        self.exchange = ccxt.bybit({
            'apiKey': api_keys.get("bybit_key") if api_keys else None,
            'secret': api_keys.get("bybit_secret") if api_keys else None,
            'enableRateLimit': True,
            'options': {
                'defaultType': 'contract'  # Modo futuros
            }
        })
        self.symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "PNUTUSDT"]  # Símbolos Bybit

    def fetch_ohlcv(self, symbol: str, timeframe: str = '4h', lookback_days: int = 30) -> pd.DataFrame:
        """Busca dados OHLCV de futuros da Bybit."""
        since = self.exchange.parse8601(
            (datetime.now() - timedelta(days=lookback_days)).strftime('%Y-%m-%d')
        )
        try:
            ohlcv = self.exchange.fetch_ohlcv(
                symbol=symbol,
                timeframe=timeframe,
                since=since,
                params={'price': 'index'}  # Usa preço de índice para evitar liquidações
            )
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except Exception as e:
            logger.error(f"Falha ao buscar {symbol}: {str(e)}")
            return pd.DataFrame()

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calcula indicadores técnicos específicos para futuros."""
        if df.empty:
            return df

        # Preço Médio (Bid-Ask)
        df['mid_price'] = (df['high'] + df['low']) / 2

        # Indicadores
        df['rsi'] = 100 - (100 / (1 + df['mid_price'].rolling(14).mean()))
        df['atr'] = df['high'].rolling(14).max() - df['low'].rolling(14).min()
        df['ema_diff'] = df['mid_price'].ewm(span=50).mean() - df['mid_price'].ewm(span=200).mean()
        df['volume_oi_ratio'] = df['volume'] / df['volume'].rolling(20).mean()

        return df.dropna()

    def generate_labels(self, df: pd.DataFrame, future_candles: int = 4) -> np.ndarray:
        """Gera labels baseadas no preço futuro (1=compra, 0=venda)."""
        df['future_price'] = df['close'].shift(-future_candles)
        return (df['future_price'] > df['close']).astype(int).values

    def prepare_training_data(self, lookback_days: int = 30) -> Tuple[np.ndarray, np.ndarray]:
        """Prepara dados de treino para todos os símbolos."""
        X, y = [], []

        for symbol in self.symbols:
            df = self.fetch_ohlcv(symbol, lookback_days=lookback_days)
            if df.empty:
                continue

            df = self.calculate_indicators(df)
            labels = self.generate_labels(df)

            # Features: RSI, ATR, EMA diff, Volume/OI ratio
            features = df[['rsi', 'atr', 'ema_diff', 'volume_oi_ratio']].values
            valid_idx = ~np.isnan(labels)

            X.extend(features[valid_idx])
            y.extend(labels[valid_idx])

        return np.array(X), np.array(y)

# Função de conveniência

def fetch_training_data() -> Tuple[np.ndarray, np.ndarray]:
    fetcher = BybitDataFetcher()
    return fetcher.prepare_training_data(lookback_days=60)  # 2 meses de dados
