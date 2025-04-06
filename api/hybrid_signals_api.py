
"""
API module for hybrid signals-related endpoints.

This module provides a Flask Blueprint with routes for retrieving
hybrid trading signals data stored in CSV format.
"""

from flask import Blueprint, jsonify
import pandas as pd
from pathlib import Path
import os

hybrid_signals_api = Blueprint('hybrid_signals_api', __name__)

@hybrid_signals_api.route("/api/signals/history/hybrid", methods=["GET"])
def get_hybrid_signals():
    """
    Retrieve hybrid trading signals from CSV storage.
    
    Returns a JSON array of hybrid signal records, sorted by timestamp in descending order.
    
    Returns:
        JSON response with array of signal records or error message
    """
    # Check absolute paths for debugging
    current_dir = os.path.abspath(os.path.dirname(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, '..'))
    file_path = os.path.join(project_root, "data", "historical_signals_hybrid.csv")
    
    file = Path(file_path)
    print(f"Looking for hybrid signals file at: {file} (exists: {file.exists()})")
    
    # Fallback to relative path if absolute path doesn't work
    if not file.exists():
        file = Path("data/historical_signals_hybrid.csv")
        print(f"Trying relative path: {file} (exists: {file.exists()})")
    
    if not file.exists():
        print(f"Hybrid signals file not found at any location")
        return jsonify({"message": "Nenhum sinal híbrido encontrado"}), 404

    try:
        print(f"Reading hybrid signals from: {file}")
        df = pd.read_csv(file)
        print(f"Found {len(df)} hybrid signals")
            
        # Sort by timestamp descending
        df = df.sort_values(by='timestamp', ascending=False)
        
        # Convert to dict records
        records = df.to_dict(orient="records")
        print(f"Returning {len(records)} hybrid signals")
        return jsonify(records)
    except Exception as e:
        print(f"Error processing hybrid signals: {str(e)}")
        return jsonify({"error": f"Error processing hybrid signals: {str(e)}"}), 500
