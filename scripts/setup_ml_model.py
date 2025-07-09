# scripts/setup_ml_model.py

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.create_initial_dataset import create_initial_training_dataset
from ml.train_model import train_model
import pandas as pd

def setup_initial_ml_model():
    """
    Configura o modelo ML inicial para o sistema Monster Signals
    """
    print("🚀 Configurando modelo ML inicial para Monster Signals...")
    
    try:
        # Etapa 1: Criar dataset inicial
        print("\n📊 ETAPA 1: Criando dataset inicial...")
        dataset_path, df = create_initial_training_dataset()
        
        # Etapa 2: Treinar modelo inicial
        print("\n🤖 ETAPA 2: Treinando modelo inicial...")
        
        # Preparar dados para treinamento
        features = ['rsi', 'adx', 'volume_ratio', 'candle_body_ratio']
        target = 'result'
        
        X = df[features].values
        y = df[target].values
        
        # Treinar modelo
        model_path, encoder_path, accuracy = train_model(X, y)
        
        print(f"\n✅ CONFIGURAÇÃO ML COMPLETA!")
        print(f"📈 Modelo treinado com {len(df)} amostras")
        print(f"🎯 Acurácia: {accuracy:.3f}")
        print(f"📁 Modelo salvo em: {model_path}")
        print(f"📁 Encoder salvo em: {encoder_path}")
        
        # Testar modelo
        print(f"\n🧪 TESTE DO MODELO:")
        from ml.ml_predictor import predict_signal_quality, get_prediction_confidence
        
        # Teste com features típicas
        test_features = {
            'rsi': 32.5,  # Oversold
            'adx': 28.0,  # Strong trend
            'volume_ratio': 2.1,  # High volume
            'candle_body_ratio': 0.75  # Strong candle
        }
        
        prediction = predict_signal_quality(test_features)
        confidence = get_prediction_confidence(test_features)
        
        print(f"   🔍 Features de teste: {test_features}")
        print(f"   🎯 Previsão: {prediction}")
        print(f"   📊 Confiança: {confidence}")
        
        if confidence:
            max_conf = max(confidence.values())
            print(f"   ✅ Confiança máxima: {max_conf:.3f}")
        
        print(f"\n🎉 Sistema Monster Signals com ML REAL está pronto!")
        print(f"🔧 Para retreinar: execute 'python ml/train_model.py'")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro na configuração ML: {e}")
        return False

if __name__ == "__main__":
    setup_initial_ml_model()