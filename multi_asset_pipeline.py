
"""
Multi-asset pipeline for automated trading signal generation and analysis.

This script automates the process of collecting data, generating trading signals,
calculating risk management parameters, optimizing strategy parameters, comparing
with buy & hold, and training ML models for multiple cryptocurrency assets.
"""

import time
import os
import logging
import pandas as pd
from datetime import datetime

# Import project modules
from utils.data import get_binance_data, save_data_to_csv
from strategies.core import SignalGenerator
from backtesting.optimizer import optimize_params, compare_strategy_vs_benchmark
from ml.train_model import train_signal_model
from utils.risk_management import calculate_stop_loss

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("pipeline.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("multi_asset_pipeline")

# List of symbols to process
symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']

def process_symbol(symbol, interval='1h', limit=500):
    """
    Process a single trading symbol with the complete pipeline.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        interval: Candlestick interval (default: "1h")
        limit: Number of candles to retrieve (default: 500)
        
    Returns:
        Dict with processing results or None if failed
    """
    start_time = time.time()
    logger.info(f"📥 Processing {symbol}...")
    
    try:
        # Fetch data
        df = get_binance_data(symbol, interval=interval, limit=limit)
        
        if df.empty:
            logger.warning(f"⚠️ Empty data for {symbol}. Skipping.")
            return None
            
        # Save raw data to CSV
        csv_path = save_data_to_csv(df, symbol, interval)
        logger.info(f"📄 Raw data saved to {csv_path}")
        
        # Generate signals
        logger.info(f"🔍 Generating signals for {symbol}...")
        sg = SignalGenerator(df)
        df_signals = sg.generate_signal()
        
        # Merge signals with original data
        df = df.merge(df_signals[['timestamp', 'close', 'signal_score']], 
                      on=['timestamp', 'close'], how='left')
        
        # Calculate risk management parameters
        logger.info(f"🛡️ Calculating risk management parameters for {symbol}...")
        df_risk = calculate_stop_loss(df)
        
        # Extract sample trades for verification
        sample_trades = df_risk.iloc[-5:][['timestamp', 'close', 'stop_loss', 'take_profit_1']].copy()
        logger.info(f"Sample trades (most recent):\n{sample_trades}")
        
        # Optimize strategy parameters
        logger.info(f"⚙️ Optimizing strategy parameters for {symbol}...")
        optimization_results = optimize_params(df)
        
        if optimization_results and 'best_sharpe' in optimization_results:
            best_sharpe = optimization_results.get('best_sharpe', 0)
            best_params = optimization_results.get('params', {})
            logger.info(f"Best parameters: {best_params}, Sharpe: {best_sharpe:.2f}")
        else:
            logger.warning(f"No optimization results for {symbol}")
        
        # Compare strategy with benchmark
        logger.info(f"📊 Comparing strategy vs benchmark for {symbol}...")
        comparison = compare_strategy_vs_benchmark(df)
        
        for key, value in comparison.items():
            if isinstance(value, float):
                logger.info(f"{key}: {value:.2f}")
            else:
                logger.info(f"{key}: {value}")
        
        # Train ML model
        logger.info(f"🧠 Training ML model for {symbol}...")
        model = train_signal_model(df)
        
        # Calculate execution time
        exec_time = time.time() - start_time
        logger.info(f"✅ Processing completed for {symbol} in {exec_time:.2f} seconds")
        
        # Return results
        return {
            "symbol": symbol,
            "data_points": len(df),
            "signal_threshold_70": len(df[df['signal_score'] >= 70]),
            "signal_threshold_30": len(df[df['signal_score'] <= 30]),
            "strategy_sharpe": comparison.get("strategy_sharpe", 0),
            "benchmark_sharpe": comparison.get("benchmark_sharpe", 0),
            "outperformance": comparison.get("outperformance", 0),
            "execution_time": exec_time
        }
        
    except Exception as e:
        logger.error(f"❌ Error processing {symbol}: {str(e)}", exc_info=True)
        return None

def run_all(interval='1h', sleep_time=3600):
    """
    Run the complete pipeline for all symbols continuously.
    
    Args:
        interval: Candlestick interval (default: "1h")
        sleep_time: Sleep time between runs in seconds (default: 3600)
    """
    # Create results directory
    os.makedirs("results", exist_ok=True)
    
    # Run continuously
    while True:
        run_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"\n🚀 Running pipeline for multiple assets at {run_time}...")
        
        results = []
        for symbol in symbols:
            result = process_symbol(symbol, interval=interval)
            if result:
                results.append(result)
        
        # Save summary to CSV
        if results:
            results_df = pd.DataFrame(results)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            results_path = f"results/pipeline_results_{timestamp}.csv"
            results_df.to_csv(results_path, index=False)
            logger.info(f"📊 Summary results saved to {results_path}")
        
        # Check if this is a one-time run (for testing)
        if sleep_time <= 0:
            logger.info("One-time run completed. Exiting.")
            break
            
        logger.info(f"⏱️ Waiting {sleep_time} seconds until next execution...\n")
        time.sleep(sleep_time)

if __name__ == "__main__":
    # Parse command line arguments if needed
    import argparse
    
    parser = argparse.ArgumentParser(description="Multi-asset pipeline for trading signals")
    parser.add_argument("--interval", type=str, default="1h", help="Candlestick interval")
    parser.add_argument("--symbols", type=str, help="Comma-separated list of symbols")
    parser.add_argument("--oneshot", action="store_true", help="Run once and exit")
    
    args = parser.parse_args()
    
    # Override symbols if provided
    if args.symbols:
        symbols = args.symbols.split(',')
        
    # Run pipeline
    if args.oneshot:
        run_all(interval=args.interval, sleep_time=0)
    else:
        run_all(interval=args.interval)
