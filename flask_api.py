
"""
Flask API Server for Trading Signals
Provides endpoints for retrieving signal data from SQLite database
"""

import sqlite3
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import os
import requests
import json

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database configuration
DB_PATH = "signals.db"
RAW_DATA_DIR = "raw_data"

# Ensure database file exists
if not os.path.exists(DB_PATH):
    print(f"Warning: Database file {DB_PATH} not found. Will be created when signals are generated.")

# Create raw data directory if it doesn't exist
if not os.path.exists(RAW_DATA_DIR):
    os.makedirs(RAW_DATA_DIR)

# Helper function to convert SQLite row to dictionary
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

# Helper function to connect to the database
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    return conn

# Convert signal value to type
def signal_direction(signal_value):
    if signal_value == 1:
        return "BUY"
    elif signal_value == -1:
        return "SELL"
    return "NEUTRAL"

# Convert numeric result to status
def signal_status(result):
    if result == 1:
        return "COMPLETED"
    elif result == 0:
        return "COMPLETED"
    return "ACTIVE"

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "OK", "timestamp": datetime.utcnow().isoformat()})

@app.route('/api/signals', methods=['GET'])
def get_signals():
    """Get all signals with optional filtering"""
    symbol = request.args.get('symbol')
    signal_type = request.args.get('type')
    days = request.args.get('days', default=7, type=int)
    
    # Calculate date threshold
    date_threshold = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Build query with parameters
    query = "SELECT * FROM signals WHERE timestamp > ?"
    params = [date_threshold]
    
    if symbol:
        query += " AND symbol = ?"
        params.append(symbol)
    
    if signal_type:
        query += " AND signal_type = ?"
        params.append(signal_type)
    
    query += " ORDER BY timestamp DESC"
    
    cursor.execute(query, params)
    signals = cursor.fetchall()
    conn.close()
    
    # Transform data for frontend
    for signal in signals:
        signal['direction'] = signal_direction(signal['signal'])
        signal['status'] = signal_status(signal['result'])
        # For compatibility with frontend TradingSignal type
        signal['createdAt'] = signal['timestamp']
        signal['id'] = str(signal['id'])
        signal['pair'] = signal['symbol']
        signal['type'] = "LONG" if signal['signal'] == 1 else "SHORT"
        signal['entryPrice'] = signal['entry_price']
        signal['leverage'] = 1  # Default leverage
        # Estimate targets based on entry price and result
        signal['targets'] = [
            {"level": 1, "price": signal['entry_price'] * 1.03, "hit": signal['result'] == 1}
        ]
        signal['stopLoss'] = signal['entry_price'] * 0.97
    
    return jsonify(signals)

@app.route('/api/performance', methods=['GET'])
def get_performance():
    """Get performance metrics"""
    days = request.args.get('days', default=30, type=int)
    date_threshold = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get performance statistics with time filter
    cursor.execute("""
        SELECT 
            COUNT(*) as total_signals,
            SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as winning_trades,
            SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) as losing_trades,
            COUNT(DISTINCT symbol) as symbols_count
        FROM signals
        WHERE timestamp > ?
    """, [date_threshold])
    stats = cursor.fetchone()
    
    # Get signals by symbol
    cursor.execute("""
        SELECT symbol, COUNT(*) as count,
               SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as wins,
               SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) as losses
        FROM signals
        WHERE timestamp > ?
        GROUP BY symbol
        ORDER BY count DESC
    """, [date_threshold])
    symbols = cursor.fetchall()
    
    # Add win rate to each symbol
    for symbol in symbols:
        total = symbol['wins'] + symbol['losses']
        symbol['winRate'] = round((symbol['wins'] / total * 100), 2) if total > 0 else 0
    
    # Get signals by type
    cursor.execute("""
        SELECT signal_type, COUNT(*) as count,
               SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as wins,
               SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) as losses
        FROM signals
        WHERE timestamp > ?
        GROUP BY signal_type
    """, [date_threshold])
    types = cursor.fetchall()
    
    # Add win rate to each type
    for signal_type in types:
        total = signal_type['wins'] + signal_type['losses']
        signal_type['winRate'] = round((signal_type['wins'] / total * 100), 2) if total > 0 else 0
    
    # Get signals over time (daily aggregation)
    cursor.execute("""
        SELECT 
            date(timestamp) as date,
            COUNT(*) as total,
            SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) as losses
        FROM signals
        WHERE timestamp > ?
        GROUP BY date(timestamp)
        ORDER BY date
    """, [date_threshold])
    daily_data = cursor.fetchall()
    
    # Calculate win rate
    total = stats['winning_trades'] + stats['losing_trades']
    win_rate = (stats['winning_trades'] / total * 100) if total > 0 else 0
    
    conn.close()
    
    return jsonify({
        "totalSignals": stats['total_signals'],
        "winningTrades": stats['winning_trades'],
        "losingTrades": stats['losing_trades'],
        "winRate": round(win_rate, 2),
        "symbolsData": symbols,
        "signalTypesData": types,
        "dailyData": daily_data
    })

@app.route('/api/symbols', methods=['GET'])
def get_symbols():
    """Get all unique symbols"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT symbol FROM signals")
    symbols = [row['symbol'] for row in cursor.fetchall()]
    conn.close()
    return jsonify(symbols)

@app.route('/api/raw_data/<symbol>', methods=['GET'])
def get_raw_data(symbol):
    """Get raw candle data for a specific symbol"""
    try:
        filename = f"{RAW_DATA_DIR}/{symbol}.json"
        if os.path.exists(filename):
            with open(filename, 'r') as file:
                data = json.load(file)
                return jsonify(data)
        else:
            return jsonify({"error": f"No raw data found for {symbol}"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/available_symbols', methods=['GET'])
def get_available_symbols():
    """Get all available symbols from Bybit API with pagination support"""
    limit = request.args.get('limit', default=1000, type=int)
    cursor = request.args.get('cursor', default=None)
    
    params = {
        "category": "linear",
        "limit": limit
    }
    
    if cursor:
        params["cursor"] = cursor
    
    try:
        response = requests.get("https://api.bybit.com/v5/market/instruments", params=params)
        data = response.json()
        
        if "result" in data and "list" in data["result"]:
            symbols = [item["symbol"] for item in data["result"]["list"] if "USDT" in item["symbol"]]
            next_cursor = data["result"].get("nextPageCursor")
            
            return jsonify({
                "symbols": symbols,
                "nextCursor": next_cursor
            })
        
        return jsonify({"error": "Failed to fetch symbols"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
