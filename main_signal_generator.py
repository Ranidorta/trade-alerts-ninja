
"""
Main entry point for the trading signal generator.

This module periodically checks for new potential trading signals,
validates them, applies risk management, and stores them in the database.
"""

import time
import json
import os
from utils.logger import logger
from signals.signal_generator import generate_signal
from signals.validator import validate_signal
from utils.risk_manager import manage_risk
from utils.signal_storage import insert_signal
from utils.signal_evaluator import start_evaluator
from api.data_fetcher import get_symbols
from scheduler.ml_retraining import start_ml_scheduler
from ml.real_time_training import auto_retrain_model
from core.risk_management import DynamicRiskManager

# Load configuration
config_path = 'config.json'
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    config = {"symbol": "BTCUSDT"}

def main():
    """
    Main function to run the ADVANCED trading signal generator with ML.
    """
    logger.info("🚀 Starting ADVANCED trade_signal_agent v2.0")
    
    # Initialize components
    risk_manager = DynamicRiskManager()
    
    # Initialize ML retraining scheduler
    start_ml_scheduler()
    
    # Auto-retrain ML model if needed
    try:
        auto_retrain_model()
    except Exception as e:
        logger.error(f"❌ Erro no auto-retrain inicial: {e}")
    
    # Start the signal evaluator in background
    start_evaluator(interval=60)
    
    try:
        while True:
            # Get list of symbols to analyze
            try:
                symbols = get_symbols()
                if not symbols:
                    symbols = [config.get("symbol", "BTCUSDT")]
            except Exception as e:
                logger.error(f"Error getting symbols: {str(e)}")
                symbols = [config.get("symbol", "BTCUSDT")]
            
            logger.info(f"Processing {len(symbols)} symbols")
            
            # Process each symbol with ADVANCED filtering
            for symbol in symbols[:15]:  # Increase to 15 symbols for better coverage
                logger.info(f"🔍 Analyzing symbol: {symbol}")
                
                try:
                    # Generate signal with ADVANCED logic
                    raw_signal = generate_signal(symbol)
                    
                    # Validate signal
                    signal = validate_signal(raw_signal)
                    
                    if signal:
                        # Apply DYNAMIC risk management
                        final = manage_risk(signal)
                        
                        if final:
                            # Store signal
                            insert_signal(final)
                            logger.info(f"✅ ADVANCED Signal stored: {symbol} {final['signal']} @ {final['entry_price']}")
                            
                            # Update risk manager with result (placeholder)
                            # Em produção, isso seria chamado quando o resultado fosse conhecido
                            # risk_manager.evaluate_trade_result(final.get('result', 'PENDING'))
                        else:
                            logger.info(f"🛑 Signal blocked by risk management: {symbol}")
                    else:
                        logger.info(f"🛑 Signal validation failed: {symbol}")
                        
                except Exception as e:
                    logger.exception(f"❌ Error processing {symbol}: {str(e)}")
            
            # Periodic ML model update (a cada 10 ciclos = ~10 minutos)
            if hasattr(main, 'cycle_count'):
                main.cycle_count += 1
            else:
                main.cycle_count = 1
                
            if main.cycle_count % 10 == 0:
                try:
                    logger.info("🔄 Verificando necessidade de re-treino ML...")
                    auto_retrain_model()
                except Exception as e:
                    logger.error(f"❌ Erro no re-treino periódico: {e}")
            
            # Sleep before next cycle
            logger.info("Waiting 60 seconds before next cycle...")
            time.sleep(60)
            
    except KeyboardInterrupt:
        logger.info("Execution interrupted by user")
    except Exception as e:
        logger.exception(f"Unexpected error: {str(e)}")

if __name__ == "__main__":
    main()
