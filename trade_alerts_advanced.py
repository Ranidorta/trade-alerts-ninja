
import requests
import json
import time
import joblib
import numpy as np
import pandas as pd
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from services.evaluate_signals_pg import Signal
from services.evaluate_signals_pg import Base
from scheduler.evaluation_job import iniciar_avaliador_automatico

load_dotenv()

BYBIT_ENDPOINT = "https://api.bybit.com/v5/market/kline"
SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
INTERVAL = "15"
LOOKBACK = 100
MODEL_PATH = "ml/rf_hybrid_model.pkl"

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Ensure database tables exist
Base.metadata.create_all(engine)

# Load the hybrid model
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
else:
    raise Exception("Modelo híbrido não encontrado. Treine usando train_hybrid_model.py")

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

def compute_rsi(series, period=14):
    delta = series.diff()
    gain = np.where(delta > 0, delta, 0)
    loss = np.where(delta < 0, -delta, 0)
    avg_gain = pd.Series(gain).rolling(period).mean().fillna(0)
    avg_loss = pd.Series(loss).rolling(period).mean().fillna(0)
    rs = avg_gain / (avg_loss + 1e-9)
    rsi = 100 - (100 / (1 + rs))
    return rsi

def predict_with_hybrid(df, direction, entry, tp1, stop):
    """
    Predict signal success using the hybrid model
    
    Args:
        df: DataFrame with price data
        direction: "long" or "short"
        entry: Entry price
        tp1: Take profit level 1
        stop: Stop loss level
        
    Returns:
        win_prob: Probability of winning signal
        all_probs: All probabilities (loss, partial, win)
    """
    try:
        # Calculate technical indicators
        sma = df["close"].rolling(20).mean().fillna(0).iloc[-1]
        volatility = df["close"].pct_change().rolling(10).std().fillna(0).iloc[-1]
        rsi = compute_rsi(df["close"]).fillna(0).iloc[-1]

        # Normalize features as percentages like in the training
        X = pd.DataFrame([{
            "entry": entry,
            "direction": 1 if direction == "long" else 0,
            "tp_dist": abs(tp1 - entry) / entry,  # Normalized as percentage
            "sl_dist": abs(stop - entry) / entry,  # Normalized as percentage
            "volatility": volatility,
            "distance_sma": (entry - sma) / entry,  # Normalized as percentage
            "rsi": rsi
        }])
        
        # Get prediction probabilities
        proba = model.predict_proba(X)[0]
        
        # Map probabilities to outcomes
        # proba[0] = chance of perdedor (0)
        # proba[1] = chance of parcial (1)
        # proba[2] = chance of vencedor (2)
        
        # Check if the model returns 3 classes (should match training)
        if len(proba) >= 3:
            win_prob = proba[2]  # Probability of full win
        else:
            # Handle case where model might only return 2 classes
            win_prob = proba[-1]  # Use last class as win
            
        return win_prob, proba
    except Exception as e:
        print(f"Erro na predição: {e}")
        return 0, [1, 0, 0]  # Assume loss in case of error

def save_signals(signals):
    """
    Save signals to database
    """
    if not signals:
        print("Nenhum sinal para salvar.")
        return
        
    session = Session()
    try:
        for s in signals:
            # Check if signal already exists
            exists = session.query(Signal).filter_by(
                symbol=s["symbol"], 
                timestamp=datetime.fromisoformat(s["timestamp"])
            ).first()
            
            if not exists:
                new_signal = Signal(
                    symbol=s["symbol"],
                    timestamp=datetime.fromisoformat(s["timestamp"]),
                    direction=s["direction"],
                    entry=s["entry"],
                    tp1=s["tp1"],
                    tp2=s["tp2"],
                    tp3=s["tp3"],
                    stop_loss=s["stop_loss"],
                    resultado=None
                )
                session.add(new_signal)
                print(f"💾 Sinal salvo para {s['symbol']}")
        
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Erro ao salvar sinais: {e}")
    finally:
        session.close()

def generate_signals():
    """
    Generate signals using hybrid model
    """
    signals = []
    
    print(f"🔍 Analisando {len(SYMBOLS)} símbolos com modelo híbrido...")
    
    for symbol in SYMBOLS:
        try:
            df = fetch_ohlcv(symbol)
            if df.empty:
                print(f"⚠️ Sem dados para {symbol}")
                continue

            price = df["close"].iloc[-1]
            
            # Generate signals for both directions
            for direction in ["long", "short"]:
                # Set take profits and stop loss based on direction
                if direction == "long":
                    tp1 = round(price * 1.01, 2)
                    tp2 = round(price * 1.02, 2)
                    tp3 = round(price * 1.03, 2)
                    sl = round(price * 0.995, 2)
                else:
                    tp1 = round(price * 0.99, 2)
                    tp2 = round(price * 0.98, 2)
                    tp3 = round(price * 0.97, 2)
                    sl = round(price * 1.005, 2)

                # Predict with hybrid model
                chance_vencedor, probs = predict_with_hybrid(df, direction, price, tp1, sl)
                
                # Format probabilities for output
                probs_formatted = {
                    "perdedor": f"{probs[0]*100:.1f}%",
                    "parcial": f"{probs[1]*100:.1f}%" if len(probs) > 1 else "N/A",
                    "vencedor": f"{probs[2]*100:.1f}%" if len(probs) > 2 else "N/A"
                }
                
                # Generate signal if probability is above threshold
                if chance_vencedor > 0.5:
                    signal = {
                        "symbol": symbol,
                        "timestamp": datetime.utcnow().isoformat(),
                        "entry": price,
                        "direction": direction,
                        "tp1": tp1,
                        "tp2": tp2,
                        "tp3": tp3,
                        "stop_loss": sl,
                        "confidence": round(chance_vencedor, 4),
                        "conf_nivel": "alta" if chance_vencedor > 0.7 else "média",
                        "resultado": None
                    }
                    signals.append(signal)
                    print(f"✅ Sinal {direction.upper()} gerado para {symbol} com {round(chance_vencedor*100, 1)}% chance de vitória")
                    print(f"   Probabilidades: {json.dumps(probs_formatted)}")
                else:
                    print(f"❌ Sinal {direction.upper()} rejeitado para {symbol} ({round(chance_vencedor*100, 1)}% < threshold)")
        except Exception as e:
            print(f"Erro processando {symbol}: {e}")

    # Save signals to database
    save_signals(signals)
    print(f"📊 Gerados {len(signals)} sinais no total.")
    
    return signals

if __name__ == "__main__":
    print("🚀 Iniciando geração de sinais com modelo híbrido...")
    
    # Start the automatic signal evaluator
    print("⏰ Iniciando avaliador automático de sinais (executa a cada 1 hora)")
    iniciar_avaliador_automatico()
    
    signals = generate_signals()
    print(json.dumps(signals, indent=2))
