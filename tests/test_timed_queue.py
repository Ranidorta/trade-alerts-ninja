
"""
Unit tests for the timed queue module.
"""

import pytest
import time
import sys
import os

# Add the project root to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.timed_queue import TimedQueue

@pytest.fixture
def queue():
    """Fixture that provides a TimedQueue instance with short TTL for testing."""
    return TimedQueue(ttl_seconds=2)  # Short TTL for testing

def test_add_signal(queue):
    """Test adding a signal to the queue."""
    signal = {'symbol': 'BTCUSDT', 'direction': 'BUY'}
    queue.add_signal(signal)
    
    signals = queue.get_recent_signals()
    assert len(signals) == 1
    assert signals[0]['symbol'] == 'BTCUSDT'
    assert 'timestamp' in signals[0]

def test_signal_expiration(queue):
    """Test that signals expire after TTL."""
    queue.add_signal({'symbol': 'BTCUSDT', 'direction': 'BUY'})
    
    # Signal should exist right after adding
    assert len(queue.get_recent_signals()) == 1
    
    # Sleep longer than TTL
    time.sleep(3)
    
    # Signal should be expired now
    assert len(queue.get_recent_signals()) == 0

def test_multiple_signals(queue):
    """Test adding multiple signals."""
    queue.add_signal({'symbol': 'BTCUSDT', 'direction': 'BUY'})
    queue.add_signal({'symbol': 'ETHUSDT', 'direction': 'SELL'})
    
    signals = queue.get_recent_signals()
    assert len(signals) == 2
    assert signals[0]['symbol'] == 'BTCUSDT'
    assert signals[1]['symbol'] == 'ETHUSDT'

def test_get_signals_by_symbol(queue):
    """Test filtering signals by symbol."""
    queue.add_signal({'symbol': 'BTCUSDT', 'direction': 'BUY'})
    queue.add_signal({'symbol': 'ETHUSDT', 'direction': 'SELL'})
    queue.add_signal({'symbol': 'BTCUSDT', 'direction': 'SELL'})
    
    btc_signals = queue.get_signals_by_symbol('BTCUSDT')
    assert len(btc_signals) == 2
    assert all(s['symbol'] == 'BTCUSDT' for s in btc_signals)
    
    eth_signals = queue.get_signals_by_symbol('ETHUSDT')
    assert len(eth_signals) == 1
    assert eth_signals[0]['symbol'] == 'ETHUSDT'

def test_get_recent_signals_with_limit(queue):
    """Test getting recent signals with a limit."""
    # Add several signals
    for i in range(5):
        queue.add_signal({'symbol': f'COIN{i}', 'direction': 'BUY'})
        
    # Get only the last 3
    signals = queue.get_recent_signals(limit=3)
    assert len(signals) == 3
    assert signals[0]['symbol'] == 'COIN2'
    assert signals[1]['symbol'] == 'COIN3'
    assert signals[2]['symbol'] == 'COIN4'

def test_cleanup(queue):
    """Test the cleanup method explicitly."""
    # Add a signal with manual timestamp in the past
    old_signal = {
        'symbol': 'OLDCOIN',
        'direction': 'BUY',
        'timestamp': time.time() - 10  # 10 seconds ago
    }
    queue.queue.append(old_signal)
    
    # Add a current signal
    queue.add_signal({'symbol': 'NEWCOIN', 'direction': 'SELL'})
    
    # Cleanup should remove the old signal but keep the new one
    signals = queue.get_recent_signals()
    assert len(signals) == 1
    assert signals[0]['symbol'] == 'NEWCOIN'
