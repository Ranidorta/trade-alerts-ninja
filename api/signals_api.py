
"""
API module for signal-related endpoints.

This module provides a Flask Blueprint with routes for retrieving
historical trading signals data stored in the database.
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from services.evaluate_signals_pg import Signal, Session
import logging

# Set up logger
logger = logging.getLogger("signals_api")

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
        
        logger.info(f"Retrieved {len(signals)} signals from database")
        
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
                'result': signal.resultado,
                'status': "COMPLETED" if signal.resultado else "ACTIVE",
                'entryPrice': float(signal.entry) if signal.entry is not None else None,
                'createdAt': signal.timestamp.isoformat() if signal.timestamp else None,
                'type': "LONG" if signal.direction and signal.direction.upper() == "BUY" else "SHORT",
                'pair': signal.symbol, # Alias for frontend compatibility
                'strategy': "CLASSIC"  # Default strategy if not available
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
        
        # Return empty array instead of error if no signals found
        if not signals:
            logger.info(f"No signals found in database with filters: symbol={symbol}, result={result}")
            return jsonify([])
            
        logger.info(f"Found {len(signals)} signals in database")
        return jsonify(signals)
    except Exception as e:
        logger.error(f"Error processing signals: {str(e)}")
        return jsonify({"error": f"Erro ao processar sinais: {str(e)}"}), 500

# Add a new endpoint to save signals to history from the Signals tab
@signals_api.route("/api/signals/save", methods=["POST"])
def save_signal_to_history():
    """
    Save a signal to the history database.
    
    Expects a JSON object with signal details.
    
    Returns:
        JSON response indicating success or failure
    """
    try:
        signal_data = request.json
        
        if not signal_data:
            return jsonify({"error": "Dados do sinal não fornecidos"}), 400
            
        # Convert signal data to database model
        session = Session()
        
        # Check if signal already exists (by ID or similar timestamp+symbol)
        existing = None
        if 'id' in signal_data:
            existing = session.query(Signal).filter_by(id=signal_data['id']).first()
        
        if not existing and 'symbol' in signal_data and 'timestamp' in signal_data:
            # Look for similar signal in last 5 minutes
            timestamp = datetime.fromisoformat(signal_data['timestamp'].replace('Z', '+00:00'))
            start_time = timestamp - timedelta(minutes=5)
            end_time = timestamp + timedelta(minutes=5)
            
            existing = session.query(Signal).filter(
                Signal.symbol == signal_data['symbol'],
                Signal.timestamp.between(start_time, end_time)
            ).first()
        
        if existing:
            # Update existing signal
            if 'direction' in signal_data:
                existing.direction = signal_data['direction']
            if 'entry' in signal_data or 'entryPrice' in signal_data:
                existing.entry = signal_data.get('entry') or signal_data.get('entryPrice')
            if 'tp1' in signal_data or 'targets' in signal_data and len(signal_data['targets']) > 0:
                existing.tp1 = signal_data.get('tp1') or signal_data['targets'][0]['price']
            if 'tp2' in signal_data or 'targets' in signal_data and len(signal_data['targets']) > 1:
                existing.tp2 = signal_data.get('tp2') or signal_data['targets'][1]['price']
            if 'tp3' in signal_data or 'targets' in signal_data and len(signal_data['targets']) > 2:
                existing.tp3 = signal_data.get('tp3') or signal_data['targets'][2]['price']
            if 'stop_loss' in signal_data or 'sl' in signal_data or 'stopLoss' in signal_data:
                existing.stop_loss = signal_data.get('stop_loss') or signal_data.get('sl') or signal_data.get('stopLoss')
            if 'result' in signal_data or 'resultado' in signal_data:
                existing.resultado = signal_data.get('result') or signal_data.get('resultado')
                
            session.commit()
            logger.info(f"Updated existing signal {existing.id} in database")
            return jsonify({"message": "Sinal atualizado com sucesso", "id": existing.id})
        else:
            # Create new signal
            new_signal = Signal(
                symbol=signal_data.get('symbol') or signal_data.get('pair', ''),
                timestamp=datetime.fromisoformat(signal_data.get('timestamp', signal_data.get('createdAt', datetime.now().isoformat())).replace('Z', '+00:00')),
                direction=signal_data.get('direction', signal_data.get('type', 'BUY')),
                entry=signal_data.get('entry') or signal_data.get('entryPrice'),
                tp1=signal_data.get('tp1') or (signal_data['targets'][0]['price'] if 'targets' in signal_data and len(signal_data['targets']) > 0 else None),
                tp2=signal_data.get('tp2') or (signal_data['targets'][1]['price'] if 'targets' in signal_data and len(signal_data['targets']) > 1 else None),
                tp3=signal_data.get('tp3') or (signal_data['targets'][2]['price'] if 'targets' in signal_data and len(signal_data['targets']) > 2 else None),
                stop_loss=signal_data.get('stop_loss') or signal_data.get('sl') or signal_data.get('stopLoss'),
                resultado=signal_data.get('result') or signal_data.get('resultado')
            )
            
            session.add(new_signal)
            session.commit()
            signal_id = new_signal.id
            logger.info(f"Added new signal {signal_id} to database")
            return jsonify({"message": "Sinal salvo com sucesso", "id": signal_id})
    except Exception as e:
        logger.error(f"Error saving signal: {str(e)}")
        return jsonify({"error": f"Erro ao salvar sinal: {str(e)}"}), 500
    finally:
        session.close()
