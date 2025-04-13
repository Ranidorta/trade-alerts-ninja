import os
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Tuple
import ccxt
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("BybitFetcher")

class BybitDataFetcher:
    def __init__(self, api_keys: dict = None):
        self.exchange = ccxt.bybit({
            'apiKey': api_keys.get("bybit_key") if api_keys else None,
            'secret': api_keys.get("bybit_secret") if api_keys else None,
            'enableRateLimit': True,
            'timeout': 10000,  # ⏱️ Timeout de 10s
            'options': {
                'defaultType': 'contract'
            }
        })
        self.symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def fetch_ohlcv(self, symbol: str, timeframe: str = '15m', lookback_days: int = 2) -> pd.DataFrame:
        since = self.exchange.parse8601((datetime.utcnow() - timedelta(days=lookback_days)).isoformat())
        try:
            # 📉 Spread do livro de ofertas
            order_book = self.exchange.fetch_order_book(symbol)
            spread = order_book['asks'][0][0] - order_book['bids'][0][0]

            # 📊 Preço mark da Bybit
            ohlcv = self.exchange.fetch_ohlcv(
                symbol=symbol,
                timeframe=timeframe,
                since=since,
                params={'price': 'mark'}
            )

            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['symbol'] = symbol
            df['spread'] = spread

            # 🧠 Delay entre último candle e agora
            delay_seconds = (datetime.utcnow() - df['timestamp'].iloc[-1]).total_seconds()
            logger.info(f"📡 OHLCV {symbol} | Spread: {spread:.4f} | Delay: {delay_seconds:.2f}s")

            # 💾 Cache local para debug (Parquet)
            os.makedirs("cache", exist_ok=True)
            df.to_parquet(f"cache/{symbol}_{timeframe}_{datetime.utcnow().date()}.parquet", index=False)

            return df

        except Exception as e:
            logger.error(f"❌ Falha ao buscar {symbol}: {str(e)}")
            return pd.DataFrame()
