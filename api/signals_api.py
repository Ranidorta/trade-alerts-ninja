
"""
API module for signal-related endpoints.

This module provides a Flask Blueprint with routes for retrieving
historical trading signals data stored in CSV format.
"""

from flask import Blueprint, jsonify, request
import pandas as pd
from pathlib import Path

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
