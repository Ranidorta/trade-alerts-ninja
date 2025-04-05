
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os
from datetime import datetime
from trade_alerts_advanced import fetch_ohlcv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

# Function to compute RSI since it's not available directly
def compute_rsi(close_prices, window=14):
    # Calculate price changes
    delta = close_prices.diff()
    
    # Separate gains and losses
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    # Calculate average gain and loss
    avg_gain = gain.rolling(window=window).mean()
    avg_loss = loss.rolling(window=window).mean()
    
    # Calculate relative strength (RS)
    rs = avg_gain / avg_loss
    
    # Calculate RSI
    rsi = 100 - (100 / (1 + rs))
    
    return rsi

# Carrega os sinais com resultado
df_signals = pd.read_sql("SELECT * FROM signals WHERE resultado IS NOT NULL", engine)

dataset = []

for _, s in df_signals.iterrows():
    try:
        df = fetch_ohlcv(s.symbol)
        if not df.empty:
            sma = df["close"].rolling(20).mean().iloc[-1]
            volatility = df["close"].pct_change().rolling(10).std().iloc[-1]
            rsi = compute_rsi(df["close"]).fillna(0).iloc[-1]

            dataset.append({
                "symbol": s.symbol,
                "timestamp": s.timestamp,
                "direction": 1 if s.direction == "long" else 0,
                "entry": s.entry,
                "tp_dist": abs(s.tp1 - s.entry)/s.entry,  # Normalized as percentage
                "sl_dist": abs(s.stop_loss - s.entry)/s.entry,  # Normalized as percentage
                "volatility": volatility,
                "distance_sma": (s.entry - sma)/s.entry,  # Normalized as percentage
                "rsi": rsi,
                "target": {"vencedor": 2, "parcial": 1, "perdedor": 0, "falso": -1}.get(s.resultado, -1)
            })
        else:
            print(f"No data available for {s.symbol}")
    except Exception as e:
        print(f"Erro ao processar {s.symbol} - {s.timestamp}: {e}")

# Salva o dataset pronto pra treinar modelo
df_out = pd.DataFrame(dataset)
df_out.to_csv("dataset_treinamento.csv", index=False)
print(f"✅ Dataset salvo em dataset_treinamento.csv com {len(dataset)} registros")
print(f"Colunas disponíveis: {', '.join(df_out.columns)}")
