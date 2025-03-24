
"""
Flask API Server for Trading Signals
Provides endpoints for retrieving signal data from SQLite database
"""

import sqlite3
import pandas as pd
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from datetime import datetime, timedelta
import os
import requests
import json
import functools

# Firebase Auth
import firebase_admin
from firebase_admin import credentials, auth

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database configuration
DB_PATH = "signals.db"
RAW_DATA_DIR = "raw_data"

# Firebase initialization
try:
    cred = credentials.Certificate("firebase-service-account.json")
    firebase_admin.initialize_app(cred)
    print("Firebase initialized successfully")
except Exception as e:
    print(f"Firebase initialization error: {e}")
    # Continue without Firebase if file is missing (for development)

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

# Firebase token verification
def verify_firebase_token(id_token):
    try:
        # Check if Firebase is initialized
        if not firebase_admin._apps:
            print("Firebase not initialized, skipping auth")
            return None
            
        # Verify the token
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

# Authentication middleware
def require_auth(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the auth token from header
        auth_header = request.headers.get('Authorization')
        
        # For development and compatibility, allow no auth
        if not auth_header or not firebase_admin._apps:
            # Set a default user for development
            g.user_id = None
            g.auth_info = None
            return f(*args, **kwargs)
            
        # Remove 'Bearer ' prefix if present
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
            
        # Verify the token
        auth_info = verify_firebase_token(token)
        if not auth_info:
            return jsonify({"error": "Unauthorized: Invalid token"}), 401
            
        # Store user info in Flask g object for this request
        g.user_id = auth_info.get('uid')
        g.auth_info = auth_info
        
        return f(*args, **kwargs)
    return decorated_function

# Optional auth that still works if no token is provided
def optional_auth(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the auth token from header
        auth_header = request.headers.get('Authorization')
        
        # Default to no user if no auth header
        g.user_id = None
        g.auth_info = None
        
        # Skip if Firebase not initialized
        if not auth_header or not firebase_admin._apps:
            return f(*args, **kwargs)
            
        # Remove 'Bearer ' prefix if present
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
            
        # Verify the token
        auth_info = verify_firebase_token(token)
        if auth_info:
            g.user_id = auth_info.get('uid')
            g.auth_info = auth_info
            
        return f(*args, **kwargs)
    return decorated_function

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
@optional_auth
def get_signals():
    """Get all signals with optional filtering"""
    symbol = request.args.get('symbol')
    signal_type = request.args.get('type')
    strategy = request.args.get('strategy')  # Strategy parameter for filtering
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
    
    if strategy:
        query += " AND strategy_name = ?"
        params.append(strategy)
    
    # Filter by user_id if authenticated
    if g.user_id:
        query += " AND (user_id IS NULL OR user_id = ?)"
        params.append(g.user_id)
    
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
        
        # Use correct strategy name field
        if 'strategy_name' in signal and signal['strategy_name']:
            signal['strategy'] = signal['strategy_name']
        else:
            signal['strategy'] = signal.get('signal_type', 'UNKNOWN')
            
        # Estimate targets based on entry price and result
        signal['targets'] = [
            {"level": 1, "price": signal['entry_price'] * 1.03, "hit": signal['result'] == 1}
        ]
        signal['stopLoss'] = signal['entry_price'] * 0.97
    
    return jsonify(signals)

@app.route('/api/strategies', methods=['GET'])
@optional_auth
def get_strategies():
    """Get all unique strategy names"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Try to get strategy_name first, fall back to signal_type if needed
    cursor.execute("""
        SELECT DISTINCT strategy_name as strategy
        FROM signals
        WHERE strategy_name IS NOT NULL AND strategy_name != ''
    """)
    
    strategies = [row['strategy'] for row in cursor.fetchall()]
    
    # Se não tiver estratégias ainda, retorna as estratégias padrão
    if not strategies:
        # Adicionando as novas estratégias implementadas
        strategies = ["CLASSIC", "FAST", "RSI_MACD", "BREAKOUT_ATR", "TREND_ADX"]
        
    conn.close()
    
    return jsonify(strategies)

@app.route('/api/performance', methods=['GET'])
@optional_auth
def get_performance():
    """Get performance metrics"""
    days = request.args.get('days', default=30, type=int)
    strategy = request.args.get('strategy')  # Optional strategy filter
    date_threshold = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Base query with time filter
    base_query = "timestamp > ?"
    params = [date_threshold]
    
    # Add strategy filter if provided
    if strategy:
        base_query += " AND strategy_name = ?"
        params.append(strategy)
    
    # Add user filter if authenticated
    if g.user_id:
        base_query += " AND (user_id IS NULL OR user_id = ?)"
        params.append(g.user_id)
    
    # Get performance statistics with filters
    query = f"""
        SELECT 
            COUNT(*) as total_signals,
            SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as winning_trades,
            SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) as losing_trades,
            COUNT(DISTINCT symbol) as symbols_count
        FROM signals
        WHERE {base_query}
    """
    cursor.execute(query, params)
    stats = cursor.fetchone()
    
    # Get signals by symbol
    query = f"""
        SELECT symbol, COUNT(*) as count,
               SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as wins,
               SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) as losses
        FROM signals
        WHERE {base_query}
        GROUP BY symbol
        ORDER BY count DESC
    """
    cursor.execute(query, params)
    symbols = cursor.fetchall()
    
    # Add win rate to each symbol
    for symbol in symbols:
        total = symbol['wins'] + symbol['losses']
        symbol['winRate'] = round((symbol['wins'] / total * 100), 2) if total > 0 else 0
    
    # Get signals by strategy
    query = f"""
        SELECT 
            CASE 
                WHEN strategy_name IS NOT NULL AND strategy_name != '' 
                THEN strategy_name 
                ELSE signal_type 
            END as strategy,
            COUNT(*) as count,
            SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) as losses
        FROM signals
        WHERE {base_query}
        GROUP BY strategy
    """
    cursor.execute(query, params)
    strategies = cursor.fetchall()
    
    # Add win rate and other metrics to each strategy
    for strat in strategies:
        total = strat['wins'] + strat['losses']
        strat['winRate'] = round((strat['wins'] / total * 100), 2) if total > 0 else 0
        
        # Calculate estimated profit (3% for wins, -1.5% for losses)
        profit = (strat['wins'] * 3) - (strat['losses'] * 1.5)
        strat['profit'] = round(profit, 2)
        
        # Calculate average trade profit
        if total > 0:
            strat['avgTradeProfit'] = round(profit / total, 2)
        else:
            strat['avgTradeProfit'] = 0
    
    # Get signals over time (daily aggregation)
    query = f"""
        SELECT 
            date(timestamp) as date,
            COUNT(*) as total,
            SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) as losses
        FROM signals
        WHERE {base_query}
        GROUP BY date(timestamp)
        ORDER BY date
    """
    cursor.execute(query, params)
    daily_data = cursor.fetchall()
    
    # Calculate win rate
    total = stats['winning_trades'] + stats['losing_trades']
    win_rate = (stats['winning_trades'] / total * 100) if total > 0 else 0
    
    # Calculate strategy comparison data
    query = """
        SELECT 
            strategy_name as strategy,
            total_signals,
            winning_signals as wins,
            losing_signals as losses,
            win_rate as winRate,
            avg_profit as profit
        FROM strategy_performance
        ORDER BY win_rate DESC
    """
    cursor.execute(query)
    strategy_performance = cursor.fetchall() or []
    
    conn.close()
    
    return jsonify({
        "totalSignals": stats['total_signals'],
        "winningTrades": stats['winning_trades'],
        "losingTrades": stats['losing_trades'],
        "winRate": round(win_rate, 2),
        "symbolsData": symbols,
        "signalTypesData": strategies,
        "strategyData": strategies,  # Adding explicit strategy data
        "strategyPerformance": strategy_performance,  # Added detailed performance data
        "dailyData": daily_data
    })

# ...restante dos endpoints mantém a mesma estrutura, adicionando optional_auth ou require_auth
# ... keep existing code (for strategy/performance, symbols, raw_data endpoints) but add the optional_auth decorator

@app.route('/api/user/profile', methods=['GET'])
@require_auth
def get_user_profile():
    """Get user profile data"""
    # This endpoint requires auth
    if not g.user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    return jsonify({
        "uid": g.user_id,
        "email": g.auth_info.get('email', ''),
        "name": g.auth_info.get('name', ''),
        "isAuthenticated": True
    })

# ...restante dos endpoints
# ... keep existing code (for if __name__ == "__main__", etc)

# Update save_signal_to_db to include user_id
def save_signal_to_db(symbol, strategy_name, signal, result, position_size, entry_price, user_id=None):
    """Salva um sinal no banco de dados com nome da estratégia e ID do usuário."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        timestamp = datetime.utcnow().isoformat()
        
        # Verificar e criar a coluna user_id se não existir
        cursor.execute("PRAGMA table_info(signals)")
        columns = [column[1] for column in cursor.fetchall()]
        if "user_id" not in columns:
            cursor.execute("ALTER TABLE signals ADD COLUMN user_id TEXT")
        
        # Usa INSERT OR IGNORE com UNIQUE constraint para evitar duplicatas
        cursor.execute('''
            INSERT OR IGNORE INTO signals 
            (symbol, signal_type, signal, result, position_size, entry_price, timestamp, strategy_name, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (symbol, "BUY" if signal == 1 else "SELL", signal, result, position_size, entry_price, timestamp, strategy_name, user_id))
        
        # Atualiza tabela de performance da estratégia
        update_strategy_performance(cursor, strategy_name, result)
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Erro ao salvar sinal no banco: {str(e)}")
        return False

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
