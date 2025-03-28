
"""
Strategy package initialization file.
Provides a factory method to get strategy instances by name.
"""

from strategies.mean_reversion_enhanced import ClassicStrategy, strategy_classic

# Dictionary mapping strategy names to their implementation classes
STRATEGY_CLASSES = {
    "CLASSIC": ClassicStrategy,
}

# Dictionary mapping strategy names to their row-based functions
STRATEGY_FUNCTIONS = {
    "CLASSIC": strategy_classic,
}

def get_strategy(name: str, params: dict = None):
    """
    Factory function to get a strategy instance by name.
    
    Args:
        name: Strategy name
        params: Strategy parameters
        
    Returns:
        TradingStrategy instance
    """
    if name not in STRATEGY_CLASSES:
        raise ValueError(f"Strategy {name} not found. Available strategies: {list(STRATEGY_CLASSES.keys())}")
    
    return STRATEGY_CLASSES[name](params)

def get_strategy_function(name: str):
    """
    Factory function to get a strategy function by name.
    
    Args:
        name: Strategy name
        
    Returns:
        Strategy function
    """
    if name not in STRATEGY_FUNCTIONS:
        raise ValueError(f"Strategy function {name} not found. Available strategies: {list(STRATEGY_FUNCTIONS.keys())}")
    
    return STRATEGY_FUNCTIONS[name]
