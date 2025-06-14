# ml/ml_predictor.py

import joblib
import numpy as np
import os

def load_model():
    """Carrega o modelo e o encoder se existirem."""
    model_path = 'model/signal_classifier.pkl'
    encoder_path = 'model/label_encoder.pkl'
    
    if not os.path.exists(model_path) or not os.path.exists(encoder_path):
        print("❌ Modelo não encontrado. Execute o treinamento primeiro.")
        return None, None
    
    model = joblib.load(model_path)
    label_encoder = joblib.load(encoder_path)
    return model, label_encoder

# Carrega modelo na inicialização
model, label_encoder = load_model()

def predict_signal_quality(signal_features):
    """
    Recebe um dict com: rsi, adx, volume_ratio, candle_body_ratio
    Retorna a classificação prevista: WINNER, PARTIAL, LOSER, FALSE
    
    Args:
        signal_features: Dict com as features do sinal
        
    Returns:
        str: Previsão da qualidade do sinal
    """
    global model, label_encoder
    
    if model is None or label_encoder is None:
        print("⚠️ Modelo não carregado. Usando fallback conservador.")
        return "LOSER"  # Conservador quando modelo não disponível
    
    try:
        # Converte features para array numpy
        feature_vector = np.array([
            signal_features['rsi'],
            signal_features['adx'],
            signal_features['volume_ratio'],
            signal_features['candle_body_ratio']
        ]).reshape(1, -1)

        # Faz a previsão
        pred_numeric = model.predict(feature_vector)[0]
        pred_label = label_encoder.inverse_transform([pred_numeric])[0]
        
        print(f"🤖 ML Previsão: {pred_label} (features: {signal_features})")
        return pred_label
        
    except Exception as e:
        print(f"❌ Erro na previsão ML: {e}")
        return "LOSER"  # Conservador em caso de erro

def get_prediction_confidence(signal_features):
    """
    Retorna a confiança da previsão (probabilidades das classes).
    
    Args:
        signal_features: Dict com as features do sinal
        
    Returns:
        dict: Probabilidades por classe
    """
    global model, label_encoder
    
    if model is None or label_encoder is None:
        return {}
    
    try:
        feature_vector = np.array([
            signal_features['rsi'],
            signal_features['adx'],
            signal_features['volume_ratio'],
            signal_features['candle_body_ratio']
        ]).reshape(1, -1)

        # Probabilidades
        probabilities = model.predict_proba(feature_vector)[0]
        classes = label_encoder.inverse_transform(range(len(probabilities)))
        
        confidence = dict(zip(classes, probabilities))
        return confidence
        
    except Exception as e:
        print(f"❌ Erro ao calcular confiança: {e}")
        return {}