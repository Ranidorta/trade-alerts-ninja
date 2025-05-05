
from flask import Blueprint, jsonify
from sqlalchemy.orm import Session
from datetime import timedelta
from services.evaluate_signals_pg import Signal, get_candles, evaluate_signal
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
from flask import current_app, g

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
    end = start + timedelta(hours=24)
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
