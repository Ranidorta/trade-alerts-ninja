
"""
API module initialization.
"""

from flask import Flask
from api.signals_api import signals_api
from api.evaluation_api import evaluation_api

def create_app():
    """
    Create and configure the Flask application.
    """
    app = Flask(__name__)
    
    # Register blueprints
    app.register_blueprint(signals_api)
    app.register_blueprint(evaluation_api)
    
    return app
