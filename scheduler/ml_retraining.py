# scheduler/ml_retraining.py

import schedule
import time
import threading
from ml.train_model import train_signal_model
from ml.ml_predictor import load_model
from datetime import datetime

def train_from_signals():
    """
    Função que executa o re-treinamento do modelo ML com base nos sinais avaliados.
    """
    try:
        print(f"🔄 [ML SCHEDULER] Iniciando re-treinamento automático em {datetime.utcnow().isoformat()}")
        
        # Treinar modelo com dados atualizados
        model, label_encoder = train_signal_model()
        
        if model is not None:
            print(f"✅ [ML SCHEDULER] Re-treinamento concluído com sucesso!")
            
            # Recarregar modelo no predictor
            from ml import ml_predictor
            ml_predictor.model, ml_predictor.label_encoder = load_model()
            print(f"🔄 [ML SCHEDULER] Modelo recarregado no predictor")
        else:
            print(f"⚠️ [ML SCHEDULER] Re-treinamento pulado - dados insuficientes")
            
    except Exception as e:
        print(f"❌ [ML SCHEDULER] Erro no re-treinamento: {e}")

def start_ml_scheduler():
    """
    Inicia o agendador para re-treinamento automático do modelo ML.
    """
    # Agendar re-treinamento a cada 6 horas
    schedule.every(6).hours.do(train_from_signals)
    
    def run_scheduler():
        print(f"🕐 [ML SCHEDULER] Agendador ML iniciado - re-treinamento a cada 6 horas")
        while True:
            schedule.run_pending()
            time.sleep(60)  # Verificar a cada minuto
    
    # Executar em thread separada
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    print(f"✅ [ML SCHEDULER] Thread do agendador ML iniciada")

def trigger_manual_retrain():
    """
    Dispara re-treinamento manual do modelo.
    """
    print(f"🔧 [ML SCHEDULER] Re-treinamento manual disparado")
    train_from_signals()

if __name__ == "__main__":
    start_ml_scheduler()
    # Manter o script rodando
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("🛑 Agendador ML interrompido")