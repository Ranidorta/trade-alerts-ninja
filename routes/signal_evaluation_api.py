
"""
API module for signal evaluation.

This module provides endpoints for evaluating trading signals based on 
price data and the defined rules for winner, partial, loser, and false signals.
"""

from flask import Blueprint, jsonify, request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from services.evaluate_signals_pg import Signal, get_candles, evaluate_signal
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Set up logger
logger = logging.getLogger("signal_evaluation_api")

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///signals.db")
engine = create_engine(DATABASE_URL)

bp = Blueprint('signal_evaluation_api', __name__)

@bp.route("/api/signals/evaluate/<int:signal_id>", methods=["GET"])
def evaluate_single_signal(signal_id):
    """
    Evaluate a single trading signal based on the defined rules.
    
    Rules:
    - WINNER: Price reached TP3 (or the last target) before hitting the Stop Loss
    - PARTIAL: Price hit TP1 or TP2, but not TP3, then hit the SL
    - LOSER: Price went directly to the SL without hitting any TP
    - FALSE: Signal didn't hit any TP or the SL within the time frame
    
    Args:
        signal_id (int): ID of the signal to evaluate
        
    Returns:
        JSON response with evaluation result
    """
    session = Session(bind=engine)
    try:
        signal = session.query(Signal).filter(Signal.id == signal_id).first()

        if not signal:
            return jsonify({"error": "Sinal não encontrado"}), 404

        # If signal already has a result, return it
        if signal.resultado:
            result = signal.resultado
            return jsonify({
                "id": signal_id, 
                "symbol": signal.symbol,
                "resultado": result
            })

        # Define timeframe for evaluation (default: last 24 hours)
        start = signal.timestamp
        # Use a shorter timeframe for evaluation
        end = start + timedelta(hours=2)  # Adjusted to 2 hours for faster evaluation
        start_ms = int(start.timestamp() * 1000)
        end_ms = int(end.timestamp() * 1000)
        
        # Get price data for the signal period
        candles = get_candles(signal.symbol, start_ms, end_ms)
        
        if not candles or len(candles) < 2:
            return jsonify({"error": "Dados de preço não disponíveis"}), 400

        # Evaluate signal based on the defined rules
        resultado = evaluate_signal(
            entry=signal.entry,
            tp1=signal.tp1,
            tp2=signal.tp2,
            tp3=signal.tp3,
            sl=signal.stop_loss,
            direction=signal.direction,
            candles=candles
        )

        # Update signal with result
        signal.resultado = resultado
        session.commit()
        
        logger.info(f"Signal {signal_id} evaluated as {resultado}")
        
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
    except Exception as e:
        logger.error(f"Error evaluating signal {signal_id}: {str(e)}")
        return jsonify({"error": f"Erro ao avaliar sinal: {str(e)}"}), 500
    finally:
        session.close()

@bp.route("/api/signals/evaluate/all", methods=["POST"])
def evaluate_all_signals():
    """
    Evaluate all signals that don't have results yet.
    
    Returns:
        JSON response with evaluation results
    """
    session = Session(bind=engine)
    try:
        # Get all signals without results
        signals = session.query(Signal).filter(Signal.resultado == None).all()
        
        if not signals:
            return jsonify({"message": "Nenhum sinal para avaliar"}), 200
            
        results = []
        for signal in signals[:10]:  # Limit to 10 signals to avoid long processing
            try:
                # Define timeframe for evaluation
                start = signal.timestamp
                end = start + timedelta(hours=2)
                start_ms = int(start.timestamp() * 1000)
                end_ms = int(end.timestamp() * 1000)
                
                # Get price data
                candles = get_candles(signal.symbol, start_ms, end_ms)
                
                if not candles or len(candles) < 2:
                    continue
                    
                # Evaluate signal
                resultado = evaluate_signal(
                    entry=signal.entry,
                    tp1=signal.tp1,
                    tp2=signal.tp2,
                    tp3=signal.tp3,
                    sl=signal.stop_loss,
                    direction=signal.direction,
                    candles=candles
                )
                
                # Update signal with result
                signal.resultado = resultado
                results.append({
                    "id": signal.id,
                    "symbol": signal.symbol,
                    "resultado": resultado
                })
            except Exception as e:
                logger.error(f"Error evaluating signal {signal.id}: {str(e)}")
                
        session.commit()
        
        return jsonify({
            "evaluated": len(results),
            "results": results
        })
    except Exception as e:
        session.rollback()
        logger.error(f"Error evaluating signals: {str(e)}")
        return jsonify({"error": f"Erro ao avaliar sinais: {str(e)}"}), 500
    finally:
        session.close()
