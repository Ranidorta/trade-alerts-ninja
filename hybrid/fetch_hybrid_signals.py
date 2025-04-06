
"""
Module for fetching hybrid signals from the historical database
and converting them to the TradingSignal format for the frontend.
"""

import pandas as pd
from pathlib import Path
import json
import os
from datetime import datetime
import uuid

def fetch_hybrid_signals():
    """
    Fetch hybrid signals from the CSV file and convert them to
    the TradingSignal format used by the frontend.
    
    Returns:
        List of TradingSignal objects
    """
    try:
        file_path = Path("data/historical_signals_hybrid.csv")
        
        if not file_path.exists():
            print("No hybrid signals file found")
            return []
            
        # Read the CSV file
        df = pd.read_csv(file_path)
        
        if df.empty:
            return []
            
        # Convert to TradingSignal format
        signals = []
        
        for _, row in df.iterrows():
            # Create targets for each take profit level
            targets = []
            
            # Handle both old and new format
            if 'tp1' in row and not pd.isna(row['tp1']):
                targets.append({"level": 1, "price": row['tp1'], "hit": False})
            if 'tp2' in row and not pd.isna(row['tp2']):
                targets.append({"level": 2, "price": row['tp2'], "hit": False})
            if 'tp3' in row and not pd.isna(row['tp3']):
                targets.append({"level": 3, "price": row['tp3'], "hit": False})
                
            # If we have old format with just 'tp'
            if 'tp' in row and not pd.isna(row['tp']) and len(targets) == 0:
                targets = [
                    {"level": 1, "price": row['tp'], "hit": False}
                ]
            
            # Parse indicators if available
            technical_indicators = {}
            if 'indicators' in row and not pd.isna(row['indicators']):
                try:
                    indicators = json.loads(row['indicators'].replace("'", "\""))
                    # Flatten 15m indicators
                    if '15m' in indicators:
                        technical_indicators = {
                            'rsi': indicators['15m'].get('rsi'),
                            'macd': indicators['15m'].get('macd'),
                            'macdSignal': indicators['15m'].get('macd_signal'),
                            'shortMa': indicators['1h'].get('sma200'),
                            'longMa': indicators['4h'].get('sma200')
                        }
                except:
                    # If parsing fails, keep empty
                    pass
            
            # Map result values to the proper format
            result = None
            if 'result' in row and not pd.isna(row['result']):
                if row['result'] == 'win':
                    result = "WINNER"
                elif row['result'] == 'loss':
                    result = "LOSER"
                elif row['result'] == 'partial':
                    result = "PARTIAL"
                elif row['result'] == 'missed':
                    result = "FALSE"
                else:
                    result = row['result']
            
            # Create signal object
            signal = {
                "id": str(uuid.uuid4()) if 'id' not in row else row['id'],
                "symbol": row['asset'],
                "direction": row['direction'],
                "entryPrice": row['entry_price'],
                "stopLoss": row['sl'],
                "targets": targets,
                "status": "ACTIVE" if pd.isna(row['result']) else "COMPLETED",
                "createdAt": row['timestamp'],
                "updatedAt": datetime.utcnow().isoformat(),
                "type": "LONG" if row['direction'] == 'BUY' else "SHORT",
                "technicalIndicators": technical_indicators,
                "strategy": "HYBRID",
                "confidence": 1.0,
                "timeframe": "hybrid",
                "result": result
            }
            
            signals.append(signal)
        
        return signals
        
    except Exception as e:
        print(f"Error fetching hybrid signals: {e}")
        return []

if __name__ == "__main__":
    signals = fetch_hybrid_signals()
    print(f"Found {len(signals)} hybrid signals")
    for signal in signals:
        print(f"{signal['symbol']} {signal['direction']} @ {signal['entryPrice']} ({signal['createdAt']})")
