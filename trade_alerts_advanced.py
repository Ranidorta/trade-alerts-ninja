
import requests
import json
import time
import joblib
import numpy as np
import pandas as pd
import os
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.exceptions import NotFittedError

BYBIT_ENDPOINT = "https://api.bybit.com/v5/market/kline"
SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
INTERVAL = "15"  # Agora em 15 minutos, para equilíbrio entre velocidade e estabilidade
LOOKBACK = 100
MODEL_PATH = "ml/rf_model.pkl"
SIGNALS_PATH = "signals/signals_history.csv"

# Carrega modelo ou inicia novo
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
    except Exception:
        model = RandomForestClassifier(n_estimators=100)
else:
    model = RandomForestClassifier(n_estimators=100)

# Flag para saber se o modelo foi treinado
model_fitted = os.path.exists(MODEL_PATH)

def fetch_ohlcv(symbol):
    params = {
        "category": "linear",
        "symbol": symbol,
        "interval": INTERVAL,
        "limit": LOOKBACK
    }
    response = requests.get(BYBIT_ENDPOINT, params=params)
    data = response.json()
    if "result" not in data or "list" not in data["result"]:
        return pd.DataFrame()
    candles = data["result"]["list"]
    df = pd.DataFrame(candles, columns=["timestamp", "open", "high", "low", "close", "volume", "turnover"])
    df = df.astype(float)
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    return df

def extract_features(df):
    df["returns"] = df["close"].pct_change()
    df["volatility"] = df["returns"].rolling(10).std()
    df["sma"] = df["close"].rolling(20).mean()
    df["distance_sma"] = df["close"] - df["sma"]
    df["rsi"] = compute_rsi(df["close"], 14)
    df.dropna(inplace=True)
    return df

def compute_rsi(series, period=14):
    delta = series.diff()
    gain = np.where(delta > 0, delta, 0)
    loss = np.where(delta < 0, -delta, 0)
    avg_gain = pd.Series(gain).rolling(period).mean()
    avg_loss = pd.Series(loss).rolling(period).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    rsi = 100 - (100 / (1 + rs))
    return rsi

def predict_signal(features):
    X = features[["returns", "volatility", "distance_sma", "rsi"]].values[-1].reshape(1, -1)
    try:
        prob = model.predict_proba(X)[0][1]  # probabilidade de alta
    except NotFittedError:
        prob = 0.6  # valor neutro para gerar sinal mesmo sem modelo
    return prob

def train_model(df):
    global model_fitted
    df["future_return"] = df["close"].pct_change().shift(-3)
    df["target"] = (df["future_return"] > 0).astype(int)
    df.dropna(inplace=True)
    X = df[["returns", "volatility", "distance_sma", "rsi"]]
    y = df["target"]
    model.fit(X, y)
    joblib.dump(model, MODEL_PATH)
    model_fitted = True

def save_signals(signals):
    df = pd.DataFrame(signals)
    if not df.empty:
        os.makedirs(os.path.dirname(SIGNALS_PATH), exist_ok=True)
        if os.path.exists(SIGNALS_PATH):
            df.to_csv(SIGNALS_PATH, mode='a', index=False, header=False)
        else:
            df.to_csv(SIGNALS_PATH, index=False)

def generate_signals():
    signals = []
    for symbol in SYMBOLS:
        df = fetch_ohlcv(symbol)
        if df.empty:
            continue
        df = extract_features(df)

        if len(df) > 100 and not model_fitted:
            train_model(df)  # treino inicial

        prob = predict_signal(df)
        price = df["close"].iloc[-1]

        if prob > 0.7:
            direction = "long"
        elif prob < 0.45:
            direction = "short"
        else:
            continue  # ignora sinais neutros

        tp1 = round(price * 1.01, 2)
        tp2 = round(price * 1.02, 2)
        tp3 = round(price * 1.03, 2)
        sl  = round(price * 0.995, 2) if direction == "long" else round(price * 1.005, 2)

        nivel_conf = "alta" if prob > 0.85 else "média" if prob > 0.7 else "baixa"

        signal = {
            "symbol": symbol,
            "timestamp": datetime.utcnow().isoformat(),
            "entry": price,
            "direction": direction,
            "confidence": round(prob, 4),
            "conf_nivel": nivel_conf,
            "tp1": tp1,
            "tp2": tp2,
            "tp3": tp3,
            "stop_loss": sl,
            "resultado": None  # será atualizado depois
        }
        signals.append(signal)

        if len(df) > 100:
            train_model(df)

    print(json.dumps(signals, indent=2))
    save_signals(signals)

if __name__ == "__main__":
    generate_signals()
