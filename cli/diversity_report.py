
"""
Command-line tool for generating signal diversity reports.

This module provides a command-line interface for analyzing signal diversity
and generating reports on strategy overlap, timing patterns, and confidence metrics.
"""

import typer
import pandas as pd
import sqlite3
import os
import sys
from datetime import datetime, timedelta
from typing import Optional

# Add parent directory to Python path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analytics.diversity import DiversityAnalyzer

app = typer.Typer(help="Signal Diversity Analysis Tools")

@app.command()
def generate_report(
    days: int = typer.Option(7, help="Number of days to analyze"),
    output: str = typer.Option(None, help="Output file path"),
    db_path: str = typer.Option("signals.db", help="Path to SQLite database"),
    format: str = typer.Option("json", help="Output format (json or html)")
):
    """Generate a diversity report for signals over the specified time period."""
    
    if not os.path.exists(db_path):
        typer.echo(f"Error: Database file {db_path} not found")
        raise typer.Exit(code=1)
    
    typer.echo(f"Analyzing signals from the last {days} days...")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Query signals
        query = """
        SELECT * FROM signals 
        WHERE timestamp BETWEEN ? AND ?
        """
        
        df = pd.read_sql_query(
            query, 
            conn, 
            params=(start_date.isoformat(), end_date.isoformat()),
            parse_dates=['timestamp']
        )
        
        if df.empty:
            typer.echo("No signals found in the specified time period.")
            raise typer.Exit(code=0)
            
        typer.echo(f"Analyzing {len(df)} signals across {df['strategy_name'].nunique()} strategies...")
        
        # Generate report
        analyzer = DiversityAnalyzer()
        
        # Rename columns to match analyzer expectations
        if 'strategy_name' in df.columns and 'strategy' not in df.columns:
            df = df.rename(columns={'strategy_name': 'strategy'})
            
        # Generate output filename if not specified
        if not output:
            date_str = datetime.now().strftime("%Y%m%d")
            reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'reports')
            if not os.path.exists(reports_dir):
                os.makedirs(reports_dir)
            output = os.path.join(reports_dir, f"diversity_report_{date_str}.{format}")
        
        # Generate and save report
        report_path = analyzer.generate_report_to_file(df, output)
        
        typer.echo(f"Diversity report saved to {report_path}")
        
    except Exception as e:
        typer.echo(f"Error generating report: {str(e)}")
        raise typer.Exit(code=1)

@app.command()
def analyze_overlap(
    strategy1: str = typer.Argument(..., help="First strategy name"),
    strategy2: str = typer.Argument(..., help="Second strategy name"),
    days: int = typer.Option(30, help="Number of days to analyze"),
    db_path: str = typer.Option("signals.db", help="Path to SQLite database")
):
    """Analyze overlap between two specific strategies."""
    
    if not os.path.exists(db_path):
        typer.echo(f"Error: Database file {db_path} not found")
        raise typer.Exit(code=1)
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Query signals for both strategies
        query = """
        SELECT * FROM signals 
        WHERE strategy_name IN (?, ?) 
        AND timestamp BETWEEN ? AND ?
        """
        
        df = pd.read_sql_query(
            query, 
            conn, 
            params=(strategy1, strategy2, start_date.isoformat(), end_date.isoformat()),
            parse_dates=['timestamp']
        )
        
        if df.empty:
            typer.echo("No signals found for these strategies in the specified time period.")
            raise typer.Exit(code=0)
            
        # Rename columns to match analyzer expectations
        if 'strategy_name' in df.columns and 'strategy' not in df.columns:
            df = df.rename(columns={'strategy_name': 'strategy'})
            
        # Generate overlap analysis
        analyzer = DiversityAnalyzer()
        overlap_matrix = analyzer.calculate_overlap(df)
        
        if strategy1 in overlap_matrix.index and strategy2 in overlap_matrix.columns:
            overlap_pct = overlap_matrix.loc[strategy1, strategy2] * 100
            typer.echo(f"Overlap between {strategy1} and {strategy2}: {overlap_pct:.1f}%")
            
            if overlap_pct > 60:
                typer.echo("WARNING: Overlap exceeds recommended maximum of 60%")
        else:
            typer.echo("Could not calculate overlap. Check strategy names.")
            
    except Exception as e:
        typer.echo(f"Error analyzing overlap: {str(e)}")
        raise typer.Exit(code=1)

if __name__ == "__main__":
    app()
