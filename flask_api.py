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
from firebase_admin import firestore

# Import our local modules
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from strategies.bollinger_bands import strategy_bollinger_bands
from backtesting.performance import generate_performance_report
from services.evaluate_signals_pg import Signal, Session, get_candles, evaluate_signal
from routes import signal_evaluation_bp, performance_api_bp
from api.hybrid_signals_api import hybrid_signals_api
from api.signals_api import signals_api  # Make sure signals_api is imported

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register blueprints
app.register_blueprint(signal_evaluation_bp)
app.register_blueprint(performance_api_bp)
app.register_blueprint(hybrid_signals_api)
app.register_blueprint(signals_api)  # Register signals_api blueprint

# Database configuration
DB_PATH = "signals.db"
RAW_DATA_DIR = "raw_data"

# Firebase initialization
try:
    cred = credentials.Certificate("firebase-service-account.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
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
        
        # Get additional user data from Firestore to check subscription status
        if decoded_token and 'uid' in decoded_token:
            user_ref = db.collection('users').document(decoded_token['uid'])
            user_doc = user_ref.get()
            
            if user_doc.exists:
                user_data = user_doc.to_dict()
                # Add subscription status to the decoded token
                decoded_token['assinaturaAtiva'] = user_data.get('assinaturaAtiva', False)
                decoded_token['role'] = user_data.get('role', 'user')
                
                # Special case for specific users (for testing)
                if decoded_token.get('email') == "ranier.dorta@gmail.com":
                    decoded_token['assinaturaAtiva'] = True
        
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

# Premium content authentication middleware
def require_premium(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # First verify authentication
        auth_header = request.headers.get('Authorization')
        
        # For development, bypass premium check
        if not auth_header or not firebase_admin._apps:
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
        
        # Check if user has active subscription or is admin
        has_premium_access = (
            auth_info.get('assinaturaAtiva', False) == True or 
            auth_info.get('role', 'user') == 'admin'
        )
        
        if not has_premium_access:
            return jsonify({
                "error": "Premium access required", 
                "message": "Esta funcionalidade requer uma assinatura ativa."
            }), 403
            
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
@require_premium  # Changed from optional_auth to require_premium for signal data
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
        
        # Usar leverage do banco de dados, se disponível
        if 'leverage' in signal and signal['leverage']:
            signal['leverage'] = signal['leverage']
        else:
            signal['leverage'] = 1  # Default leverage
        
        # Use correct strategy name field
        if 'strategy_name' in signal and signal['strategy_name']:
            signal['strategy'] = signal['strategy_name']
        else:
            signal['strategy'] = signal.get('signal_type', 'UNKNOWN')
            
        # Add performance metrics if available
        if 'sharpe_ratio' in signal or 'max_drawdown' in signal:
            signal['performance'] = {
                'sharpeRatio': signal.get('sharpe_ratio'),
                'maxDrawdown': signal.get('max_drawdown'),
                'winRate': None,  # Will be calculated from performance endpoint
                'totalTrades': None
            }
            
        # Estimate targets based on entry price and result
        signal['targets'] = [
            {"level": 1, "price": signal['entry_price'] * 1.03, "hit": signal['result'] == 1}
        ]
        signal['stopLoss'] = signal['entry_price'] * 0.97
    
    return jsonify(signals)

@app.route('/api/strategies', methods=['GET'])
@require_premium  # Added premium requirement for strategies
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
        strategies = ["CLASSIC", "FAST", "RSI_MACD", "BREAKOUT_ATR", "TREND_ADX", "BOLLINGER_BANDS"]
        
    conn.close()
    
    return jsonify(strategies)

@app.route('/api/performance', methods=['GET'])
@require_premium  # Added premium requirement for performance metrics
def get_performance():
    """Get performance metrics"""
    # ... keep existing code (performance endpoint implementation)
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
            SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) as losses,
            AVG(sharpe_ratio) as sharpe_ratio,
            AVG(max_drawdown) as max_drawdown
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
            avg_profit as profit,
            sharpe_ratio,
            max_drawdown
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

@app.route('/api/symbols', methods=['GET'])
@require_premium  # Added premium requirement for symbols list
def get_symbols():
    """Get all unique symbols with signal counts"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT DISTINCT symbol, COUNT(*) as count
        FROM signals
        GROUP BY symbol
        ORDER BY count DESC
    """)
    
    symbols = [row['symbol'] for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(symbols)

@app.route('/api/raw_data/<symbol>', methods=['GET'])
@require_premium  # Added premium requirement for raw data
def get_raw_data(symbol):
    """Get raw candle data for a symbol"""
    filepath = os.path.join(RAW_DATA_DIR, f"{symbol}.json")
    
    if not os.path.exists(filepath):
        return jsonify({"error": "Data not found"}), 404
        
    try:
        with open(filepath, 'r') as file:
            data = json.load(file)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/profile', methods=['GET'])
@require_auth  # Keep require_auth for user profile, no premium required
def get_user_profile():
    """Get user profile data"""
    # This endpoint requires auth
    if not g.user_id:
        return jsonify({"error": "Unauthorized"}), 401
        
    return jsonify({
        "uid": g.user_id,
        "email": g.auth_info.get('email', ''),
        "name": g.auth_info.get('name', ''),
        "isAuthenticated": True,
        "isPremium": g.auth_info.get('assinaturaAtiva', False) or g.auth_info.get('role') == 'admin'
    })

@app.route('/api/strategy/<strategy_name>/performance', methods=['GET'])
@require_premium  # Added premium requirement for strategy performance
def get_strategy_detail_performance(strategy_name):
    """Get detailed performance metrics for a specific strategy"""
    # ... keep existing code (strategy performance implementation)
    days = request.args.get('days', default=30, type=int)
    date_threshold = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get strategy performance from the strategy_performance table
    cursor.execute('''
        SELECT * FROM strategy_performance
        WHERE strategy_name = ?
    ''', [strategy_name])
    
    performance = cursor.fetchone()
    
    # Get signals for this strategy
    query = '''
        SELECT * FROM signals
        WHERE strategy_name = ? AND timestamp > ?
    '''
    params = [strategy_name, date_threshold]
    
    # Add user filter if authenticated
    if g.user_id:
        query += " AND (user_id IS NULL OR user_id = ?)"
        params.append(g.user_id)
    
    cursor.execute(query, params)
    signals = cursor.fetchall()
    
    # Calculate additional metrics based on signals
    daily_performance = {}
    symbols_performance = {}
    
    for signal in signals:
        # Daily performance
        date = signal['timestamp'].split('T')[0]
        if date not in daily_performance:
            daily_performance[date] = {'wins': 0, 'losses': 0, 'total': 0}
        
        daily_performance[date]['total'] += 1
        if signal['result'] == 1:
            daily_performance[date]['wins'] += 1
        elif signal['result'] == 0:
            daily_performance[date]['losses'] += 1
            
        # Symbol performance
        symbol = signal['symbol']
        if symbol not in symbols_performance:
            symbols_performance[symbol] = {'wins': 0, 'losses': 0, 'total': 0}
            
        symbols_performance[symbol]['total'] += 1
        if signal['result'] == 1:
            symbols_performance[symbol]['wins'] += 1
        elif signal['result'] == 0:
            symbols_performance[symbol]['losses'] += 1
    
    # Convert to lists for the response
    daily_data = [
        {'date': date, **stats} 
        for date, stats in daily_performance.items()
    ]
    
    symbols_data = [
        {
            'symbol': symbol, 
            'count': stats['total'], 
            'wins': stats['wins'], 
            'losses': stats['losses'],
            'winRate': round((stats['wins'] / stats['total'] * 100), 2) if stats['total'] > 0 else 0
        } 
        for symbol, stats in symbols_performance.items()
    ]
    
    # Sort data
    daily_data.sort(key=lambda x: x['date'])
    symbols_data.sort(key=lambda x: x['count'], reverse=True)
    
    conn.close()
    
    # Prepare the response
    response = {
        "strategy": strategy_name,
        "totalSignals": len(signals),
        "performance": performance,
        "dailyData": daily_data,
        "symbolsData": symbols_data
    }
    
    return jsonify(response)

def save_signal_to_db(symbol, strategy_name, signal, result, position_size, entry_price, leverage=None, user_id=None, sharpe_ratio=None, max_drawdown=None):
    """Salva um sinal no banco de dados com nome da estratégia e ID do usuário."""
    # ... keep existing code (save_signal_to_db implementation)
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        timestamp = datetime.utcnow().isoformat()
        
        # Verificar e criar a coluna user_id se não existir
        cursor.execute("PRAGMA table_info(signals)")
        columns = [column[1] for column in cursor.fetchall()]
        if "user_id" not in columns:
            cursor.execute("ALTER TABLE signals ADD COLUMN user_id TEXT")
            
        # Verificar e criar colunas de performance se não existirem
        if "sharpe_ratio" not in columns:
            cursor.execute("ALTER TABLE signals ADD COLUMN sharpe_ratio REAL")
        if "max_drawdown" not in columns:
            cursor.execute("ALTER TABLE signals ADD COLUMN max_drawdown REAL")
        
        # Verificar e criar a coluna leverage se não existir
        if "leverage" not in columns:
            cursor.execute("ALTER TABLE signals ADD COLUMN leverage INTEGER")
        
        # Usa INSERT OR IGNORE com UNIQUE constraint para evitar duplicatas
        cursor.execute('''
            INSERT OR IGNORE INTO signals 
            (symbol, signal_type, signal, result, position_size, entry_price, timestamp, strategy_name, user_id, sharpe_ratio, max_drawdown, leverage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (symbol, "BUY" if signal == 1 else "SELL", signal, result, position_size, entry_price, timestamp, strategy_name, user_id, sharpe_ratio, max_drawdown, leverage))
        
        # Atualiza tabela de performance da estratégia
        update_strategy_performance(cursor, strategy_name, result, sharpe_ratio, max_drawdown)
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Erro ao salvar sinal no banco: {str(e)}")
        return False

def update_strategy_performance(cursor, strategy_name, result, sharpe_ratio=None, max_drawdown=None):
    """Atualiza estatísticas de performance de uma estratégia com métricas avançadas."""
    # ... keep existing code (update_strategy_performance implementation)
    try:
        # Verifica se a estratégia já existe na tabela
        cursor.execute('SELECT * FROM strategy_performance WHERE strategy_name = ?', (strategy_name,))
        exists = cursor.fetchone()
        
        if exists:
            # Atualiza estatísticas existentes
            if result == 1:  # Sinal vencedor
                cursor.execute('''
                    UPDATE strategy_performance SET 
                    total_signals = total_signals + 1,
                    winning_signals = winning_signals + 1,
                    last_updated = ?
                    WHERE strategy_name = ?
                ''', (datetime.utcnow().isoformat(), strategy_name))
            elif result == 0:  # Sinal perdedor
                cursor.execute('''
                    UPDATE strategy_performance SET 
                    total_signals = total_signals + 1,
                    losing_signals = losing_signals + 1,
                    last_updated = ?
                    WHERE strategy_name = ?
                ''', (datetime.utcnow().isoformat(), strategy_name))
        else:
            # Insere nova estratégia
            winning = 1 if result == 1 else 0
            losing = 1 if result == 0 else 0
            cursor.execute('''
                INSERT INTO strategy_performance 
                (strategy_name, total_signals, winning_signals, losing_signals, last_updated)
                VALUES (?, 1, ?, ?, ?)
            ''', (strategy_name, winning, losing, datetime.utcnow().isoformat()))
        
        # Atualiza a taxa de vitória e lucro médio
        cursor.execute('''
            UPDATE strategy_performance SET
            win_rate = CASE WHEN total_signals > 0 THEN (winning_signals * 100.0 / total_signals) ELSE 0 END
            WHERE strategy_name = ?
        ''', (strategy_name,))
        
        # Atualiza Sharpe Ratio e Max Drawdown se fornecidos
        if sharpe_ratio is not None:
            cursor.execute('''
                UPDATE strategy_performance SET
                sharpe_ratio = ?
                WHERE strategy_name = ?
            ''', (sharpe_ratio, strategy_name))
            
        if max_drawdown is not None:
            cursor.execute('''
                UPDATE strategy_performance SET
                max_drawdown = ?
                WHERE strategy_name = ?
            ''', (max_drawdown, strategy_name))
        
    except Exception as e:
        print(f"Erro ao atualizar performance da estratégia {strategy_name}: {str(e)}")

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
