
import time
from collections import deque
import logging
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("timed_queue")

class TimedQueue:
    """
    A queue implementation with time-to-live (TTL) functionality for signals.
    
    Signals are automatically removed after they exceed their TTL.
    """
    
    def __init__(self, ttl_seconds=300):
        """
        Initialize the timed queue.
        
        Args:
            ttl_seconds: Time-to-live in seconds for queue items
        """
        self.queue = deque()
        self.ttl = ttl_seconds
        logger.info(f"Initialized TimedQueue with TTL of {ttl_seconds} seconds")

    def add_signal(self, signal: Dict[str, Any]) -> None:
        """
        Add a signal to the queue with current timestamp.
        
        Args:
            signal: Signal dictionary to add to queue
        """
        # Ensure signal has a timestamp
        if 'timestamp' not in signal:
            signal_with_timestamp = {
                **signal,
                'timestamp': time.time(),
                'created_at': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
            }
        else:
            signal_with_timestamp = signal
            
        self.queue.append(signal_with_timestamp)
        logger.debug(f"Added signal: {signal.get('symbol', 'Unknown')} {signal.get('direction', 'Unknown')}")
        
        # Clean up expired items
        self._cleanup()

    def get_recent_signals(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Get all valid (non-expired) signals.
        
        Args:
            limit: Optional limit on number of signals to return
            
        Returns:
            List of valid signals
        """
        self._cleanup()
        result = list(self.queue)
        
        if limit is not None and limit > 0:
            return result[-limit:]
        return result

    def get_signals_by_symbol(self, symbol: str) -> List[Dict]:
        """
        Get all valid signals for a specific symbol.
        
        Args:
            symbol: Symbol to filter signals by
            
        Returns:
            List of signals for the specified symbol
        """
        self._cleanup()
        return [s for s in self.queue if s.get('symbol') == symbol]

    def _cleanup(self) -> None:
        """Remove all expired signals from the queue."""
        current_time = time.time()
        initial_length = len(self.queue)
        
        # Remove expired items from front of queue
        while self.queue and (current_time - self.queue[0]['timestamp'] > self.ttl):
            expired = self.queue.popleft()
            logger.debug(f"Expired signal removed: {expired.get('symbol', 'Unknown')} {expired.get('direction', 'Unknown')}")
            
        # Log cleanup summary if items were removed
        if initial_length > len(self.queue):
            logger.info(f"Cleaned up {initial_length - len(self.queue)} expired signals")
