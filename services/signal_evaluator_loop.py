
"""
Signal evaluator loop for monitoring active signals and updating their status.
This script is designed to run as a background process, evaluating signals based on historical candle data.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
import requests
import time
import logging
import os
from dotenv import load_dotenv

# Import SQLAlchemy models
from services.evaluate_signals_pg import Signal, Session, Base, engine

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s'
)
logger = logging.getLogger("signal_evaluator_loop")

# Load environment variables
load_dotenv()

# API Configuration
BYBIT_KLINE_URL = "https://api.bybit.com/v5/market/kline"

# Initialize scheduler
scheduler = BackgroundScheduler()

def get_candles(symbol, start_ms, end_ms, interval="1"):
    """
    Fetch candle data from Bybit API.
    
    Args:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT")
        start_ms (int): Start timestamp in milliseconds
        end_ms (int): End timestamp in milliseconds
        interval (str): Candle interval (default: "1" for 1-minute candles)
        
    Returns:
        list: List of candles
    """
    params = {
        "category": "spot",
        "symbol": symbol.replace("/", "").replace("-", "").upper(),
        "interval": interval,
        "start": start_ms,
        "end": end_ms,
        "limit": 200
    }
    try:
        resp = requests.get(BYBIT_KLINE_URL, params=params)
        if resp.status_code != 200:
            logger.error(f"API error: {resp.status_code} - {resp.text}")
            return []
            
        data = resp.json()
        return data.get("result", {}).get("list", [])
    except Exception as e:
        logger.error(f"Error fetching candles: {e}")
        return []

def evaluate_signal_with_candles(signal, session):
    """
    Evaluate a signal based on historical candle data.
    
    Args:
        signal: Signal object from database
        session: SQLAlchemy session
    """
    try:
        # Get basic signal data
        symbol = signal.symbol
        direction = signal.direction.upper() if signal.direction else "BUY"
        entry = signal.entry
        tp1 = signal.tp1
        tp2 = signal.tp2
        tp3 = signal.tp3
        stop_loss = signal.stop_loss
        created_at = signal.timestamp
        
        if signal.resultado:
            logger.info(f"Signal {signal.id} already evaluated as {signal.resultado}")
            return
        
        if not created_at:
            logger.error(f"Signal {signal.id} has no timestamp")
            return
            
        # Calculate time range for candles
        start_ms = int(created_at.timestamp() * 1000)
        end_ms = int((created_at + timedelta(hours=24)).timestamp() * 1000)
        
        # Get candles from Bybit API
        candles = get_candles(symbol, start_ms, end_ms, interval="1")
        
        if not candles:
            logger.warning(f"No candles found for {symbol} from {created_at} to {created_at + timedelta(hours=24)}")
            return
            
        result = None
        
        # Evaluate signal based on candles
        for candle in candles:
            high = float(candle[2])  # High price
            low = float(candle[3])   # Low price
            
            if direction in ["BUY", "LONG"]:
                if low <= stop_loss:
                    result = "loss"
                    break
                if high >= tp3:
                    result = "win"
                    break
                if high >= tp2 or high >= tp1:
                    result = "partial"
                    # Continue checking other candles for possible win or loss
            elif direction in ["SELL", "SHORT"]:
                if high >= stop_loss:
                    result = "loss"
                    break
                if low <= tp3:
                    result = "win"
                    break
                if low <= tp2 or low <= tp1:
                    result = "partial"
                    # Continue checking other candles for possible win or loss
        
        # If no result yet but we processed candles, mark as FALSE
        if not result and candles:
            result = "false"
            
        # Update signal in database
        if result:
            signal.resultado = result
            signal.verified_at = datetime.utcnow()
            session.commit()
            logger.info(f"✅ Signal {signal.id} evaluated as {result} using candle data")
        else:
            logger.info(f"Signal {signal.id} could not be evaluated, no conclusive data")
            
    except Exception as e:
        logger.error(f"Error evaluating signal {signal.id} with candles: {e}")
        session.rollback()

@scheduler.scheduled_job('interval', minutes=15)
def run_monitor():
    """
    Main monitoring function that runs every 15 minutes.
    Fetches all active signals and evaluates them using historical candle data.
    """
    logger.info("🔍 Running signal evaluation with candle data...")
    
    session = Session()
    try:
        # Get all signals without results
        signals = session.query(Signal).filter(Signal.resultado == None).all()
        
        if not signals:
            logger.info("No signals to evaluate")
            return
            
        logger.info(f"Found {len(signals)} signals to evaluate")
        
        # Evaluate each signal
        for signal in signals:
            evaluate_signal_with_candles(signal, session)
            # Add a small delay between API calls to avoid rate limits
            time.sleep(0.5)
            
    except Exception as e:
        logger.error(f"Error in evaluation run: {e}")
    finally:
        session.close()

def main():
    """
    Main function to start the scheduler.
    """
    # Ensure tables exist
    Base.metadata.create_all(engine)
    
    # Start the scheduler
    scheduler.start()
    
    logger.info("⏱️ Signal monitoring service started with candle-based evaluation")
    
    # Keep the process running
    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("Signal monitoring service stopped")

if __name__ == "__main__":
    main()
