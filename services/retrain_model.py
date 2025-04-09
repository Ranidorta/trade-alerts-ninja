import numpy as np
from trainer import MLTrainer
from data.fetch_data import fetch_training_data  # Você precisará implementar essa função

def main():
    # Configurações
    MODEL_PATH = "models/trade_agent_model.pkl"
    RETRAIN_INTERVAL_DAYS = 7

    # 1. Carrega dados históricos para treino
    # (Implemente fetch_training_data conforme sua necessidade)
    X, y = fetch_training_data(symbols=["BTC/USDT", "ETH/USDT"], lookback_days=30)

    # 2. Inicializa o trainer
    trainer = MLTrainer(model_path=MODEL_PATH, retrain_interval_days=RETRAIN_INTERVAL_DAYS)

    # 3. Retreina se necessário
    if trainer.auto_retrain_if_needed(X, y):
        print("✅ Modelo retreinado com sucesso!")
    else:
        print("⏭️ Modelo atual ainda válido. Nenhum retreinamento necessário.")

if __name__ == "__main__":
    main()
