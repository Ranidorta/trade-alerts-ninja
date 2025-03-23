
"""
Configuration for pytest tests.

This module provides fixtures and configuration for all test modules.
"""

import pytest
import os
import tempfile
import pandas as pd
import numpy as np
import sqlite3

@pytest.fixture(scope="session")
def app_config():
    """Create test configuration."""
    # Create temporary files for testing
    db_fd, db_path = tempfile.mkstemp()
    model_fd, model_path = tempfile.mkstemp()
    history_fd, history_path = tempfile.mkstemp()
    
    # Override paths in the module
    from trading_agent_api import DB_PATH, MODEL_PATH, CAPITAL_HISTORY_PATH
    
    # Save original values to restore later
    original_db_path = DB_PATH
    original_model_path = MODEL_PATH
    original_history_path = CAPITAL_HISTORY_PATH
    
    # Update with test paths
    globals()['DB_PATH'] = db_path
    globals()['MODEL_PATH'] = model_path
    globals()['CAPITAL_HISTORY_PATH'] = history_path
    
    yield {
        "db_path": db_path,
        "model_path": model_path,
        "history_path": history_path
    }
    
    # Restore original values
    globals()['DB_PATH'] = original_db_path
    globals()['MODEL_PATH'] = original_model_path
    globals()['CAPITAL_HISTORY_PATH'] = original_history_path
    
    # Clean up temporary files
    os.close(db_fd)
    os.unlink(db_path)
    os.close(model_fd)
    os.unlink(model_path)
    os.close(history_fd)
    os.unlink(history_path)

@pytest.fixture
def test_db(app_config):
    """Create a test database with sample data."""
    db_path = app_config["db_path"]
    
    # Create database and sample data
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            symbol TEXT,
            signal INTEGER,
            result INTEGER,
            entry_price REAL,
            exit_price REAL,
            atr REAL,
            position_size REAL,
            profit_loss REAL
        )
    ''')
    
    # Insert some sample data
    for i in range(10):
        c.execute('''
            INSERT INTO signals 
            (timestamp, symbol, signal, result, entry_price, exit_price, atr, position_size, profit_loss)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            f"2023-01-{i+1:02d} 12:00:00",
            "BTCUSDT",
            1 if i % 2 == 0 else -1,
            1 if i % 3 == 0 else 0,
            10000 + i * 100,
            10100 + i * 100 if i % 3 == 0 else 9900 + i * 100,
            100,
            1.0,
            100 if i % 3 == 0 else -100
        ))
    
    conn.commit()
    conn.close()
    
    return db_path
