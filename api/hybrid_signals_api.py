
"""
API endpoint for hybrid trading signals.
Retrieves signals from historical_signals_hybrid.csv and returns as JSON.
"""

from flask import Blueprint, jsonify
import pandas as pd
from pathlib import Path

hybrid_signals_api = Blueprint('hybrid_signals_api', __name__)

@hybrid_signals_api.route("/api/signals/history/hybrid", methods=["GET"])
def get_hybrid_signals():
    """
    Endpoint to retrieve hybrid trading signals from CSV file.
    Returns signals in JSON format, ordered by timestamp (most recent first).
    Returns 404 if no signals file exists.
    """
    file = Path("data/historical_signals_hybrid.csv")
    if not file.exists():
        return jsonify({"error": "Nenhum sinal híbrido encontrado."}), 404

    df = pd.read_csv(file)
    df = df.sort_values(by='timestamp', ascending=False)
    records = df.to_dict(orient="records")
    return jsonify(records)
