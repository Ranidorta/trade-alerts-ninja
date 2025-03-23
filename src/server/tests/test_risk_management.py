
"""
Tests for Risk Management Functions

This module contains tests for the trading agent's risk management functions.
"""

import pytest
from trading_agent_api import calculate_position_size, simulate_trade

def test_position_size_calculation():
    """Test position size calculation."""
    # Test normal calculation
    assert calculate_position_size(10000, 1.0, 0.02) == 200.0, "Position size should be 2% of capital divided by ATR"
    
    # Test with zero ATR
    assert calculate_position_size(10000, 0, 0.02) == 0, "Position size should be zero when ATR is zero"
    
    # Test with different risk percentage
    assert calculate_position_size(10000, 1.0, 0.01) == 100.0, "Position size should adjust with risk percentage"
    
    # Test with different capital
    assert calculate_position_size(20000, 1.0, 0.02) == 400.0, "Position size should scale with capital"

def test_simulate_trade():
    """Test trade simulation."""
    # Mock the strategy for testing
    class MockStrategy:
        RISK_REWARD_RATIO = 1.5
    
    # Save original function to restore later
    from trading_agent_api import strategy_manager
    original_get_active_strategy = strategy_manager.get_active_strategy
    
    # Mock the strategy manager
    strategy_manager.get_active_strategy = lambda: MockStrategy()
    
    try:
        # Test long winning trade
        result, exit_price = simulate_trade(1, 100, 101.5, 1.0)
        assert result == 1, "Long trade that hits take profit should win"
        assert exit_price == 101.5, "Exit price should be the future price"
        
        # Test long losing trade
        result, exit_price = simulate_trade(1, 100, 99, 1.0)
        assert result == 0, "Long trade that hits stop loss should lose"
        assert exit_price == 99, "Exit price should be the stop loss price"
        
        # Test short winning trade
        result, exit_price = simulate_trade(-1, 100, 98.5, 1.0)
        assert result == 1, "Short trade that hits take profit should win"
        assert exit_price == 98.5, "Exit price should be the future price"
        
        # Test short losing trade
        result, exit_price = simulate_trade(-1, 100, 101, 1.0)
        assert result == 0, "Short trade that hits stop loss should lose"
        assert exit_price == 101, "Exit price should be the stop loss price"
        
        # Test no trade result
        result, exit_price = simulate_trade(0, 100, 100.5, 1.0)
        assert result is None, "No trade signal should return None result"
        assert exit_price == 100.5, "Exit price should be the future price"
    
    finally:
        # Restore original function
        strategy_manager.get_active_strategy = original_get_active_strategy
