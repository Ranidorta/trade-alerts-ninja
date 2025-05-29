
"""
API endpoints for signal evaluation.
"""

from flask import Blueprint, jsonify, request
from signal_evaluator import evaluate_all_signals, evaluate_signal
from utils.signal_storage import get_all_signals

evaluation_api = Blueprint('evaluation_api', __name__)

@evaluation_api.route("/api/signals/evaluate", methods=["POST"])
def trigger_evaluation():
    """
    Trigger signal evaluation for all pending signals.
    """
    try:
        evaluate_all_signals()
        return jsonify({
            "success": True,
            "message": "Signal evaluation completed"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@evaluation_api.route("/api/signals/evaluate/<int:signal_id>", methods=["POST"])
def evaluate_single_signal_endpoint(signal_id):
    """
    Evaluate a specific signal by ID.
    """
    try:
        signals = get_all_signals()
        signal = next((s for s in signals if s.get("id") == signal_id), None)
        
        if not signal:
            return jsonify({
                "success": False,
                "error": "Signal not found"
            }), 404
            
        evaluate_signal(signal)
        
        return jsonify({
            "success": True,
            "message": f"Signal {signal_id} evaluated"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@evaluation_api.route("/api/signals/evaluation/status", methods=["GET"])
def get_evaluation_status():
    """
    Get evaluation status for all signals.
    """
    try:
        signals = get_all_signals()
        
        total_signals = len(signals)
        evaluated_signals = len([s for s in signals if s.get("result")])
        pending_signals = total_signals - evaluated_signals
        
        # Count by result type
        results = {}
        for signal in signals:
            result = signal.get("result", "PENDING")
            results[result] = results.get(result, 0) + 1
            
        return jsonify({
            "total_signals": total_signals,
            "evaluated_signals": evaluated_signals,
            "pending_signals": pending_signals,
            "results_breakdown": results
        })
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
