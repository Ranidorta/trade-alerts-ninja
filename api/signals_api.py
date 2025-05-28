
"""
API module for signal-related endpoints.

This module provides a Flask Blueprint with routes for retrieving
historical trading signals data stored in CSV format.
"""

from flask import Blueprint, jsonify, request
import pandas as pd
from pathlib import Path
import json
import datetime
from signals.signal_generator import generate_signal
from utils.risk_manager import manage_risk
from signals.validator import validate_signal
from utils.signal_storage import get_all_signals, insert_signal

signals_api = Blueprint('signals_api', __name__)

@signals_api.route("/api/signals/history", methods=["GET"])
def get_signals_history():
    """
    Retrieve historical trading signals from CSV storage.
    
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
    
    file = Path("data/historical_signals.csv")
    if not file.exists():
        return jsonify({"error": "Nenhum sinal encontrado."}), 404

    try:
        df = pd.read_csv(file)
        
        # Apply filters if provided
        if symbol:
            df = df[df['asset'].str.contains(symbol, case=False)]
        if result:
            df = df[df['result'] == result]
            
        # Sort by timestamp descending
        df = df.sort_values(by='timestamp', ascending=False)
        
        # Convert to dict records
        records = df.to_dict(orient="records")
        return jsonify(records)
    except Exception as e:
        return jsonify({"error": f"Erro ao processar sinais: {str(e)}"}), 500

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
