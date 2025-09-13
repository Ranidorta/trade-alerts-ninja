# ml/continuous_learning.py

import schedule
import time
import threading
from datetime import datetime, timedelta
import pandas as pd
import os
from ml.train_model import train_signal_model
from ml.ml_predictor import load_model
from ml.save_evaluation_result import save_evaluation_result

class ContinuousLearningAgent:
    def __init__(self):
        self.last_training = None
        self.min_signals_for_training = 5
        self.training_interval_hours = 4
        self.is_running = False
        
    def should_retrain(self):
        """Verifica se é necessário retreinar o modelo."""
        # Verifica se existe histórico suficiente
        if not os.path.exists('signals_history.csv'):
            return False
            
        df = pd.read_csv('signals_history.csv')
        
        # Verifica se há novos sinais desde o último treinamento
        if self.last_training:
            new_signals = df[df['timestamp'] > self.last_training.isoformat()]
            if len(new_signals) < self.min_signals_for_training:
                return False
        
        # Verifica se há dados suficientes
        if len(df) < self.min_signals_for_training:
            return False
            
        # Verifica intervalo de tempo
        if self.last_training:
            time_since_last = datetime.utcnow() - self.last_training
            if time_since_last < timedelta(hours=self.training_interval_hours):
                return False
                
        return True
    
    def continuous_train(self):
        """Executa o treinamento contínuo do modelo."""
        try:
            if not self.should_retrain():
                print(f"🔄 [CONTINUOUS ML] Sem necessidade de retreinamento ainda")
                return
                
            print(f"🚀 [CONTINUOUS ML] Iniciando retreinamento automático em {datetime.utcnow().isoformat()}")
            
            # Treinar modelo com dados atualizados
            model, label_encoder = train_signal_model()
            
            if model is not None:
                print(f"✅ [CONTINUOUS ML] Retreinamento concluído com sucesso!")
                
                # Recarregar modelo no predictor
                from ml import ml_predictor
                ml_predictor.model, ml_predictor.label_encoder = load_model()
                print(f"🔄 [CONTINUOUS ML] Modelo recarregado no predictor")
                
                self.last_training = datetime.utcnow()
            else:
                print(f"⚠️ [CONTINUOUS ML] Retreinamento pulado - dados insuficientes")
                
        except Exception as e:
            print(f"❌ [CONTINUOUS ML] Erro no retreinamento: {e}")
    
    def start_continuous_learning(self):
        """Inicia o agente de aprendizado contínuo."""
        if self.is_running:
            return
            
        # Agendar retreinamento a cada 4 horas
        schedule.every(self.training_interval_hours).hours.do(self.continuous_train)
        
        def run_scheduler():
            print(f"🧠 [CONTINUOUS ML] Agente de aprendizado contínuo iniciado")
            print(f"📊 [CONTINUOUS ML] Retreinamento automático a cada {self.training_interval_hours} horas")
            print(f"📈 [CONTINUOUS ML] Mínimo de {self.min_signals_for_training} sinais para retreinamento")
            
            self.is_running = True
            while self.is_running:
                schedule.run_pending()
                time.sleep(300)  # Verificar a cada 5 minutos
        
        # Executar em thread separada
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        
        print(f"✅ [CONTINUOUS ML] Thread do agente de aprendizado iniciada")
        
        # Fazer um treinamento inicial se necessário
        self.continuous_train()
    
    def stop_continuous_learning(self):
        """Para o agente de aprendizado contínuo."""
        self.is_running = False
        print(f"🛑 [CONTINUOUS ML] Agente de aprendizado contínuo parado")
    
    def force_retrain(self):
        """Força um retreinamento imediato."""
        print(f"🔧 [CONTINUOUS ML] Retreinamento manual forçado")
        self.continuous_train()
    
    def get_learning_stats(self):
        """Retorna estatísticas do aprendizado."""
        stats = {
            "is_running": self.is_running,
            "last_training": self.last_training.isoformat() if self.last_training else None,
            "signals_processed": 0,
            "model_exists": os.path.exists('model/signal_classifier.pkl')
        }
        
        if os.path.exists('signals_history.csv'):
            df = pd.read_csv('signals_history.csv')
            stats["signals_processed"] = len(df)
            
            if self.last_training:
                recent_signals = df[df['timestamp'] > self.last_training.isoformat()]
                stats["new_signals_since_training"] = len(recent_signals)
        
        return stats

# Instância global do agente
continuous_learning_agent = ContinuousLearningAgent()

def start_continuous_learning():
    """Função para iniciar o aprendizado contínuo."""
    continuous_learning_agent.start_continuous_learning()

def stop_continuous_learning():
    """Função para parar o aprendizado contínuo."""
    continuous_learning_agent.stop_continuous_learning()

def force_retrain():
    """Função para forçar retreinamento."""
    continuous_learning_agent.force_retrain()

def get_learning_stats():
    """Função para obter estatísticas do aprendizado."""
    return continuous_learning_agent.get_learning_stats()

if __name__ == "__main__":
    start_continuous_learning()
    
    # Manter o script rodando
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("🛑 Agente de aprendizado contínuo interrompido")
        stop_continuous_learning()