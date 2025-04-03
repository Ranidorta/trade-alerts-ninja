
import requests
import json
import joblib
import numpy as np
import pandas as pd
import os
import time
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from services.evaluate_signals_pg import Signal, Base, main as avaliar_sinais
from sklearn.ensemble import RandomForestClassifier
from indicators.optimized import rsi_numba
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('trade_alerts')

# Load environment variables
load_dotenv()

# API and database configuration
BYBIT_ENDPOINT = os.getenv("VITE_API_URL", "https://api.bybit.com/v5/market/kline")
INTERVAL = os.getenv("VITE_INTERVAL", "15")
DATABASE_URL = os.getenv("DATABASE_URL")

# Trading symbols to monitor
SYMBOLS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT",
    "BNBUSDT", "XRPUSDT", "ADAUSDT", 
    "DOGEUSDT", "AVAXUSDT", "LINKUSDT",
    "MATICUSDT", "DOTUSDT", "OPUSDT"
]

# ML configuration
LOOKBACK = 100  # Number of candles to fetch for analysis
MODEL_PATH = "ml/rf_hybrid_model.pkl"
PREDICTION_THRESHOLD = 0.65  # Probability threshold for signal generation

# Initialize database connection
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Ensure database tables exist
Base.metadata.create_all(engine)

# Initialize scheduler
scheduler = BackgroundScheduler()

def fetch_ohlcv(symbol, retries=3):
    """
    Fetch OHLCV data from Bybit API with retry mechanism
    """
    params = {
        "category": "linear",
        "symbol": symbol,
        "interval": INTERVAL,
        "limit": LOOKBACK
    }

    for attempt in range(retries):
        try:
            response = requests.get(BYBIT_ENDPOINT, params=params)
            data = response.json()
            
            if "result" not in data or "list" not in data["result"]:
                logger.warning(f"Invalid response format for {symbol}, attempt {attempt+1}/{retries}")
                if attempt < retries - 1:
                    time.sleep(2)  # Wait before retry
                continue
                
            candles = data["result"]["list"]
            df = pd.DataFrame(candles, columns=["timestamp", "open", "high", "low", "close", "volume", "turnover"])
            df = df.astype(float)
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            if attempt < retries - 1:
                time.sleep(2)  # Wait before retry
    
    # Return empty DataFrame if all retries fail
    logger.error(f"Failed to fetch data for {symbol} after {retries} attempts")
    return pd.DataFrame()

def compute_technical_features(df):
    """
    Compute technical indicators for prediction
    """
    if df.empty:
        return {}

    try:
        # Calculate various technical indicators
        close = df["close"].values
        high = df["high"].values
        low = df["low"].values
        
        # Use numba-optimized RSI if possible, otherwise fall back to pandas
        try:
            rsi = rsi_numba(close)[-1]
        except:
            # Fallback calculation
            delta = pd.Series(close).diff()
            gain = delta.where(delta > 0, 0).rolling(window=14).mean()
            loss = -delta.where(delta < 0, 0).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs)).iloc[-1]
        
        # Moving averages
        sma20 = pd.Series(close).rolling(20).mean().iloc[-1]
        sma50 = pd.Series(close).rolling(50).mean().iloc[-1]
        
        # Volatility (10-period standard deviation of returns)
        returns = pd.Series(close).pct_change()
        volatility = returns.rolling(10).std().iloc[-1]
        
        # Current price
        current_price = close[-1]
        
        # Calculate distance from moving averages as percentage
        pct_diff_sma20 = (current_price - sma20) / current_price
        pct_diff_sma50 = (current_price - sma50) / current_price
        
        # Calculate ADX (Average Directional Index) - simplified version
        tr = pd.Series(np.maximum(high[1:] - low[1:],
                     np.maximum(np.abs(high[1:] - close[:-1]),
                               np.abs(low[1:] - close[:-1]))))
        atr14 = tr.rolling(14).mean().iloc[-1] if len(tr) > 14 else 0
        
        return {
            "price": current_price,
            "rsi": rsi,
            "sma20": sma20,
            "sma50": sma50,
            "volatility": volatility,
            "pct_diff_sma20": pct_diff_sma20,
            "pct_diff_sma50": pct_diff_sma50,
            "atr": atr14
        }
        
    except Exception as e:
        logger.error(f"Error calculating technical features: {e}")
        return {}

def predict_with_hybrid_model(features, direction, entry, tp1, sl):
    """
    Make prediction using the hybrid model
    """
    if not os.path.exists(MODEL_PATH):
        logger.warning(f"Model file not found: {MODEL_PATH}")
        return 0, [1, 0, 0]  # Default to 0 probability of success
        
    try:
        # Load the model
        model = joblib.load(MODEL_PATH)
        
        # Prepare feature vector for prediction
        X = pd.DataFrame([{
            "entry": entry,
            "direction": 1 if direction == "long" else 0,
            "tp_dist": abs(tp1 - entry) / entry,  # Normalized as percentage
            "sl_dist": abs(sl - entry) / entry,   # Normalized as percentage
            "volatility": features["volatility"],
            "distance_sma": features["pct_diff_sma20"],
            "rsi": features["rsi"]
        }])
        
        # Make prediction
        proba = model.predict_proba(X)[0]
        
        # Check if model returns 3 classes (should match training)
        if len(proba) >= 3:
            win_prob = proba[2]  # Probability of full win
        else:
            win_prob = proba[-1]  # Use last class as win
            
        return win_prob, proba
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return 0, [1, 0, 0]  # Default to 0 probability on error

