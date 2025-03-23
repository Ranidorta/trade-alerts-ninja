
"""
Strategy Manager for Trading Agent

This module provides a manager for different trading strategies that can be used by the trading agent.
"""

class StrategyManager:
    """Class to manage different trading strategies."""
    
    def __init__(self):
        """Initialize the strategy manager with an empty strategy dictionary."""
        self.strategies = {}
        self.active_strategy = None
    
    def register_strategy(self, name, strategy):
        """Register a new strategy."""
        self.strategies[name] = strategy
        if not self.active_strategy:
            self.active_strategy = name
    
    def get_strategy(self, name):
        """Get a strategy by name."""
        if name not in self.strategies:
            raise ValueError(f"Strategy '{name}' is not registered.")
        return self.strategies[name]
    
    def list_strategies(self):
        """List all registered strategies."""
        return list(self.strategies.keys())
    
    def set_active_strategy(self, name):
        """Set the active strategy."""
        if name not in self.strategies:
            raise ValueError(f"Strategy '{name}' is not registered.")
        self.active_strategy = name
    
    def get_active_strategy(self):
        """Get the currently active strategy."""
        if not self.active_strategy:
            raise ValueError("No active strategy set.")
        return self.strategies[self.active_strategy]
