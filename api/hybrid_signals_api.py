
"""
API module for hybrid signals-related endpoints.

This module provides a Flask Blueprint with routes for retrieving
hybrid trading signals data stored in CSV format.
"""

from flask import Blueprint, jsonify
import pandas as pd
from pathlib import Path

hybrid_signals_api = Blueprint('hybrid_signals_api', __name__)

@hybrid_signals_api.route("/api/signals/history/hybrid", methods=["GET"])
def get_hybrid_signals():
    """
    Retrieve hybrid trading signals from CSV storage.
    
    Returns a JSON array of hybrid signal records, sorted by timestamp in descending order.
    
    Returns:
        JSON response with array of signal records or error message
    """
    file = Path("data/historical_signals_hybrid.csv")
    if not file.exists():
        return jsonify({"error": "No hybrid signals found."}), 404

    try:
        df = pd.read_csv(file)
            
        # Sort by timestamp descending
        df = df.sort_values(by='timestamp', ascending=False)
        
        # Convert to dict records
        records = df.to_dict(orient="records")
        return jsonify(records)
    except Exception as e:
        return jsonify({"error": f"Error processing hybrid signals: {str(e)}"}), 500