def save_signal(signal_data):
    """
    Save a trading signal to the database
    """
    session = Session()
    try:
        # Check if signal already exists
        timestamp = datetime.fromisoformat(signal_data["timestamp"])
        exists = session.query(Signal).filter_by(
            symbol=signal_data["symbol"], 
            timestamp=timestamp
        ).first()
        
        if not exists:
            # Create new signal
            signal = Signal(
                symbol=signal_data["symbol"],
                timestamp=timestamp,
                direction=signal_data["direction"],
                entry=signal_data["entry"],
                tp1=signal_data["tp1"],
                tp2=signal_data["tp2"],
                tp3=signal_data["tp3"],
                stop_loss=signal_data["stop_loss"],
                resultado=None
            )
            session.add(signal)
            session.commit()
            logger.info(f"✅ Signal saved: {signal_data['symbol']} ({signal_data['direction']})")
            return True
            
        return False
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error saving signal: {e}")
        return False
        
    finally:
        session.close()

def train_from_signals():
    """
    Retrain the hybrid model using real signal results from database
    """
    logger.info("🔄 Starting model retraining from historical signals")
    
    session = Session()
    sinais = session.query(Signal).filter(Signal.resultado != None).all()
    session.close()
    
    if not sinais:
        logger.warning("No signals with results available for training")
        return False
    
    rows = []
    for s in sinais:
        # Only use signals with clear outcomes
        if s.resultado not in ["vencedor", "parcial", "perdedor", "falso"]:
            continue
            
        try:
            # Fetch historical data
            df = fetch_ohlcv(s.symbol)
            if df.empty:
                continue
                
            # Calculate technical features at time of signal
            features = compute_technical_features(df)
            if not features:
                continue
            
            # Create training example
            rows.append({
                "entry": s.entry,
                "direction": 1 if s.direction == "long" else 0,
                "tp_dist": abs(s.tp1 - s.entry) / s.entry,  # Normalized as percentage
                "sl_dist": abs(s.stop_loss - s.entry) / s.entry,  # Normalized as percentage
                "volatility": features["volatility"],
                "distance_sma": features["pct_diff_sma20"],
                "rsi": features["rsi"],
                "target": {"vencedor": 2, "parcial": 1, "perdedor": 0, "falso": 0}[s.resultado]
            })
            
        except Exception as e:
            logger.error(f"Error processing signal {s.id} for training: {e}")
            continue
    
    # Create DataFrame and remove rows with missing values
    df_train = pd.DataFrame(rows)
    df_train.dropna(inplace=True)
    
    # Check if we have enough training data
    if len(df_train) < 20:
        logger.warning(f"Insufficient training data: {len(df_train)} examples (need at least 20)")
        return False
        
    try:
        logger.info(f"Training model with {len(df_train)} examples")
        
        # Display class distribution
        target_counts = df_train["target"].value_counts()
        logger.info(f"Class distribution: {target_counts.to_dict()}")
        
        # Train model with class balancing
        model = RandomForestClassifier(
            n_estimators=300,
            max_depth=10,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42
        )
        
        X = df_train.drop("target", axis=1)
        y = df_train["target"]
        
        model.fit(X, y)
        
        # Save the model
        joblib.dump(model, MODEL_PATH)
        
        # Log feature importances
        feature_importance = {name: importance for name, importance in 
                             zip(X.columns, model.feature_importances_)}
        logger.info(f"Feature importances: {feature_importance}")
        
        logger.info(f"✅ Model successfully retrained and saved to {MODEL_PATH}")
        return True
        
    except Exception as e:
        logger.error(f"Error training model: {e}")
        return False

