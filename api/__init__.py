
"""API package initialization."""

from flask import Flask
from api.signals_api import signals_api
from api.hybrid_signals_api import hybrid_signals_api

def register_blueprints(app: Flask):
    """
    Register all API blueprints with the Flask application.
    
    Args:
        app: The Flask application instance
    """
    app.register_blueprint(signals_api)
    app.register_blueprint(hybrid_signals_api)
    
    # Register other blueprints here as needed
    
    return app
