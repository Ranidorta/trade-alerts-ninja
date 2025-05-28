
import time
import threading
from datetime import datetime, timedelta
from api.data_fetcher import get_current_price
from utils.signal_storage import get_pending_signals, update_signal_result
from utils.logger import logger

def evaluate_signal(signal):
    """
    Evaluate a signal against current market price.
    
    Args:
        signal: Signal dictionary with entry price, SL, TP levels
        
    Returns:
        Result string (WINNER, PARTIAL, LOSER, FALSE) or None if still pending
    """
    try:
        symbol = signal["symbol"]
        entry_price = signal["price"]
        signal_direction = signal["signal"]
        
        # Get target levels from signal
        sl = signal.get("sl", 0)
        tp1 = signal.get("tp1", 0)
        tp2 = signal.get("tp2", 0)
        tp3 = signal.get("tp3", 0)
        
        # Get current price
        current_price = get_current_price(symbol)
        
        if current_price == 0:
            logger.warning(f"Could not get current price for {symbol}")
            return None
        
        # Evaluate based on signal direction
        if signal_direction.lower() in ["buy", "long"]:
            # Long position evaluation
            if current_price <= sl:
                return "LOSER"
            elif current_price >= tp3:
                return "WINNER"
            elif current_price >= tp2:
                return "PARTIAL"
            elif current_price >= tp1:
                return "PARTIAL"
        else:
            # Short position evaluation
            if current_price >= sl:
                return "LOSER"
            elif current_price <= tp3:
                return "WINNER"
            elif current_price <= tp2:
                return "PARTIAL"
            elif current_price <= tp1:
                return "PARTIAL"
        
        # Check if signal is too old (mark as FALSE after 24 hours)
        signal_time = datetime.fromisoformat(signal["timestamp"].replace('Z', '+00:00'))
        if datetime.now() - signal_time > timedelta(hours=24):
            return "FALSE"
        
        return None  # Still pending
        
    except Exception as e:
        logger.error(f"Error evaluating signal {signal.get('id', 'unknown')}: {str(e)}")
        return None

def evaluate_signals_job():
    """
    Evaluate all pending signals and update their results.
    """
    try:
        pending_signals = get_pending_signals()
        logger.info(f"Evaluating {len(pending_signals)} pending signals")
        
        for signal in pending_signals:
            result = evaluate_signal(signal)
            if result:
                update_signal_result(signal["id"], result)
                logger.info(f"Signal {signal['id']} ({signal['symbol']}) updated to {result}")
                
    except Exception as e:
        logger.error(f"Error in signal evaluation job: {str(e)}")

def start_evaluator(interval=60):
    """
    Start the signal evaluator in a background thread.
    
    Args:
        interval: Evaluation interval in seconds
    """
    def job():
        logger.info("Signal evaluator started")
        while True:
            try:
                evaluate_signals_job()
                time.sleep(interval)
            except Exception as e:
                logger.error(f"Error in evaluator thread: {str(e)}")
                time.sleep(interval)
    
    thread = threading.Thread(target=job, daemon=True)
    thread.start()
    logger.info(f"Signal evaluator thread started with {interval}s interval")
