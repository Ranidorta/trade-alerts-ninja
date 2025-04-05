
"""
Utility for testing different ATR multiplier levels in stop-loss calculations.

This module tests how different ATR multipliers affect trading strategy performance
by running walk-forward optimization with various risk management parameters.
"""

import pandas as pd
from utils.risk_management import calculate_stop_loss
from backtesting.optimizer import walk_forward_optimization


def test_atr_multipliers(df, multipliers=[1.5, 2, 2.5]):
    """
    Test different ATR multipliers for stop-loss calculation and evaluate performance.
    
    Args:
        df: DataFrame with OHLCV data
        multipliers: List of ATR multipliers to test (default: [1.5, 2, 2.5])
        
    Returns:
        List of dictionaries with performance metrics for each multiplier
    """
    results = []

    for multiplier in multipliers:
        print(f"Testing ATR multiplier: {multiplier}")
        df_sl = calculate_stop_loss(df.copy(), atr_multiplier=multiplier)
        try:
            stats = walk_forward_optimization(df_sl)
            results.append({
                "multiplier": multiplier,
                "sharpe": stats['Sharpe Ratio'],
                "return": stats['Total Return [%]']
            })
            print(f"  - Sharpe Ratio: {stats['Sharpe Ratio']:.4f}")
            print(f"  - Total Return: {stats['Total Return [%]']:.2f}%")
        except Exception as e:
            print(f"  - Error: {str(e)}")
            results.append({
                "multiplier": multiplier,
                "error": str(e)
            })

    # Create a summary of results
    if results:
        print("\nSummary of ATR Multiplier Tests:")
        for result in results:
            if "error" in result:
                print(f"  ATR x{result['multiplier']}: Error - {result['error']}")
            else:
                print(f"  ATR x{result['multiplier']}: Sharpe = {result['sharpe']:.4f}, Return = {result['return']:.2f}%")
    
    return results


def find_optimal_atr_multiplier(df, start=1.0, end=3.0, step=0.5):
    """
    Find the optimal ATR multiplier within a range.
    
    Args:
        df: DataFrame with OHLCV data
        start: Starting ATR multiplier value (default: 1.0)
        end: Ending ATR multiplier value (default: 3.0)
        step: Step size between multiplier values (default: 0.5)
        
    Returns:
        Dictionary with optimal multiplier and its performance metrics
    """
    multipliers = [round(start + i * step, 2) for i in range(int((end - start) / step) + 1)]
    print(f"Testing {len(multipliers)} ATR multipliers from {start} to {end}...")
    
    results = test_atr_multipliers(df, multipliers)
    
    # Filter out results with errors
    valid_results = [r for r in results if "error" not in r]
    
    if not valid_results:
        return {"error": "No valid results found"}
    
    # Find the multiplier with the highest Sharpe ratio
    best_result = max(valid_results, key=lambda x: x["sharpe"])
    
    print(f"\nOptimal ATR Multiplier: {best_result['multiplier']}")
    print(f"  - Sharpe Ratio: {best_result['sharpe']:.4f}")
    print(f"  - Total Return: {best_result['return']:.2f}%")
    
    return best_result
