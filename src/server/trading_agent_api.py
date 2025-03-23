"""
Trading Agent API with Continuous Learning

This module provides a Flask API for a trading agent that uses technical indicators
and machine learning to generate trading signals. It includes risk management,
position sizing, and online learning capabilities.
"""

import pandas as pd
import numpy as np
import talib
import os
import joblib
import sqlite3
import json
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from river import linear_model, preprocessing, metrics
from datetime import datetime

# Strategy imports
from strategies.basic_strategy import BasicStrategy
from strategies.advanced_strategy import AdvancedStrategy
from strategies.strategy_manager import StrategyManager

# Utility imports
from utils.feature_cache import FeatureCache
from utils.feature_extraction import FeatureExtractor

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Paths
MODEL_PATH = "model.pkl"
DB_PATH = "signals.db"
CAPITAL_HISTORY_PATH = "capital_history.json"
CACHE_DIR = "cache"

# Initialize feature extraction and caching
feature_extractor = FeatureExtractor(use_cache=True, cache_dir=CACHE_DIR)

# Initialize strategy manager
strategy_manager = StrategyManager()
strategy_manager.register_strategy("basic", BasicStrategy())
strategy_manager.register_strategy("advanced", AdvancedStrategy())

# Load or create the online classification model
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
else:
    model = preprocessing.StandardScaler() | linear_model.LogisticRegression()

# Base fictional capital (can come from external config later)
ACCOUNT_BALANCE = 10000  # example: R$10,000


def create_db():
    """Create SQLite database for signals if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            symbol TEXT,
            signal INTEGER,
            result INTEGER,
            entry_price REAL,
            exit_price REAL,
            atr REAL,
            position_size REAL,
            profit_loss REAL
        )
    ''')
    conn.commit()
    conn.close()
    
    # Initialize capital history if it doesn't exist
    if not os.path.exists(CAPITAL_HISTORY_PATH):
        with open(CAPITAL_HISTORY_PATH, 'w') as f:
            json.dump([{"date": datetime.now().strftime("%Y-%m-%d"), "capital": ACCOUNT_BALANCE}], f)


def save_signal_to_db(data):
    """Save a trading signal to the database."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO signals (timestamp, symbol, signal, result, entry_price, exit_price, atr, position_size, profit_loss)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['timestamp'],
        data['symbol'],
        data['signal'],
        data['result'],
        data['entry_price'],
        data['exit_price'],
        data['atr'],
        data['position_size'],
        data['profit_loss']
    ))
    conn.commit()
    conn.close()


def update_capital_history(profit_loss):
    """Update capital history with new profit/loss."""
    try:
        with open(CAPITAL_HISTORY_PATH, 'r') as f:
            history = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        history = [{"date": datetime.now().strftime("%Y-%m-%d"), "capital": ACCOUNT_BALANCE}]
    
    # Get the latest capital amount
    latest_capital = history[-1]["capital"]
    
    # Calculate new capital
    new_capital = latest_capital + profit_loss
    
    # Add new entry
    history.append({
        "date": datetime.now().strftime("%Y-%m-%d"),
        "capital": new_capital
    })
    
    # Save updated history
    with open(CAPITAL_HISTORY_PATH, 'w') as f:
        json.dump(history, f)
    
    return new_capital


def extract_features(df):
    """Extract technical indicators from price data."""
    return feature_extractor.extract_features(df)


def update_model(row, outcome):
    """Update online learning model with trade outcome."""
    x = {
        'rsi': row['rsi'],
        'ma_diff': row['ma_short'] - row['ma_long'],
        'atr': row['atr'],
        'volatility': row['volatility'],
        'macd': row['macd'],
        'bb_dist': row['close'] - row['bb_lower']  # how much the price is below the band
    }
    model.learn_one(x, outcome)
    joblib.dump(model, MODEL_PATH)


def simulate_trade(signal, entry_price, future_price, atr):
    """Simulate a trade to determine if it would have hit stop loss or take profit."""
    stop_loss = atr
    take_profit = atr * strategy_manager.get_active_strategy().RISK_REWARD_RATIO
    if signal == 1:
        if future_price >= entry_price + take_profit:
            return 1, future_price
        elif future_price <= entry_price - stop_loss:
            return 0, entry_price - stop_loss
    elif signal == -1:
        if future_price <= entry_price - take_profit:
            return 1, future_price
        elif future_price >= entry_price + stop_loss:
            return 0, entry_price + stop_loss
    return None, future_price


def calculate_position_size(capital, atr, risk_pct):
    """Calculate position size based on capital, ATR, and risk percentage."""
    risk_amount = capital * risk_pct
    if atr == 0:
        return 0
    size = risk_amount / atr
    return round(size, 2)


def calculate_profit_loss(signal, result, entry_price, exit_price, position_size):
    """Calculate profit or loss from a trade."""
    if signal == 1:  # Long position
        return position_size * (exit_price - entry_price) if result == 1 else -position_size * atr
    elif signal == -1:  # Short position
        return position_size * (entry_price - exit_price) if result == 1 else -position_size * atr
    return 0


