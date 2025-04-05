
"""
Machine Learning model training for signal prediction.

This module provides functions for training a machine learning model
to predict trading signals based on technical indicators.
"""

import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
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
    
    # Define feature set based on available indicators
    features = [
        'rsi', 'macd', 'close', 'sma_200', 'volume', 'volume_ma_20'
    ]
    
    # Add engineered features
    df['close_vs_sma200'] = df['close'] - df['sma_200']
    
    # Prepare features and target
    X = df[features + ['close_vs_sma200']]
    y = df['label']
    
    # Split data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train Random Forest classifier
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    print("\n📊 Relatório de Classificação:\n", classification_report(y_test, y_pred))
    
    # Feature importance
    feature_importance = dict(zip(X.columns, model.feature_importances_))
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

