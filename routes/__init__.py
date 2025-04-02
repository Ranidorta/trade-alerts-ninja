
"""
Routes package for the Flask API.
Contains blueprints for different API endpoints.
"""

from routes.signal_evaluation_api import bp as signal_evaluation_bp

__all__ = ['signal_evaluation_bp']
