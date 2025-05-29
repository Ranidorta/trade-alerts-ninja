
import sqlite3
import json
import os
import pandas as pd
from datetime import datetime

# Load configuration
config_path = os.path.join(os.path.dirname(__file__), '../config.json')
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    config = {"db_path": "signals.db"}

db_path = config.get("db_path", "signals.db")

def upgrade_db():
    """
    Upgrade database schema to include all required fields for the new signals format.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(signals);")
    columns = [c[1] for c in cursor.fetchall()]
    
    # Add missing columns for the new signal format
    new_columns = [
        ('result', 'TEXT DEFAULT NULL'),
        ('sl', 'REAL'),
        ('tp1', 'REAL'),
        ('tp2', 'REAL'),
        ('tp3', 'REAL'),
        ('leverage', 'INTEGER'),
        ('size', 'REAL DEFAULT 0'),
        ('rsi', 'REAL'),
        ('atr', 'REAL'),
        ('strategy_name', 'TEXT'),
        ('price', 'REAL'),
        ('signal', 'TEXT')
    ]
    
    for column_name, column_type in new_columns:
        if column_name not in columns:
            cursor.execute(f"ALTER TABLE signals ADD COLUMN {column_name} {column_type};")
            print(f"Added column {column_name} to signals table")
    
    conn.commit()
    conn.close()

def init_db():
    """
    Initialize the SQLite database with the necessary tables and structure.
    """
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create signals table with all required columns
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            symbol TEXT,
            signal TEXT,
            price REAL,
            sl REAL,
            tp1 REAL,
            tp2 REAL,
            tp3 REAL,
            size REAL DEFAULT 0,
            rsi REAL,
            atr REAL,
            leverage INTEGER,
            result TEXT,
            strategy_name TEXT
        )
    """)
    
    # Create index for better query performance
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_signals_timestamp 
        ON signals(timestamp DESC)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_signals_symbol 
        ON signals(symbol)
    """)
    
    conn.commit()
    conn.close()
    
    # Run upgrade to ensure all columns exist
    upgrade_db()

def insert_signal(signal):
    """
    Insert a signal into the database.
    
    Args:
        signal: Dictionary containing signal data
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO signals (timestamp, symbol, signal, price, sl, tp1, tp2, tp3, size, rsi, atr, leverage, result)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        signal["time"],
        signal["symbol"],
        signal["signal"],
        signal["entry_price"],
        signal["sl"],
        signal["tp1"],
        signal["tp2"],
        signal["tp3"],
        signal.get("size", 0),
        signal.get("rsi", 0),
        signal.get("atr", 0),
        signal.get("leverage", 1),
        signal.get("result", None)
    ))
    conn.commit()
    conn.close()

def update_signal_result(signal_id, result):
    """
    Update the result field for a specific signal.
    
    Args:
        signal_id: ID of the signal to update
        result: Signal result (WINNER, LOSER, PARTIAL, FALSE)
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE signals SET result = ? WHERE id = ?", (result, signal_id))
    conn.commit()
    conn.close()

def get_last_signal(symbol):
    """
    Get the last signal for a specific symbol.
    
    Args:
        symbol: Trading pair symbol
        
    Returns:
        Dictionary with the last signal or None
    """
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, timestamp, symbol, signal, price, result FROM signals
            WHERE symbol = ? ORDER BY id DESC LIMIT 1
        """, (symbol,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "time": row[1],
                "symbol": row[2],
                "signal": row[3],
                "price": row[4],
                "result": row[5]
            }
        return None
    except Exception as e:
        print(f"Error retrieving last signal: {str(e)}")
        return None

def get_all_signals(limit=100):
    """
    Get all signals from the database.
    
    Args:
        limit: Maximum number of signals to retrieve
        
    Returns:
        List of signal dictionaries
    """
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM signals
            ORDER BY id DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        signals = []
        for row in rows:
            signal = {key: row[key] for key in row.keys()}
            signals.append(signal)
            
        return signals
    except Exception as e:
        print(f"Error retrieving signals: {str(e)}")
        return []

def get_pending_signals():
    """
    Get all signals that don't have a result yet.
    
    Returns:
        List of pending signal dictionaries
    """
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM signals
            WHERE result IS NULL
            ORDER BY id DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        
        signals = []
        for row in rows:
            signal = {key: row[key] for key in row.keys()}
            signals.append(signal)
            
        return signals
    except Exception as e:
        print(f"Error retrieving pending signals: {str(e)}")
        return []

def export_to_csv(filename="signals_export.csv"):
    """
    Export all signals to a CSV file.
    
    Args:
        filename: Output CSV filename
    """
    try:
        conn = sqlite3.connect(db_path)
        df = pd.read_sql_query("SELECT * FROM signals ORDER BY id DESC", conn)
        conn.close()
        
        df.to_csv(filename, index=False)
        return filename
    except Exception as e:
        print(f"Error exporting to CSV: {str(e)}")
        return None

# Initialize database when module is loaded
init_db()
