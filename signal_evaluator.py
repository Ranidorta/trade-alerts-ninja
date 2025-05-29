
import time
import requests
import json
import os
from datetime import datetime, timedelta
from utils.signal_storage import get_all_signals, update_signal_result
from utils.logger import logger

# Load configuration
config_path = 'config.json'
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    config = {"default_duration_min": 1440}  # 24 hours default

def fetch_candles(symbol, start_time, end_time, interval="1"):
    """
    Fetch candlestick data from Bybit API.
    
    Args:
        symbol: Trading pair symbol (e.g., "BTCUSDT")
        start_time: Start timestamp in milliseconds
        end_time: End timestamp in milliseconds
        interval: Candle interval (1, 3, 5, 15, 30, 60, 240, D)
        
    Returns:
        List of candle data
    """
    url = "https://api.bybit.com/v5/market/kline"
    params = {
        "category": "linear",
        "symbol": symbol,
        "interval": interval,
        "start": int(start_time),
        "end": int(end_time),
        "limit": 1000
    }
    
    try:
        logger.info(f"Fetching candles for {symbol} from {start_time} to {end_time}")
        res = requests.get(url, params=params, timeout=10)
        data = res.json()
        
        if data.get("retCode") != 0:
            logger.error(f"Bybit API error: {data.get('retMsg', 'Unknown error')}")
            return []
            
        candles = data.get("result", {}).get("list", [])
        logger.info(f"Retrieved {len(candles)} candles for {symbol}")
        return candles
        
    except Exception as e:
        logger.error(f"Error fetching candles for {symbol}: {str(e)}")
        return []

def evaluate_signal(signal, duration_hours=24):
    """
    Evaluate a signal against historical price data.
    
    Args:
        signal: Signal dictionary from database
        duration_hours: How many hours to look ahead for evaluation
    """
    if signal.get("result"):
        logger.info(f"Signal {signal['id']} already evaluated: {signal['result']}")
        return  # Already evaluated

    try:
        # Parse signal timestamp
        signal_time_str = signal.get("timestamp") or signal.get("time", "")
        if not signal_time_str:
            logger.error(f"Signal {signal['id']} missing timestamp")
            return
            
        # Handle different timestamp formats
        try:
            if "T" in signal_time_str:
                signal_time = datetime.fromisoformat(signal_time_str.replace('Z', '+00:00'))
            else:
                signal_time = datetime.strptime(signal_time_str, "%Y-%m-%d %H:%M:%S")
        except ValueError as e:
            logger.error(f"Invalid timestamp format for signal {signal['id']}: {signal_time_str}")
            return

        # Calculate time range
        entry_time = int(signal_time.timestamp() * 1000)
        end_time = entry_time + (duration_hours * 60 * 60 * 1000)
        
        # Fetch candle data
        candles = fetch_candles(signal["symbol"], entry_time, end_time, interval="15")
        if not candles:
            logger.warning(f"No candles available for signal {signal['id']} ({signal['symbol']})")
            return

        # Initialize tracking variables
        touched_sl = False
        touched_tp1 = False
        touched_tp2 = False
        touched_tp3 = False

        # Get signal levels
        entry_price = float(signal.get("price", 0) or signal.get("entry_price", 0))
        sl_price = float(signal.get("sl", 0))
        tp1_price = float(signal.get("tp1", 0)) if signal.get("tp1") else None
        tp2_price = float(signal.get("tp2", 0)) if signal.get("tp2") else None
        tp3_price = float(signal.get("tp3", 0)) if signal.get("tp3") else None
        
        signal_direction = signal.get("signal", "").upper()
        
        logger.info(f"Evaluating signal {signal['id']}: {signal_direction} {signal['symbol']} @ {entry_price}")
        logger.info(f"SL: {sl_price}, TP1: {tp1_price}, TP2: {tp2_price}, TP3: {tp3_price}")

        # Analyze each candle
        for candle in candles:
            try:
                timestamp = int(candle[0])
                open_price = float(candle[1])
                high_price = float(candle[2])
                low_price = float(candle[3])
                close_price = float(candle[4])
                
                # Skip candles before signal time
                if timestamp < entry_time:
                    continue

                if signal_direction == "BUY" or signal_direction == "LONG":
                    # For BUY signals, check if price hit targets or stop loss
                    if not touched_sl and low_price <= sl_price:
                        touched_sl = True
                        logger.info(f"Signal {signal['id']}: Stop Loss hit at {low_price}")
                        
                    if not touched_tp1 and tp1_price and high_price >= tp1_price:
                        touched_tp1 = True
                        logger.info(f"Signal {signal['id']}: TP1 hit at {high_price}")
                        
                    if not touched_tp2 and tp2_price and high_price >= tp2_price:
                        touched_tp2 = True
                        logger.info(f"Signal {signal['id']}: TP2 hit at {high_price}")
                        
                    if not touched_tp3 and tp3_price and high_price >= tp3_price:
                        touched_tp3 = True
                        logger.info(f"Signal {signal['id']}: TP3 hit at {high_price}")
                        
                    # Stop if stop loss is hit
                    if touched_sl:
                        break
                        
                elif signal_direction == "SELL" or signal_direction == "SHORT":
                    # For SELL signals, check if price hit targets or stop loss
                    if not touched_sl and high_price >= sl_price:
                        touched_sl = True
                        logger.info(f"Signal {signal['id']}: Stop Loss hit at {high_price}")
                        
                    if not touched_tp1 and tp1_price and low_price <= tp1_price:
                        touched_tp1 = True
                        logger.info(f"Signal {signal['id']}: TP1 hit at {low_price}")
                        
                    if not touched_tp2 and tp2_price and low_price <= tp2_price:
                        touched_tp2 = True
                        logger.info(f"Signal {signal['id']}: TP2 hit at {low_price}")
                        
                    if not touched_tp3 and tp3_price and low_price <= tp3_price:
                        touched_tp3 = True
                        logger.info(f"Signal {signal['id']}: TP3 hit at {low_price}")
                        
                    # Stop if stop loss is hit
                    if touched_sl:
                        break
                        
            except (ValueError, IndexError) as e:
                logger.error(f"Error processing candle data: {e}")
                continue

        # Determine result based on what was touched
        result = None
        if touched_sl:
            result = "LOSER"
        elif touched_tp3:
            result = "WINNER"
        elif touched_tp2 or touched_tp1:
            result = "PARTIAL"
        else:
            result = "FALSE"  # No targets hit within time window

        # Update signal in database
        update_signal_result(signal["id"], result)
        logger.info(f"Signal {signal['id']} evaluated as: {result}")
        
    except Exception as e:
        logger.error(f"Error evaluating signal {signal.get('id', 'unknown')}: {str(e)}")

