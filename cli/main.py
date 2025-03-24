
"""
Command Line Interface for Trade Alerts Ninja.

This module provides an interactive CLI for running trade strategies,
optimizing parameters, and managing the trading system.
"""

import typer
import pandas as pd
import yaml
import os
import sys
from datetime import datetime
from typing import List, Optional
from enum import Enum

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import project modules
from strategies import get_strategy, get_strategy_function
from indicators.optimized import apply_optimized_indicators, parallel_backtest
from backtesting.performance import generate_performance_report

app = typer.Typer(help="Trade Alerts Ninja CLI")

class TimeFrame(str, Enum):
    MINUTE_1 = "1"
    MINUTE_5 = "5"
    MINUTE_15 = "15"
    MINUTE_30 = "30"
    HOUR_1 = "60"
    HOUR_4 = "240"
    DAY_1 = "D"

@app.command()
def run_strategy(
    strategy_name: str = typer.Argument(..., help="Strategy name to run"),
    symbol: str = typer.Option("BTCUSDT", help="Trading pair"),
    timeframe: TimeFrame = typer.Option(TimeFrame.HOUR_1, help="Chart timeframe"),
    limit: int = typer.Option(100, help="Number of candles to fetch")
):
    """Run a specific trading strategy on a symbol."""
    from api.bybit import get_candles
    
    typer.echo(f"Running {strategy_name} on {symbol} ({timeframe})")
    
    # Fetch data
    df = get_candles(symbol, interval=timeframe, limit=limit)
    
    if df.empty:
        typer.echo("Error: No data received from API")
        raise typer.Exit(1)
    
    # Get strategy function
    try:
        strategy_fn = get_strategy_function(strategy_name)
    except ValueError as e:
        typer.echo(f"Error: {str(e)}")
        typer.echo(f"Available strategies: {', '.join(get_available_strategies())}")
        raise typer.Exit(1)
    
    # Apply indicators
    df = apply_optimized_indicators(df)
    
    # Apply strategy
    df['signal'] = df.apply(strategy_fn, axis=1)
    
    # Show results
    signals = df[df['signal'] != 0].copy()
    
    if signals.empty:
        typer.echo("No signals generated in the selected period")
    else:
        typer.echo(f"Generated {len(signals)} signals:")
        for idx, row in signals.iterrows():
            signal_type = "BUY" if row['signal'] == 1 else "SELL"
            typer.echo(f"{idx}: {signal_type} @ {row['close']}")
    
    # Performance metrics if there are any signals
    if not signals.empty:
        from backtesting.performance import calculate_returns
        returns = calculate_returns(df)
        total_return = (1 + returns.dropna()).prod() - 1
        typer.echo(f"Total return: {total_return:.2%}")

@app.command()
def backtest(
    strategy_name: str = typer.Argument(..., help="Strategy to backtest"),
    symbols: List[str] = typer.Option(["BTCUSDT"], help="Trading pairs"),
    timeframe: TimeFrame = typer.Option(TimeFrame.HOUR_1, help="Chart timeframe"),
    days: int = typer.Option(30, help="Days to backtest"),
    report: bool = typer.Option(False, help="Generate detailed report")
):
    """Backtest a strategy across multiple symbols."""
    import api.bybit as api
    
    typer.echo(f"Backtesting {strategy_name} on {', '.join(symbols)} ({timeframe})")
    
    # Get data for all symbols
    symbol_data = {}
    with typer.progressbar(symbols, label="Fetching data") as progress:
        for symbol in progress:
            df = api.get_candles(symbol, interval=timeframe, limit=days*24)
            if not df.empty:
                symbol_data[symbol] = df
    
    if not symbol_data:
        typer.echo("Error: No data received for any symbols")
        raise typer.Exit(1)
    
    # Get strategy function
    try:
        strategy_fn = get_strategy_function(strategy_name)
    except ValueError as e:
        typer.echo(f"Error: {str(e)}")
        raise typer.Exit(1)
    
    # Apply strategy to each symbol
    results = {}
    for symbol, df in symbol_data.items():
        # Apply indicators
        df = apply_optimized_indicators(df)
        
        # Apply strategy
        df['signal'] = df.apply(strategy_fn, axis=1)
        
        # Calculate returns
        from backtesting.performance import calculate_returns
        df['return'] = calculate_returns(df)
        
        results[symbol] = df
    
    # Display summary results
    typer.echo("\nResults Summary:")
    for symbol, df in results.items():
        signals = df[df['signal'] != 0]
        returns = df['return'].dropna()
        total_return = (1 + returns).prod() - 1
        
        typer.echo(f"{symbol}: {len(signals)} signals, Return: {total_return:.2%}")
    
    # Generate detailed report if requested
    if report:
        _generate_backtest_report(results, strategy_name)

