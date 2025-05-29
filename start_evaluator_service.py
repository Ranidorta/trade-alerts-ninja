
#!/usr/bin/env python3
"""
Script to start the signal evaluator service automatically.
This script ensures the evaluator runs continuously in the background.
"""

import subprocess
import sys
import time
import os
from signal_evaluator import run_evaluator_service

def start_service():
    """
    Start the signal evaluator service.
    """
    print("🚀 Starting Signal Evaluator Service...")
    print("=" * 50)
    print("This service will:")
    print("- Evaluate all pending signals every 10 minutes")
    print("- Use real Bybit candle data for validation")
    print("- Update results in SQLite database (signals.db)")
    print("- Assign WINNER, LOSER, PARTIAL, or FALSE status")
    print("=" * 50)
    
    try:
        # Run the evaluator service with 10-minute intervals
        run_evaluator_service(interval_minutes=10)
    except KeyboardInterrupt:
        print("\n⏹️  Signal evaluator service stopped by user")
    except Exception as e:
        print(f"❌ Error running signal evaluator service: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    start_service()