def evaluate_all_signals():
    """
    Evaluate all signals that don't have a result yet.
    """
    try:
        logger.info("Starting signal evaluation cycle...")
        signals = get_all_signals(limit=1000)  # Get more signals for evaluation
        
        # Filter signals that need evaluation
        pending_signals = [s for s in signals if not s.get("result")]
        
        logger.info(f"Found {len(pending_signals)} signals to evaluate")
        
        for signal in pending_signals:
            try:
                evaluate_signal(signal)
                time.sleep(0.5)  # Small delay to avoid rate limiting
            except Exception as e:
                logger.error(f"Error evaluating signal {signal.get('id', 'unknown')}: {str(e)}")
                
        logger.info("Signal evaluation cycle completed")
        
    except Exception as e:
        logger.error(f"Error in evaluate_all_signals: {str(e)}")

def run_evaluator_service(interval_minutes=10):
    """
    Run the signal evaluator as a service.
    
    Args:
        interval_minutes: How often to run evaluation (in minutes)
    """
    logger.info(f"Starting signal evaluator service (runs every {interval_minutes} minutes)")
    
    while True:
        try:
            evaluate_all_signals()
            logger.info(f"Sleeping for {interval_minutes} minutes...")
            time.sleep(interval_minutes * 60)
        except KeyboardInterrupt:
            logger.info("Signal evaluator service stopped by user")
            break
        except Exception as e:
            logger.error(f"Unexpected error in evaluator service: {str(e)}")
            time.sleep(60)  # Wait 1 minute before retrying

if __name__ == "__main__":
    # Can be run as a standalone service
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "once":
            # Run evaluation once and exit
            evaluate_all_signals()
        elif sys.argv[1] == "service":
            # Run as continuous service
            interval = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            run_evaluator_service(interval)
    else:
        # Default: run once
        evaluate_all_signals()