def _generate_backtest_report(results, strategy_name):
    """Generate and save a detailed backtest report."""
    from backtesting.performance import generate_performance_report
    import json
    
    # Create reports directory if it doesn't exist
    os.makedirs("reports", exist_ok=True)
    
    # Generate report for each symbol
    report_data = {}
    for symbol, df in results.items():
        report = generate_performance_report(df)
        report_data[symbol] = report
    
    # Save report as JSON
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"reports/{strategy_name}_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(report_data, f, indent=2, default=str)
    
    typer.echo(f"\nDetailed report saved to {filename}")

def get_available_strategies():
    """Get list of available strategy names."""
    from strategies import STRATEGY_FUNCTIONS
    return list(STRATEGY_FUNCTIONS.keys())

@app.command()
def optimize(
    strategy_name: str = typer.Argument(..., help="Strategy to optimize"),
    symbol: str = typer.Option("BTCUSDT", help="Trading pair"),
    timeframe: TimeFrame = typer.Option(TimeFrame.HOUR_1, help="Chart timeframe"),
    config_file: str = typer.Option("config/optimization.yml", help="Optimization config file")
):
    """Optimize strategy parameters using grid search."""
    import itertools
    from api.bybit import get_candles
    
    # Load configuration
    if not os.path.exists(config_file):
        typer.echo(f"Error: Config file {config_file} not found")
        raise typer.Exit(1)
    
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)
    
    if 'strategies' not in config or strategy_name not in config['strategies']:
        typer.echo(f"Error: Strategy {strategy_name} not found in config file")
        raise typer.Exit(1)
    
    # Get strategy parameters
    strategy_config = config['strategies'][strategy_name]
    params = strategy_config.get('params', {})
    
    # Get data
    typer.echo(f"Fetching data for {symbol} ({timeframe})")
    df = get_candles(symbol, interval=timeframe, limit=200)
    
    if df.empty:
        typer.echo("Error: No data received from API")
        raise typer.Exit(1)
    
    # Apply indicators
    df = apply_optimized_indicators(df)
    
    # Generate parameter combinations
    param_combinations = []
    param_names = []
    param_values = []
    
    for param_name, param_range in params.items():
        param_names.append(param_name)
        if len(param_range) == 3:  # min, max, step
            min_val, max_val, step = param_range
            values = list(range(min_val, max_val + 1, step))
        else:  # explicit list of values
            values = param_range
        param_values.append(values)
    
    # Get all combinations
    all_combinations = list(itertools.product(*param_values))
    typer.echo(f"Testing {len(all_combinations)} parameter combinations")
    
    # Get strategy
    try:
        strategy_class = get_strategy(strategy_name)
    except ValueError as e:
        typer.echo(f"Error: {str(e)}")
        raise typer.Exit(1)
    
    # Test each combination
    results = []
    with typer.progressbar(all_combinations, label="Optimizing") as progress:
        for combination in progress:
            # Create parameter dict
            params = {param_names[i]: combination[i] for i in range(len(param_names))}
            
            # Initialize strategy with parameters
            strategy = strategy_class(params)
            
            # Apply strategy
            result_df = strategy.generate_signals(df.copy())
            
            # Calculate performance
            from backtesting.performance import calculate_returns, calculate_sharpe_ratio
            returns = calculate_returns(result_df)
            total_return = (1 + returns.dropna()).prod() - 1
            sharpe = calculate_sharpe_ratio(returns.dropna())
            
            # Store results
            results.append({
                'params': params,
                'return': total_return,
                'sharpe': sharpe,
                'num_signals': len(result_df[result_df['signal'] != 0])
            })
    
    # Sort by sharpe ratio
    results.sort(key=lambda x: x['sharpe'], reverse=True)
    
    # Display top results
    typer.echo("\nTop 5 parameter combinations:")
    for i, result in enumerate(results[:5]):
        param_str = ", ".join(f"{k}={v}" for k, v in result['params'].items())
        typer.echo(f"{i+1}. {param_str}")
        typer.echo(f"   Return: {result['return']:.2%}, Sharpe: {result['sharpe']:.2f}, Signals: {result['num_signals']}")

@app.command()
def list_strategies():
    """List all available trading strategies."""
    strategies = get_available_strategies()
    
    typer.echo("Available strategies:")
    for strategy in strategies:
        typer.echo(f"- {strategy}")

if __name__ == "__main__":
    app()
