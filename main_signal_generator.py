
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

# Load configuration
config_path = 'config.json'
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    config = {"symbol": "BTCUSDT"}

def main():
    """
    Main function to run the trading signal generator.
    """
    logger.info("Starting trade_signal_agent")
    
    # Initialize ML retraining scheduler
    start_ml_scheduler()
    
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
            
            # Process each symbol
            for symbol in symbols[:10]:  # Limit to 10 symbols for testing
                logger.info(f"Analyzing symbol: {symbol}")
                
                try:
                    # Generate signal
                    raw_signal = generate_signal(symbol)
                    
                    # Validate signal
                    signal = validate_signal(raw_signal)
                    
                    if signal:
                        # Apply risk management
                        final = manage_risk(signal)
                        
                        if final:
                            # Store signal
                            insert_signal(final)
                            logger.info(f"Signal stored: {symbol} {final['signal']} @ {final['entry_price']}")
                except Exception as e:
                    logger.exception(f"Error processing {symbol}: {str(e)}")
            
            # Sleep before next cycle
            logger.info("Waiting 60 seconds before next cycle...")
            time.sleep(60)
            
    except KeyboardInterrupt:
        logger.info("Execution interrupted by user")
    except Exception as e:
        logger.exception(f"Unexpected error: {str(e)}")

if __name__ == "__main__":
    main()
