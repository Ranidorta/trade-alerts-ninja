# ml/train_model.py

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib
import os

def train_signal_model(input_csv='signals_history.csv', output_model='model/signal_classifier.pkl'):
    """
    Treina um modelo RandomForest para prever a qualidade dos sinais de trading.
    
    Args:
        input_csv: Caminho para o arquivo CSV com histórico de sinais
        output_model: Caminho onde salvar o modelo treinado
    """
    os.makedirs('model', exist_ok=True)

    # Carrega os dados históricos
    df = pd.read_csv(input_csv)
    print(f"📊 Carregados {len(df)} sinais do arquivo {input_csv}")

    # Features para treinamento
    features = ['rsi', 'adx', 'volume_ratio', 'candle_body_ratio']
    X = df[features]

    # Prepara os labels
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df['result'])

    # Salva o encoder para uso posterior
    joblib.dump(label_encoder, 'model/label_encoder.pkl')
    print(f"💾 Label encoder salvo em model/label_encoder.pkl")

    # Treina o modelo
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model.fit(X_train, y_train)
    acc = model.score(X_test, y_test)
    print(f"🎯 Acurácia no conjunto de teste: {acc:.2%}")

    # Mostra importância das features
    feature_importance = dict(zip(features, model.feature_importances_))
    print("\n🔍 Importância das Features:")
    for feature, importance in sorted(feature_importance.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {feature}: {importance:.4f}")

    # Salva o modelo
    joblib.dump(model, output_model)
    print(f"✅ Modelo salvo em: {output_model}")

    return model, label_encoder

if __name__ == "__main__":
    train_signal_model()