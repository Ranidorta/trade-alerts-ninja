
"""
API module for signal-related endpoints.

This module provides a Flask Blueprint with routes for retrieving
historical trading signals data stored in the database.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from services.evaluate_signals_pg import Signal, Session

signals_api = Blueprint('signals_api', __name__)

def get_all_signals_db(symbol=None, result=None):
    """
    Retrieve signals from the database with optional filtering.
    
    Args:
        symbol (str, optional): Filter signals by symbol
        result (str, optional): Filter signals by result
        
    Returns:
        list: List of signals as dictionaries
    """
    session = Session()
    try:
        # Start with a base query
        query = session.query(Signal)
        
        # Apply filters if provided
        if symbol:
            query = query.filter(Signal.symbol.ilike(f"%{symbol}%"))
            
        if result:
            query = query.filter(Signal.resultado == result)
            
        # Order by timestamp descending
        query = query.order_by(Signal.timestamp.desc())
        
        # Execute query and get results
        signals = query.all()
        
        # Convert SQLAlchemy objects to dictionaries
        result_signals = []
        for signal in signals:
            result_signals.append({
                'id': signal.id,
                'symbol': signal.symbol,
                'timestamp': signal.timestamp.isoformat() if signal.timestamp else None,
                'direction': signal.direction.upper() if signal.direction else None,
                'entry': float(signal.entry) if signal.entry is not None else None,
                'tp1': float(signal.tp1) if signal.tp1 is not None else None,
                'tp2': float(signal.tp2) if signal.tp2 is not None else None,
                'tp3': float(signal.tp3) if signal.tp3 is not None else None,
                'stop_loss': float(signal.stop_loss) if signal.stop_loss is not None else None,
                'sl': float(signal.stop_loss) if signal.stop_loss is not None else None,  # Alias for frontend compatibility
                'result': signal.resultado
            })
            
        return result_signals
    finally:
        session.close()

@signals_api.route("/api/signals/history", methods=["GET"])
def get_signals_history():
    """
    Retrieve historical trading signals from the database.
    
    Returns a JSON array of signal records, sorted by timestamp in descending order.
    Supports optional filtering by symbol (asset) and result.
    
    Query Parameters:
        symbol (str, optional): Filter by specific trading symbol/asset
        result (str, optional): Filter by result type (e.g., win, loss, partial, missed)
        
    Returns:
        JSON response with array of signal records or error message
    """
    # Parse query parameters for filtering
    symbol = request.args.get('symbol')
    result = request.args.get('result')
    
    try:
        # Get signals from database
        signals = get_all_signals_db(symbol, result)
        
        # If no signals found, return 404
        if not signals:
            return jsonify({"error": "Nenhum sinal encontrado."}), 404
            
        return jsonify(signals)
    except Exception as e:
        return jsonify({"error": f"Erro ao processar sinais: {str(e)}"}), 500
