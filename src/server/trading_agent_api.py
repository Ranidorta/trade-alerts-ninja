
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

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Paths
MODEL_PATH = "model.pkl"
DB_PATH = "signals.db"
CAPITAL_HISTORY_PATH = "capital_history.json"

# Load or create the online classification model
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
else:
    model = preprocessing.StandardScaler() | linear_model.LogisticRegression()

# Adjustable parameters
RSI_THRESHOLD_BUY = 30
RSI_THRESHOLD_SELL = 70
ATR_MIN = 0.5
VOLATILITY_MIN = 0.3
RISK_REWARD_RATIO = 1.5
RISK_PER_TRADE = 0.02  # 2% of capital per trade

# Base fictional capital (can come from external config later)
ACCOUNT_BALANCE = 10000  # example: R$10,000


def create_db():
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
    df['rsi'] = talib.RSI(df['close'], timeperiod=14)
    df['ma_short'] = talib.SMA(df['close'], timeperiod=5)
    df['ma_long'] = talib.SMA(df['close'], timeperiod=20)
    df['atr'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=14)
    df['volatility'] = df['close'].rolling(10).std()
    df['macd'], df['macd_signal'], _ = talib.MACD(df['close'], fastperiod=12, slowperiod=26, signalperiod=9)
    upper, middle, lower = talib.BBANDS(df['close'], timeperiod=20)
    df['bb_upper'] = upper
    df['bb_lower'] = lower
    df = df.dropna()
    return df


def generate_signal(row):
    # Strategy with confluence of indicators and risk/volatility filters + MACD and BBands
    if (
        row['rsi'] < RSI_THRESHOLD_BUY and
        row['ma_short'] > row['ma_long'] and
        row['atr'] > ATR_MIN and
        row['volatility'] > VOLATILITY_MIN and
        row['macd'] > row['macd_signal'] and
        row['close'] < row['bb_lower']
    ):
        return 1  # Buy signal
    elif (
        row['rsi'] > RSI_THRESHOLD_SELL and
        row['ma_short'] < row['ma_long'] and
        row['atr'] > ATR_MIN and
        row['volatility'] > VOLATILITY_MIN and
        row['macd'] < row['macd_signal'] and
        row['close'] > row['bb_upper']
    ):
        return -1  # Sell signal
    return 0


def update_model(row, outcome):
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
    stop_loss = atr
    take_profit = atr * RISK_REWARD_RATIO
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
    risk_amount = capital * risk_pct
    if atr == 0:
        return 0
    size = risk_amount / atr
    return round(size, 2)


def calculate_profit_loss(signal, result, entry_price, exit_price, position_size):
    if signal == 1:  # Long position
        return position_size * (exit_price - entry_price) if result == 1 else -position_size * atr
    elif signal == -1:  # Short position
        return position_size * (entry_price - exit_price) if result == 1 else -position_size * atr
    return 0


def process_market_data(df, symbol="BTCUSDT"):
    create_db()
    df = extract_features(df)
    current_capital = ACCOUNT_BALANCE
    
    for i in range(len(df) - 5):
        row = df.iloc[i]
        signal = generate_signal(row)
        
        if signal != 0:
            future_price = df.iloc[i + 5]['close']
            result, exit_price = simulate_trade(signal, row['close'], future_price, row['atr'])
            
            if result is not None:
                # Update the online learning model
                update_model(row, result)
                
                # Calculate position size based on current capital
                position_size = calculate_position_size(current_capital, row['atr'], RISK_PER_TRADE)
                
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
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    c = conn.cursor()
    c.execute('SELECT * FROM signals ORDER BY id DESC')
    signals = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(signals)


@app.route('/api/performance', methods=['GET'])
def get_performance():
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
            result = process_market_data(df, symbol)
            
            # Clean up
            os.remove(temp_file_path)
            
            return jsonify(result)
        except Exception as e:
            return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    create_db()  # Ensure database exists
    app.run(debug=True, port=5000)
