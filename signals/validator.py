
from utils.signal_storage import get_last_signal

def validate_signal(signal):
    """
    Validate a signal against existing database records.
    
    Prevents duplicate signals from being generated for the same symbol
    with the same direction.
    
    Args:
        signal: The signal data to validate
        
    Returns:
        The original signal if valid, None if invalid or duplicate
    """
    if signal is None:
        return None
        
    last = get_last_signal(signal["symbol"])
    if last and last.get("signal") == signal.get("signal"):
        return None
        
    return signal
