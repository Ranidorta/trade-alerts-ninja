
"""
Metrics utility for generating trading performance reports.

This module provides a convenient way to run the metrics report
generation functionality from the save_signal module.
"""

from utils.save_signal import generate_metrics_report

if __name__ == "__main__":
    # Generate and display trading metrics report
    print("Generating trading performance metrics report...")
    report_data = generate_metrics_report()
    
    if report_data:
        win_rate, total_trades = report_data
        print(f"\nSummary: {win_rate:.2%} win rate across {total_trades} trades")
    
    print("\nReport generation complete.")