def generate_signals():
    """
    Generate trading signals based on technical analysis and ML predictions
    """
    logger.info("🔍 Generating trading signals")
    
    signals_generated = 0
    
    # Check if model exists, if not, create a simple baseline model
    if not os.path.exists(MODEL_PATH):
        logger.warning("Model not found, creating baseline model")
        train_from_signals()
    
    for symbol in SYMBOLS:
        try:
            logger.info(f"Analyzing {symbol}")
            
            # Fetch price data
            df = fetch_ohlcv(symbol)
            if df.empty:
                logger.warning(f"No data available for {symbol}")
                continue
                
            # Calculate technical features
            features = compute_technical_features(df)
            if not features:
                logger.warning(f"Could not calculate features for {symbol}")
                continue
                
            price = features["price"]
            
            # Generate both long and short scenarios and get probabilities
            signal_candidates = []
            
            for direction in ["long", "short"]:
                # Set take profits and stop loss based on ATR or volatility
                atr_multiplier = 1.5 
                volatility_factor = features["volatility"] * 100  # Convert to percentage
                
                # Use either ATR-based or fixed percentage levels, whichever is larger
                if direction == "long":
                    # For long positions
                    tp1 = round(price * (1 + max(0.01, atr_multiplier * features["atr"] / price)), 2)
                    tp2 = round(price * (1 + max(0.02, atr_multiplier * 1.5 * features["atr"] / price)), 2)
                    tp3 = round(price * (1 + max(0.03, atr_multiplier * 2 * features["atr"] / price)), 2)
                    sl = round(price * (1 - max(0.005, atr_multiplier * 0.75 * features["atr"] / price)), 2)
                else:
                    # For short positions
                    tp1 = round(price * (1 - max(0.01, atr_multiplier * features["atr"] / price)), 2)
                    tp2 = round(price * (1 - max(0.02, atr_multiplier * 1.5 * features["atr"] / price)), 2)
                    tp3 = round(price * (1 - max(0.03, atr_multiplier * 2 * features["atr"] / price)), 2)
                    sl = round(price * (1 + max(0.005, atr_multiplier * 0.75 * features["atr"] / price)), 2)

                # Predict success probability
                win_prob, probs = predict_with_hybrid_model(features, direction, price, tp1, sl)
                
                # Format probabilities for output
                probs_formatted = {
                    "perdedor": f"{probs[0]*100:.1f}%",
                    "parcial": f"{probs[1]*100:.1f}%" if len(probs) > 1 else "N/A",
                    "vencedor": f"{probs[2]*100:.1f}%" if len(probs) > 2 else "N/A"
                }
                
                logger.info(f"{symbol} {direction.upper()}: Win prob {win_prob*100:.1f}%, Probs: {probs_formatted}")
                
                signal_candidates.append({
                    "symbol": symbol,
                    "direction": direction,
                    "entry": price,
                    "tp1": tp1,
                    "tp2": tp2,
                    "tp3": tp3,
                    "stop_loss": sl,
                    "probability": win_prob,
                    "rsi": features["rsi"],
                    "sma_dist": features["pct_diff_sma20"],
                    "volatility": features["volatility"]
                })
            
            # Select the best direction based on highest probability
            best_candidate = max(signal_candidates, key=lambda x: x["probability"])
            
            # Only generate signal if probability exceeds threshold
            if best_candidate["probability"] >= PREDICTION_THRESHOLD:
                signal_data = {
                    "symbol": best_candidate["symbol"],
                    "timestamp": datetime.utcnow().isoformat(),
                    "direction": best_candidate["direction"],
                    "entry": best_candidate["entry"],
                    "tp1": best_candidate["tp1"],
                    "tp2": best_candidate["tp2"], 
                    "tp3": best_candidate["tp3"],
                    "stop_loss": best_candidate["stop_loss"],
                    "confidence": round(best_candidate["probability"], 4),
                    "confidence_level": "alta" if best_candidate["probability"] > 0.8 else "média"
                }
                
                if save_signal(signal_data):
                    signals_generated += 1
                    logger.info(f"✅ Generated {best_candidate['direction']} signal for {symbol} " +
                              f"with {best_candidate['probability']*100:.1f}% confidence")
            else:
                logger.info(f"❌ No signal generated for {symbol} (probability below threshold)")
                
        except Exception as e:
            logger.error(f"Error processing {symbol}: {e}")
    
    logger.info(f"🏁 Generated {signals_generated} signals")
    return signals_generated

def setup_scheduler():
    """
    Set up scheduled tasks
    """
    # Make sure we're not adding duplicate jobs
    scheduler.shutdown(wait=False)
    
    # Create a new scheduler
    scheduler = BackgroundScheduler()
    
    # Add jobs to the scheduler
    scheduler.add_job(avaliar_sinais, 'interval', hours=1, id='avaliador_de_sinais',
                     max_instances=1, coalesce=True)
    scheduler.add_job(train_from_signals, 'interval', hours=6, id='retrain_model',
                     max_instances=1, coalesce=True)
    scheduler.add_job(generate_signals, 'interval', hours=2, id='signal_generator',
                     max_instances=1, coalesce=True)
    
    # Start the scheduler
    scheduler.start()
    logger.info("⏰ Scheduler started with the following jobs:")
    logger.info("  - Signal evaluation: every 1 hour")
    logger.info("  - Model retraining: every 6 hours") 
    logger.info("  - Signal generation: every 2 hours")
    
    return scheduler

if __name__ == "__main__":
    logger.info("🚀 Trade Alerts Advanced System Starting")
    
    # Load initial model or train if doesn't exist
    if not os.path.exists(MODEL_PATH):
        logger.info("Initial model not found, attempting to train")
        train_from_signals()
    else:
        logger.info(f"Loaded existing model from {MODEL_PATH}")
    
    # Set up the scheduler
    scheduler = setup_scheduler()
    
    # Generate initial signals
    generate_signals()
    
    logger.info("✅ System initialized and running")
    
    # Keep the script running
    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("System shutdown")
