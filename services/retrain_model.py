import os
import numpy as np
from services.trainer import MLTrainer
from api.fetch_data import fetch_training_data

def main():
    # Configurações
    MODEL_PATH = "models/trade_agent_model.pkl"
    RETRAIN_INTERVAL_DAYS = 7  # Tempo mínimo entre retreinamentos

    # Garante que a pasta models exista
    os.makedirs("models", exist_ok=True)

    print("🔄 Carregando dados históricos para retreinamento...")
    X, y = fetch_training_data()  # Função já preparada no fetch_data.py

    print(f"📊 {len(X)} amostras carregadas. Iniciando verificação de modelo...")

    trainer = MLTrainer(
        model_path=MODEL_PATH,
        retrain_interval_days=RETRAIN_INTERVAL_DAYS
    )

    if trainer.auto_retrain_if_needed(X, y):
        print("✅ Modelo retreinado e salvo com sucesso!")
    else:
        print("⏭️ Nenhuma atualização necessária. Modelo ainda válido.")

if __name__ == "__main__":
    main()
