
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from services.evaluate_signals_pg import Signal
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestClassifier
import pandas as pd
import numpy as np
import os
import joblib

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_PATH = "ml/rf_hybrid_model.pkl"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Função de cálculo de RSI (reaproveitada)
def compute_rsi(prices, period=14):
    delta = prices.diff()
    gain = np.where(delta > 0, delta, 0)
    loss = np.where(delta < 0, -delta, 0)
    avg_gain = pd.Series(gain).rolling(period).mean()
    avg_loss = pd.Series(loss).rolling(period).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    rsi = 100 - (100 / (1 + rs))
    return rsi

def build_hybrid_features(sinais):
    rows = []
    for s in sinais:
        if s.resultado not in ["vencedor", "parcial", "perdedor", "falso"]:
            continue

        try:
            df = pd.read_csv(f"candles/{s.symbol}_15m.csv")  # assumindo arquivo local com histórico
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            candle = df[df["timestamp"] == s.timestamp]
            if candle.empty:
                continue
            candle = candle.iloc[0]
            rsi = compute_rsi(df["close"]).fillna(0).iloc[-1]

            rows.append({
                "entry": s.entry,
                "direction": 1 if s.direction == "long" else 0,
                "tp_dist": abs(s.tp1 - s.entry) / s.entry,  # Normalizada como percentual
                "sl_dist": abs(s.stop_loss - s.entry) / s.entry,  # Normalizada como percentual
                "volatility": df["close"].pct_change().rolling(10).std().fillna(0).iloc[-1],
                "distance_sma": (s.entry - df["close"].rolling(20).mean().fillna(0).iloc[-1]) / s.entry,
                "rsi": rsi,
                "target": {"vencedor": 2, "parcial": 1, "perdedor": 0, "falso": 0}[s.resultado]
            })
        except Exception as e:
            print(f"Erro ao processar {s.symbol} ID {s.id}: {e}")

    df_final = pd.DataFrame(rows)
    if df_final.empty:
        print("⚠️ Nenhum dado processado para treinar o modelo.")
        return None, None
        
    df_final.dropna(inplace=True)
    return df_final.drop(columns=["target"]), df_final["target"]

def train_hybrid():
    session = Session()
    sinais = session.query(Signal).filter(Signal.resultado != None).all()
    session.close()

    if not sinais:
        print("⚠️ Nenhum sinal com resultado para treinar.")
        return

    X, y = build_hybrid_features(sinais)
    if X is None or X.empty:
        print("⚠️ Não foi possível gerar features para o modelo.")
        return
        
    print(f"🔍 Treinando modelo com {len(X)} exemplos.")
    print(f"✓ Features disponíveis: {X.columns.tolist()}")
    
    # Verificar balanceamento das classes
    classes, counts = np.unique(y, return_counts=True)
    for cls, cnt in zip(classes, counts):
        print(f"   Classe {cls}: {cnt} exemplos")

    model = RandomForestClassifier(n_estimators=250, 
                                   max_depth=10,
                                   min_samples_leaf=5,
                                   class_weight="balanced",
                                   random_state=42)
    model.fit(X, y)
    
    # Importância das features
    importance = model.feature_importances_
    for i, col in enumerate(X.columns):
        print(f"   Feature {col}: {importance[i]:.4f} de importância")
    
    # Criar diretório para o modelo se não existir
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    joblib.dump(model, MODEL_PATH)
    print(f"✅ Modelo híbrido treinado e salvo em {MODEL_PATH}.")

if __name__ == "__main__":
    print("🚀 Iniciando treinamento do modelo híbrido...")
    train_hybrid()