def process_market_data(df, symbol="BTCUSDT", strategy_name="basic"):
    """Process market data to generate and evaluate trading signals."""
    create_db()
    
    # Extract features
    df = extract_features(df)
    current_capital = ACCOUNT_BALANCE
    
    # Use the specified strategy
    active_strategy = strategy_manager.get_strategy(strategy_name)
    strategy_manager.set_active_strategy(strategy_name)
    
    # Add future price column (shifted by 5 periods)
    df['future_price'] = df['close'].shift(-5)
    
    # Check if we're using the advanced strategy which supports vectorization
    if isinstance(active_strategy, AdvancedStrategy):
        # Generate signals using vectorized method
        df['signal'] = active_strategy.generate_signals_vectorized(df)
        
        # Filter out rows with no signal or NaN future price
        df = df[(df['signal'] != 0) & df['future_price'].notna()].copy()
        
        if not df.empty:
            # Simulate trades using vectorized method
            df['result'] = active_strategy.simulate_trades_vectorized(df)
            
            # Calculate position sizes
            df['position_size'] = active_strategy.calculate_position_sizes_vectorized(
                current_capital, df['atr'].values
            )
            
            # Process results
            for i, row in df.iterrows():
                if pd.notna(row['result']):
                    # Update the model with the outcome
                    update_model(row, row['result'])
                    
                    # Calculate profit/loss for this trade
                    if row['signal'] == 1:  # Long
                        exit_price = row['future_price'] if row['result'] == 1 else (row['close'] - row['atr'])
                        profit_loss = row['position_size'] * (exit_price - row['close'])
                    else:  # Short
                        exit_price = row['future_price'] if row['result'] == 1 else (row['close'] + row['atr'])
                        profit_loss = row['position_size'] * (row['close'] - exit_price)
                    
                    # Update capital
                    current_capital += profit_loss
                    
                    # Save signal to database
                    signal_data = {
                        'timestamp': row.get('time', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                        'symbol': symbol,
                        'signal': row['signal'],
                        'result': row['result'],
                        'entry_price': row['close'],
                        'exit_price': exit_price,
                        'atr': row['atr'],
                        'position_size': row['position_size'],
                        'profit_loss': profit_loss
                    }
                    
                    save_signal_to_db(signal_data)
                    update_capital_history(profit_loss)
    else:
        # Use original non-vectorized method for basic strategy
        for i in range(len(df) - 5):
            row = df.iloc[i]
            signal = active_strategy.generate_signal(row)
            
            if signal != 0:
                future_price = df.iloc[i + 5]['close']
                result, exit_price = simulate_trade(signal, row['close'], future_price, row['atr'])
                
                if result is not None:
                    # Update the online learning model
                    update_model(row, result)
                    
                    # Calculate position size based on current capital
                    position_size = calculate_position_size(
                        current_capital, 
                        row['atr'], 
                        active_strategy.RISK_PER_TRADE
                    )
                    
                    # Calculate profit/loss
                    profit_loss = calculate_profit_loss(signal, result, row['close'], exit_price, position_size)
                    
                    # Update capital
                    current_capital += profit_loss
                    
                    # Save signal to database
                    signal_data = {
                        'timestamp': row.get('time', datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                        'symbol': symbol,
                        'signal': signal,
                        'result': result,
                        'entry_price': row['close'],
                        'exit_price': exit_price,
                        'atr': row['atr'],
                        'position_size': position_size,
                        'profit_loss': profit_loss
                    }
                    
                    save_signal_to_db(signal_data)
                    update_capital_history(profit_loss)
                
    return {"message": "Processing completed successfully", "final_capital": current_capital}


# API Routes
@app.route('/api/signals', methods=['GET'])
def get_signals():
    """Retrieve all signals from the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    c = conn.cursor()
    c.execute('SELECT * FROM signals ORDER BY id DESC')
    signals = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(signals)


@app.route('/api/performance', methods=['GET'])
def get_performance():
    """Get performance metrics of the trading system."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Get total signals
    c.execute('SELECT COUNT(*) as total FROM signals')
    total_signals = c.fetchone()['total']
    
    # Get winning signals
    c.execute('SELECT COUNT(*) as winning FROM signals WHERE result = 1')
    winning_signals = c.fetchone()['winning']
    
    # Get total profit/loss
    c.execute('SELECT SUM(profit_loss) as total_pnl FROM signals')
    total_pnl = c.fetchone()['total_pnl'] or 0
    
    # Calculate win rate
    win_rate = (winning_signals / total_signals * 100) if total_signals > 0 else 0
    
    # Get average position size
    c.execute('SELECT AVG(position_size) as avg_position FROM signals')
    avg_position = c.fetchone()['avg_position'] or 0
    
    conn.close()
    
    # Get capital history
    try:
        with open(CAPITAL_HISTORY_PATH, 'r') as f:
            capital_history = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        capital_history = [{"date": datetime.now().strftime("%Y-%m-%d"), "capital": ACCOUNT_BALANCE}]
    
    return jsonify({
        'totalSignals': total_signals,
        'winningSignals': winning_signals,
        'losingSignals': total_signals - winning_signals,
        'winRate': round(win_rate, 2),
        'totalPnL': round(total_pnl, 2),
        'avgPositionSize': round(avg_position, 2),
        'capitalHistory': capital_history
    })


@app.route('/api/process', methods=['POST'])
def process_data():
    """Process uploaded market data and generate signals."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Save the uploaded file temporarily
        temp_file_path = 'temp_market_data.csv'
        file.save(temp_file_path)
        
        # Read and process the file
        try:
            df = pd.read_csv(temp_file_path)
            symbol = request.form.get('symbol', 'BTCUSDT')
            strategy_name = request.form.get('strategy', 'basic')
            result = process_market_data(df, symbol, strategy_name)
            
            # Clean up
            os.remove(temp_file_path)
            
            return jsonify(result)
        except Exception as e:
            return jsonify({'error': str(e)}), 500


@app.route('/api/strategies', methods=['GET'])
def get_strategies():
    """Get list of available strategies."""
    return jsonify(strategy_manager.list_strategies())


if __name__ == '__main__':
    create_db()  # Ensure database exists
    app.run(debug=True, port=5000)
