
"""
Command-line tool for generating price synchronization reports.

This module provides a CLI for analyzing price discrepancies and latency metrics,
helping to monitor the accuracy of signal generation and execution.
"""

import typer
import os
import sys
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional

# Add parent directory to Python path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from monitoring.price_diff import PriceMonitor

app = typer.Typer(help="Price Synchronization Analysis Tools")

@app.command()
def generate_report(
    days: int = typer.Option(1, help="Number of days to analyze"),
    output: str = typer.Option(None, help="Output file path"),
    history_file: str = typer.Option("price_monitor_history.csv", help="Path to price history file")
):
    """Generate a price accuracy report for the specified time period."""
    
    if not os.path.exists(history_file):
        typer.echo(f"Error: History file {history_file} not found")
        raise typer.Exit(code=1)
    
    typer.echo(f"Analyzing price accuracy from the last {days} days...")
    
    try:
        # Create monitor and generate report
        monitor = PriceMonitor(history_file=history_file)
        report = monitor.generate_report(days=days)
        
        if "status" in report and "No data" in report["status"]:
            typer.echo(report["status"])
            raise typer.Exit(code=0)
            
        # Generate output filename if not specified
        if not output:
            date_str = datetime.now().strftime("%Y%m%d")
            output = f"price_accuracy_report_{date_str}.json"
        
        # Save report
        report_path = monitor.save_report(report, output)
        
        # Display summary
        typer.echo("\nPrice Accuracy Report Summary:")
        typer.echo(f"Total executions analyzed: {report['total_executions']}")
        typer.echo(f"Mean price delta: {report['mean_delta']:.4f} USD")
        if report['within_spread_pct'] is not None:
            typer.echo(f"Executions within spread: {report['within_spread_pct']:.1f}%")
        if report['avg_latency_ms'] is not None:
            typer.echo(f"Average latency: {report['avg_latency_ms']:.2f} ms")
        
        typer.echo(f"\nFull report saved to {report_path}")
        
    except Exception as e:
        typer.echo(f"Error generating report: {str(e)}")
        raise typer.Exit(code=1)

@app.command()
def analyze_latency(
    symbol: str = typer.Option("BTCUSDT", help="Symbol to analyze"),
    history_file: str = typer.Option("price_monitor_history.csv", help="Path to price history file")
):
    """Analyze latency patterns for a specific symbol."""
    
    if not os.path.exists(history_file):
        typer.echo(f"Error: History file {history_file} not found")
        raise typer.Exit(code=1)
    
    try:
        # Load history
        history = pd.read_csv(history_file)
        
        # Filter for the symbol
        symbol_data = history[history['symbol'] == symbol]
        
        if symbol_data.empty:
            typer.echo(f"No data found for symbol {symbol}")
            raise typer.Exit(code=0)
            
        # Calculate metrics
        latency_data = symbol_data.dropna(subset=['latency_ms'])
        
        if latency_data.empty:
            typer.echo(f"No latency data available for {symbol}")
            raise typer.Exit(code=0)
            
        avg_latency = latency_data['latency_ms'].mean()
        max_latency = latency_data['latency_ms'].max()
        p95_latency = latency_data['latency_ms'].quantile(0.95)
        
        # Display analysis
        typer.echo(f"\nLatency Analysis for {symbol}:")
        typer.echo(f"Records analyzed: {len(latency_data)}")
        typer.echo(f"Average latency: {avg_latency:.2f} ms")
        typer.echo(f"Max latency: {max_latency:.2f} ms")
        typer.echo(f"95th percentile: {p95_latency:.2f} ms")
        
        # Count records exceeding threshold
        threshold = 500  # 500ms
        over_threshold = (latency_data['latency_ms'] > threshold).sum()
        over_pct = (over_threshold / len(latency_data)) * 100
        
        typer.echo(f"Records exceeding {threshold}ms: {over_threshold} ({over_pct:.1f}%)")
        
    except Exception as e:
        typer.echo(f"Error analyzing latency: {str(e)}")
        raise typer.Exit(code=1)

if __name__ == "__main__":
    app()

