
# Available strategies
STRATEGY_FUNCTIONS = {
    "CLASSIC": "generate_classic_signal",
    "RSI_MACD": "strategy_rsi_macd",
    "BREAKOUT_ATR": "strategy_breakout_atr",
    "TREND_ADX": "strategy_trend_adx",
    "BOLLINGER": "strategy_bollinger_bands"
}

def get_strategy_function(strategy_name):
    """Get strategy function by name."""
    if strategy_name not in STRATEGY_FUNCTIONS:
        raise ValueError(f"Strategy '{strategy_name}' not found")
    
    # Import the appropriate module
    if strategy_name == "BOLLINGER":
        from strategies.bollinger_bands import strategy_bollinger_bands
        return strategy_bollinger_bands
    else:
        from trade_alerts_upgrade import (
            generate_classic_signal, 
            strategy_rsi_macd,
            strategy_breakout_atr,
            strategy_trend_adx
        )
        function_name = STRATEGY_FUNCTIONS[strategy_name]
        return locals()[function_name]

def get_strategy(strategy_name):
    """Get strategy class by name."""
    if strategy_name == "CORE":
        from strategies.core import SignalGenerator
        return SignalGenerator
    elif strategy_name == "BOLLINGER":
        from strategies.bollinger_bands import BollingerBandsStrategy
        return BollingerBandsStrategy
    else:
        raise ValueError(f"Strategy class for '{strategy_name}' not found")
