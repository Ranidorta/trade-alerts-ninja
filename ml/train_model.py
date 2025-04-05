
"""
Machine Learning model training for signal prediction.

This module provides functions for training a machine learning model
to predict trading signals based on technical indicators.
"""

import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report
from sklearn.preprocessing import StandardScaler
import joblib

def train_signal_model(df):
    """
    Train a RandomForestClassifier to predict signals based on technical indicators.
    
    Args:
        df: DataFrame with OHLCV data and technical indicators
        
    Returns:
        Trained model instance
    """
    # Clean data and create target variable
    df = df.dropna()
    df['label'] = (df['signal_score'] >= 70).astype(int)
    
    # Create additional features
    df['close_lag1'] = df['close'].shift(1)
    df['volume_change'] = df['volume'].pct_change()
    df['close_vs_sma200'] = df['close'] - df['sma_200']
    df['ema_12'] = df['close'].ewm(span=12).mean()
    df['ema_26'] = df['close'].ewm(span=26).mean()
    df['ema_ratio'] = df['ema_12'] / df['ema_26']
    df['volatility'] = df['high'] - df['low']
    
    # Define feature set based on available indicators
    features = [
        'rsi', 'macd', 'close', 'sma_200', 'volume', 'volume_ma_20',
        'close_vs_sma200', 'close_lag1', 'volume_change', 'ema_ratio', 'volatility'
    ]
    
    # Drop NaN values again after creating lag features
    df = df.dropna()
    
    # Prepare features and target
    X = df[features]
    y = df['label']
    
    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    # Train Random Forest classifier
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Perform cross-validation
    scores = cross_val_score(model, X_scaled, y, cv=5)
    print(f"\n🔄 Acurácia média (cross-validation): {scores.mean():.4f}")
    print(f"  - Desvio padrão: {scores.std():.4f}")
    print(f"  - Scores individuais: {[f'{s:.4f}' for s in scores]}")
    
    # Evaluate model
    y_pred = model.predict(X_test)
    print("\n📊 Relatório de Classificação:\n", classification_report(y_test, y_pred))
    
    # Feature importance
    feature_importance = dict(zip(list(X.columns), model.feature_importances_))
    print("\n🔍 Importância das Features:")
    for feature, importance in sorted(feature_importance.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {feature}: {importance:.4f}")
    
    # Ensure directory exists
    os.makedirs("model", exist_ok=True)
    
    # Save trained model
    model_path = "model/signal_classifier.pkl"
    joblib.dump(model, model_path)
    print(f"✅ Modelo salvo em {model_path}")
    
    return model

