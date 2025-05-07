
"""
Signal evaluator loop for monitoring active signals and updating their status.
This script is designed to run as a background process, evaluating signals every minute.
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
BYBIT_API_URL = "https://api.bybit.com/v5/market/tickers"

# Initialize scheduler
scheduler = BackgroundScheduler()

def fetch_price(symbol: str) -> float:
    """
    Fetch the current price for a symbol from Bybit API.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT" or "BTC/USDT")
        
    Returns:
        Current price as float, or None if error
    """
    try:
        # Normalize symbol format - ensure uppercase and USDT format
        normalized_symbol = symbol.replace("/", "").replace("-", "").upper()
        
        # Add USDT suffix if not present and not a USDT pair already
        formatted_symbol = normalized_symbol if normalized_symbol.endswith("USDT") else f"{normalized_symbol}USDT"
        
        # Make API request
        response = requests.get(
            BYBIT_API_URL,
            params={"category": "spot", "symbol": formatted_symbol}
        )
        
        if response.status_code != 200:
            logger.error(f"API error: {response.status_code} - {response.text}")
            return None
            
        data = response.json()
        
        if data.get("ret_code") != 0 or "result" not in data:
            logger.error(f"API returned error: {data}")
            return None
            
        result_list = data["result"]["list"]
        if not result_list:
            logger.error(f"No price data found for {formatted_symbol}")
            return None
            
        price = float(result_list[0]["lastPrice"])
        logger.info(f"Fetched {formatted_symbol} price: {price}")
        return price
        
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {e}")
        return None

def evaluate_signal(signal: Signal, session):
    """
    Evaluate a signal based on current price and update its status.
    
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
            
        # Calculate signal lifetime
        now = datetime.utcnow()
        lifetime = now - created_at if created_at else timedelta(hours=24)  # Default to 24h if no timestamp
        
        # Skip signals less than 15 minutes old
        if lifetime < timedelta(minutes=15):
            logger.info(f"Signal {signal.id} is too recent (less than 15 minutes old)")
            return
            
        # Get current price
        current_price = fetch_price(symbol)
        if current_price is None:
            logger.error(f"Could not fetch price for {symbol}, skipping evaluation")
            return
            
        # Store evaluation time
        signal.verified_at = now
        
        # Evaluate signal based on direction and price
        result = None
        
        if direction in ["BUY", "LONG"]:
            if current_price <= stop_loss:
                result = "loss"
            elif tp3 and current_price >= tp3:
                result = "win"
            elif tp2 and current_price >= tp2:
                result = "partial"
            elif tp1 and current_price >= tp1:
                result = "partial"
            elif lifetime >= timedelta(minutes=15):
                # Signal is old enough and no targets hit, mark as false
                result = "false"
        elif direction in ["SELL", "SHORT"]:
            if current_price >= stop_loss:
                result = "loss"
            elif tp3 and current_price <= tp3:
                result = "win"
            elif tp2 and current_price <= tp2:
                result = "partial"
            elif tp1 and current_price <= tp1:
                result = "partial"
            elif lifetime >= timedelta(minutes=15):
                # Signal is old enough and no targets hit, mark as false
                result = "false"
                
        # Update signal in database
        if result:
            signal.resultado = result
            session.commit()
            logger.info(f"✅ Signal {signal.id} evaluated as {result}")
        else:
            logger.info(f"Signal {signal.id} still active, no result yet")
            
    except Exception as e:
        logger.error(f"Error evaluating signal {signal.id}: {e}")
        session.rollback()

@scheduler.scheduled_job('interval', minutes=1)
def run_monitor():
    """
    Main monitoring function that runs every minute.
    Fetches all active signals and evaluates them.
    """
    logger.info("🔍 Running signal evaluation...")
    
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
            evaluate_signal(signal, session)
            
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
    
    logger.info("⏱️ Signal monitoring service started")
    
    # Keep the process running
    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("Signal monitoring service stopped")

if __name__ == "__main__":
    main()
