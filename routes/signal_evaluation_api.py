
from flask import Blueprint, jsonify, request
from sqlalchemy.orm import Session
from datetime import timedelta
from services.evaluate_signals_pg import Signal, get_candles, evaluate_signal
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import logging

# Configure logging
logger = logging.getLogger("signal_evaluation_api")

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///signals.db")
engine = create_engine(DATABASE_URL)

bp = Blueprint('signal_evaluation_api', __name__)

@bp.route("/api/signals/evaluate/<int:signal_id>", methods=["GET"])
def evaluate_single_signal(signal_id):
    # Use the premium check from the main app
    # This will be protected by the main app's middleware
    session = Session(bind=engine)
    signal = session.query(Signal).filter(Signal.id == signal_id).first()

    if not signal:
        session.close()
        return jsonify({"error": "Sinal não encontrado"}), 404

    if signal.resultado:
        result = signal.resultado
        session.close()
        return jsonify({"id": signal_id, "symbol": signal.symbol, "resultado": result})

    start = signal.timestamp
    end = start + timedelta(hours=24)  # Look for 24 hours of data after signal
    start_ms = int(start.timestamp() * 1000)
    end_ms = int(end.timestamp() * 1000)
    
    candles = get_candles(signal.symbol, start_ms, end_ms)
    if not candles:
        session.close()
        return jsonify({"error": "Candles não disponíveis"}), 400

    resultado = evaluate_signal(
        entry=signal.entry,
        tp1=signal.tp1,
        tp2=signal.tp2,
        tp3=signal.tp3,
        sl=signal.stop_loss,
        direction=signal.direction,
        candles=candles
    )

    # Update the signal in the database
    signal.resultado = resultado
    session.commit()
    session.close()

    return jsonify({
        "id": signal_id, 
        "symbol": signal.symbol,
        "direction": signal.direction,
        "resultado": resultado,
        "entry": signal.entry,
        "tp1": signal.tp1,
        "tp2": signal.tp2,
        "tp3": signal.tp3,
        "stop_loss": signal.stop_loss
    })

@bp.route("/api/signals/evaluate", methods=["POST"])
def evaluate_signal_from_data():
    """
    Evaluate a signal based on provided data without storing in database
    """
    data = request.json
    
    if not data:
        return jsonify({"error": "Dados não fornecidos"}), 400
    
    required_fields = ["symbol", "timestamp", "direction", "entry", "tp1", "tp2", "tp3", "stop_loss"]
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        return jsonify({"error": f"Campos obrigatórios ausentes: {', '.join(missing_fields)}"}), 400
    
    # Convert timestamp to datetime
    try:
        from datetime import datetime
        timestamp = datetime.fromisoformat(data["timestamp"].replace('Z', '+00:00'))
        start = timestamp
        end = start + timedelta(hours=24)  # Look for 24 hours of data after signal
        start_ms = int(start.timestamp() * 1000)
        end_ms = int(end.timestamp() * 1000)
    except Exception as e:
        return jsonify({"error": f"Formato de timestamp inválido: {str(e)}"}), 400
    
    # Get candles data
    candles = get_candles(data["symbol"], start_ms, end_ms)
    if not candles:
        return jsonify({"error": "Candles não disponíveis"}), 400
    
    # Evaluate the signal
    resultado = evaluate_signal(
        entry=data["entry"],
        tp1=data["tp1"],
        tp2=data["tp2"],
        tp3=data["tp3"],
        sl=data["stop_loss"],
        direction=data["direction"],
        candles=candles
    )
    
    return jsonify({
        "symbol": data["symbol"],
        "direction": data["direction"],
        "resultado": resultado,
        "entry": data["entry"],
        "tp1": data["tp1"],
        "tp2": data["tp2"],
        "tp3": data["tp3"],
        "stop_loss": data["stop_loss"]
    })
