
import json
import os

# Load configuration
config_path = os.path.join(os.path.dirname(__file__), '../config.json')
if os.path.exists(config_path):
    with open(config_path) as f:
        config = json.load(f)
else:
    # Default configuration if file doesn't exist
    config = {
        "account_balance": 1000,
        "risk_per_trade": 0.02,
    }

def calculate_position_size(entry_price, sl, leverage):
    """
    Calculate the position size based on risk management parameters.
    
    Args:
        entry_price: Entry price for the trade
        sl: Stop-loss price level
        leverage: Leverage multiplier
        
    Returns:
        Calculated position size
    """
    balance = config.get("account_balance", 0)
    risk_pct = config.get("risk_per_trade", 0.01)
    risk_value = balance * risk_pct
    stop_distance = abs(entry_price - sl)
    return round((risk_value / stop_distance) * leverage, 6) if stop_distance > 0 else 0

def manage_risk(signal):
    """
    Apply risk management principles to a trading signal.
    
    Args:
        signal: Dictionary containing signal data
        
    Returns:
        Signal with added risk management parameters
    """
    if signal is None:
        return None
        
    size = calculate_position_size(signal["entry_price"], signal["sl"], signal["leverage"])
    signal["size"] = size
    return signal
