
"""
Main entry point for the trading signal generation pipeline.

This module provides the main function to run the entire pipeline:
1. Data collection from Binance
2. Signal generation with scores
3. Parameter optimization
4. Machine learning model training
5. Backtesting and evaluation
"""

from strategies.core import SignalGenerator
from backtesting.optimizer import optimize_params, backtest_strategy
from ml.train_model import train_signal_model
from utils.data import get_binance_data

import pandas as pd

def run_pipeline(symbol='BTCUSDT', interval='1h'):
    """
    Run the complete trading signal pipeline.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        interval: Candlestick interval (e.g., "1h", "4h", "1d")
    
    Returns:
        Dictionary with results from all pipeline stages
    """
    print(f"🚀 Coletando dados de {symbol}...")
    df = get_binance_data(symbol, interval)

    print("⚙️  Gerando sinais...")
    generator = SignalGenerator(df)
    df_signals = generator.generate_signal()
    df = df.merge(df_signals, on=['timestamp', 'close'], how='left')

    print("🔍 Otimizando parâmetros...")
    best = optimize_params(df)
    print("📈 Melhores parâmetros:", best)

    print("🤖 Treinando modelo com aprendizado supervisionado...")
    model = train_signal_model(df)

    print("📊 Avaliação completa:")
    stats = backtest_strategy(df)
    print(stats)

    print("✅ Pipeline finalizado com sucesso!")
    
    return {
        "model": model,
        "optimization": best,
        "backtest": stats,
        "data": df
    }

if __name__ == "__main__":
    run_pipeline()
