
#!/usr/bin/env python3
"""
Script to check the status of signal evaluation.
"""

import os
import sqlite3
from datetime import datetime
from utils.signal_storage import get_all_signals

def check_evaluator_status():
    """
    Check the current status of signal evaluation.
    """
    print("📊 Signal Evaluator Status Check")
    print("=" * 40)
    
    # Check if database exists
    db_path = "signals.db"
    if not os.path.exists(db_path):
        print("❌ Database not found (signals.db)")
        print("💡 Make sure to run the signal generator first")
        return
    
    try:
        # Get all signals
        signals = get_all_signals(limit=1000)
        
        if not signals:
            print("📭 No signals found in database")
            return
        
        # Count by status
        total = len(signals)
        winner = len([s for s in signals if s.get("result") == "WINNER"])
        loser = len([s for s in signals if s.get("result") == "LOSER"])
        partial = len([s for s in signals if s.get("result") == "PARTIAL"])
        false = len([s for s in signals if s.get("result") == "FALSE"])
        pending = len([s for s in signals if not s.get("result")])
        
        # Display stats
        print(f"📈 Total Signals: {total}")
        print(f"✅ Evaluated: {total - pending}")
        print(f"⏳ Pending: {pending}")
        print("")
        print("Results Breakdown:")
        print(f"  🏆 WINNER: {winner}")
        print(f"  💔 LOSER: {loser}")
        print(f"  ⚠️  PARTIAL: {partial}")
        print(f"  ❌ FALSE: {false}")
        
        if pending > 0:
            print("")
            print(f"🔄 {pending} signals need evaluation")
            print("💡 Run 'python run_evaluator.py' to evaluate them")
        else:
            print("")
            print("✨ All signals have been evaluated!")
        
        # Show recent signals
        print("")
        print("Recent Signals:")
        recent_signals = signals[:5]
        for signal in recent_signals:
            status = signal.get("result", "PENDING")
            print(f"  {signal['symbol']} - {signal['signal']} - {status}")
            
    except Exception as e:
        print(f"❌ Error checking status: {str(e)}")

if __name__ == "__main__":
    check_evaluator_status()
