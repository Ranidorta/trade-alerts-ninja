
#!/usr/bin/env python3
"""
Script to run the signal evaluator.

Usage:
    python run_evaluator.py          # Run evaluation once
    python run_evaluator.py service  # Run as continuous service
    python run_evaluator.py service 5  # Run service every 5 minutes
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from signal_evaluator import evaluate_all_signals, run_evaluator_service

def main():
    if len(sys.argv) == 1:
        print("Running signal evaluation once...")
        evaluate_all_signals()
        print("Evaluation completed!")
        
    elif sys.argv[1] == "service":
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        print(f"Starting signal evaluator service (every {interval} minutes)")
        print("Press Ctrl+C to stop...")
        run_evaluator_service(interval)
        
    elif sys.argv[1] == "once":
        print("Running signal evaluation once...")
        evaluate_all_signals()
        print("Evaluation completed!")
        
    else:
        print("Usage:")
        print("  python run_evaluator.py          # Run once")
        print("  python run_evaluator.py service  # Run as service")
        print("  python run_evaluator.py service 5  # Run every 5 minutes")

if __name__ == "__main__":
    main()
