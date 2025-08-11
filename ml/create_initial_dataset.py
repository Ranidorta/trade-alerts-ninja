# ml/create_initial_dataset.py

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def create_initial_training_dataset():
    """
    Cria dataset inicial para treinamento do modelo ML
    Baseado em padrões realistas de sinais de trading
    """
    print("📊 Criando dataset inicial para treinamento ML...")
    
    # Gerar dados simulados baseados em padrões reais
    np.random.seed(42)  # Para reprodutibilidade
    n_samples = 500
    
    data = []
    
    for i in range(n_samples):
        # Features base
        rsi = np.random.uniform(20, 80)
        adx = np.random.uniform(15, 45)
        volume_ratio = np.random.uniform(0.5, 3.0)
        candle_body_ratio = np.random.uniform(0.2, 0.9)
        
        # Lógica para determinar resultado baseada em padrões conhecidos
        score = 0
        
        # RSI patterns
        if 30 <= rsi <= 35 or 65 <= rsi <= 70:  # Sweet spots
            score += 0.3
        elif rsi < 25 or rsi > 75:  # Extreme zones
            score += 0.2
        elif 45 <= rsi <= 55:  # Neutral zone
            score += 0.1
        
        # ADX trend strength
        if adx > 25:  # Strong trend
            score += 0.25
        elif adx > 20:  # Moderate trend
            score += 0.15
        else:  # Weak trend
            score += 0.05
        
        # Volume confirmation
        if volume_ratio > 1.5:  # High volume
            score += 0.25
        elif volume_ratio > 1.0:  # Average volume
            score += 0.15
        else:  # Low volume
            score += 0.05
        
        # Candle body strength
        if candle_body_ratio > 0.7:  # Strong candle
            score += 0.2
        elif candle_body_ratio > 0.5:  # Moderate candle
            score += 0.15
        else:  # Weak candle
            score += 0.1
        
        # Add some noise
        score += np.random.uniform(-0.1, 0.1)
        
        # Determine result based on score
        if score >= 0.75:
            result = 'WINNER'
        elif score >= 0.55:
            result = 'PARTIAL'
        elif score >= 0.35:
            result = 'LOSER'
        else:
            result = 'FALSE'
        
        # Add timestamp
        timestamp = datetime.now() - timedelta(days=np.random.randint(1, 90))
        
        data.append({
            'timestamp': timestamp.isoformat(),
            'symbol': np.random.choice(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT']),
            'rsi': round(rsi, 2),
            'adx': round(adx, 2),
            'volume_ratio': round(volume_ratio, 3),
            'candle_body_ratio': round(candle_body_ratio, 3),
            'result': result,
            'score': round(score, 3)
        })
    
    # Criar DataFrame
    df = pd.DataFrame(data)
    
    # Balancear resultados para ter distribuição realística
    result_counts = df['result'].value_counts()
    print(f"📈 Distribuição de resultados:")
    for result, count in result_counts.items():
        percentage = (count / len(df)) * 100
        print(f"   {result}: {count} ({percentage:.1f}%)")
    
    # Salvar dataset
    os.makedirs('data', exist_ok=True)
    dataset_path = 'data/initial_training_dataset.csv'
    df.to_csv(dataset_path, index=False)
    
    print(f"✅ Dataset criado com {len(df)} amostras em: {dataset_path}")
    print(f"📊 Features: RSI, ADX, Volume Ratio, Candle Body Ratio")
    print(f"🎯 Classes: WINNER, PARTIAL, LOSER, FALSE")
    
    return dataset_path, df

if __name__ == "__main__":
    create_initial_training_dataset()