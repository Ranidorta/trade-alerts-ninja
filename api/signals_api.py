
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
