"""
API module for signal-related endpoints.

This module provides a Flask Blueprint with routes for retrieving
historical trading signals data from SQLite database.
"""

from flask import Blueprint, jsonify, request
import sqlite3
from pathlib import Path
import json
import datetime
from signals.signal_generator import generate_signal
from utils.risk_manager import manage_risk
from signals.validator import validate_signal
from utils.signal_storage import get_all_signals, insert_signal

signals_api = Blueprint('signals_api', __name__)

# Database configuration
DB_PATH = "signals.db"

def dict_factory(cursor, row):
    """Convert SQLite row to dictionary"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@signals_api.route("/api/signals/history", methods=["GET"])
def get_signals_history():
    """
    Retrieve historical trading signals from SQLite database.
    
    Returns a JSON array of signal records, sorted by timestamp in descending order.
    Supports optional filtering by symbol (asset) and result.
    
    Query Parameters:
        symbol (str, optional): Filter by specific trading symbol/asset
        result (str, optional): Filter by result type (e.g., WINNER, LOSER)
        
    Returns:
        JSON response with array of signal records or error message
    """
    # Parse query parameters for filtering
    symbol = request.args.get('symbol')
    result = request.args.get('result')
    
    # Check if database exists
    if not Path(DB_PATH).exists():
        return jsonify([]), 200  # Return empty array instead of error

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = dict_factory
        cursor = conn.cursor()
        
        # Build query with optional filters
        query = """
            SELECT 
                id, timestamp, symbol, signal, price, sl, tp1, tp2, tp3, 
                size, leverage, rsi, atr, result, strategy_name as strategy
            FROM signals
            WHERE 1=1
        """
        params = []
        
        # Apply filters if provided
        if symbol:
            query += " AND symbol LIKE ?"
            params.append(f"%{symbol}%")
        if result:
            query += " AND result = ?"
            params.append(result)
            
        # Sort by timestamp descending and limit results
        query += " ORDER BY timestamp DESC LIMIT 500"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        # Convert to frontend-compatible format (matching TradingSignal interface)
        signals = []
        for row in rows:
            signal = {
                "id": str(row["id"]),
                "symbol": row["symbol"],
                "direction": row["signal"].upper() if row["signal"] else "BUY",
                "entryPrice": float(row["price"]) if row["price"] else 0,
                "stopLoss": float(row["sl"]) if row["sl"] else 0,
                "tp1": float(row["tp1"]) if row["tp1"] else None,
                "tp2": float(row["tp2"]) if row["tp2"] else None,
                "tp3": float(row["tp3"]) if row["tp3"] else None,
                "leverage": int(row["leverage"]) if row["leverage"] else 1,
                "status": "COMPLETED" if row["result"] else "ACTIVE",
                "createdAt": row["timestamp"],
                "result": row["result"],  # Backend evaluated result
                "rsi": float(row["rsi"]) if row["rsi"] else None,
                "atr": float(row["atr"]) if row["atr"] else None,
                "size": float(row["size"]) if row["size"] else 0,
                "strategy": row["strategy"]
            }
            signals.append(signal)
        
        return jsonify(signals)
        
    except Exception as e:
        print(f"Error in get_signals_history: {str(e)}")
        return jsonify([]), 200  # Return empty array on error

@signals_api.route("/api/signals/generate", methods=["POST"])
def generate_new_signal():
    """
    Generate a new trading signal for the specified symbol.
    
    Request Body:
        symbol (str): Trading pair symbol (e.g., "BTCUSDT")
        
    Returns:
        JSON response with the generated signal or error message
    """
    data = request.json
    
    if not data or 'symbol' not in data:
        return jsonify({"error": "Symbol is required"}), 400
        
    symbol = data['symbol']
    
    try:
        # Generate signal
        raw_signal = generate_signal(symbol)
        
        # Validate signal
        valid_signal = validate_signal(raw_signal)
        
        if not valid_signal:
            return jsonify({"error": "No valid signal could be generated"}), 404
            
        # Apply risk management
        final_signal = manage_risk(valid_signal)
        
        # Store signal
        insert_signal(final_signal)
        
        return jsonify(final_signal)
    except Exception as e:
        return jsonify({"error": f"Error generating signal: {str(e)}"}), 500

@signals_api.route("/api/signals", methods=["GET"])
def get_all_stored_signals():
    """
    Retrieve all stored signals from the database.
    
    Query Parameters:
        limit (int, optional): Maximum number of signals to retrieve (default: 100)
        
    Returns:
        JSON response with array of signal records
    """
    try:
        limit = int(request.args.get('limit', 100))
        signals = get_all_signals(limit)
        
        # Convert signals to format expected by frontend
        formatted_signals = []
        for s in signals:
            formatted_signals.append({
                "id": f"{s['symbol']}_{s['timestamp']}",
                "symbol": s['symbol'],
                "direction": s['signal'].upper(),
                "entryPrice": s['price'],
                "stopLoss": s['sl'],
                "tp1": s['tp1'],
                "tp2": s['tp2'],
                "tp3": s['tp3'],
                "leverage": s['leverage'],
                "status": "ACTIVE" if not s['result'] else "COMPLETED",
                "createdAt": s['timestamp'],
                "rsi": s['rsi'],
                "atr": s['atr'],
                "size": s['size'],
                "result": s['result']
            })
        
        return jsonify(formatted_signals)
    except Exception as e:
        return jsonify({"error": f"Error retrieving signals: {str(e)}"}), 500

@signals_api.route("/api/signals/performance", methods=["GET"])
def get_performance():
    """
    Get performance statistics for all signals.
    
    Returns:
        JSON response with performance metrics
    """
    try:
        signals = get_all_signals(1000)  # Get more signals for better statistics
        
        # Initialize stats
        stats = {
            "WINNER": 0,
            "LOSER": 0,
            "PARTIAL": 0,
            "FALSE": 0,
            "PENDING": 0,
            "TOTAL": 0
        }
        
        # Count results
        for signal in signals:
            result = signal.get("result")
            if result in stats:
                stats[result] += 1
            elif result is None:
                stats["PENDING"] += 1
            stats["TOTAL"] += 1
        
        # Calculate metrics
        completed_trades = stats["WINNER"] + stats["LOSER"] + stats["PARTIAL"]
        
        stats["accuracy"] = round(100 * stats["WINNER"] / completed_trades, 2) if completed_trades > 0 else 0
        stats["win_rate"] = round(100 * (stats["WINNER"] + stats["PARTIAL"]) / completed_trades, 2) if completed_trades > 0 else 0
        stats["completion_rate"] = round(100 * completed_trades / stats["TOTAL"], 2) if stats["TOTAL"] > 0 else 0
        
        # Additional metrics
        stats["total_completed"] = completed_trades
        stats["total_profitable"] = stats["WINNER"] + stats["PARTIAL"]
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": f"Error calculating performance: {str(e)}"}), 500

@signals_api.route("/api/signals/performance/detailed", methods=["GET"])
def get_detailed_performance():
    """
    Get detailed performance statistics broken down by symbol and time period.
    
    Query Parameters:
        days (int, optional): Number of days to include (default: 30)
        
    Returns:
        JSON response with detailed performance metrics
    """
    try:
        days = int(request.args.get('days', 30))
        signals = get_all_signals(1000)
        
        # Filter by date if specified
        if days > 0:
            cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
            signals = [s for s in signals if datetime.datetime.fromisoformat(s['timestamp'].replace('Z', '+00:00')) >= cutoff_date]
        
        # Performance by symbol
        symbol_stats = {}
        for signal in signals:
            symbol = signal['symbol']
            if symbol not in symbol_stats:
                symbol_stats[symbol] = {"WINNER": 0, "LOSER": 0, "PARTIAL": 0, "FALSE": 0, "PENDING": 0, "TOTAL": 0}
            
            result = signal.get("result")
            if result in symbol_stats[symbol]:
                symbol_stats[symbol][result] += 1
            elif result is None:
                symbol_stats[symbol]["PENDING"] += 1
            symbol_stats[symbol]["TOTAL"] += 1
        
        # Calculate win rates for each symbol
        for symbol in symbol_stats:
            stats = symbol_stats[symbol]
            completed = stats["WINNER"] + stats["LOSER"] + stats["PARTIAL"]
            stats["win_rate"] = round(100 * (stats["WINNER"] + stats["PARTIAL"]) / completed, 2) if completed > 0 else 0
        
        return jsonify({
            "period_days": days,
            "total_signals": len(signals),
            "by_symbol": symbol_stats
        })
    except Exception as e:
        return jsonify({"error": f"Error calculating detailed performance: {str(e)}"}), 500
