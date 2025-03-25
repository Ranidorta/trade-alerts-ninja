
"""
Unit tests for the conflict resolver module.
"""

import pytest
import sys
import os
from datetime import datetime

# Add the project root to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from signals.conflict_resolver import ConflictResolver

@pytest.fixture
def resolver():
    """Fixture that provides a ConflictResolver instance."""
    return ConflictResolver()

def test_empty_signals(resolver):
    """Test behavior with empty signals list."""
    result = resolver.resolve([])
    assert result is None

def test_single_signal(resolver):
    """Test behavior with a single signal."""
    signals = [
        {
            'strategy': 'BOLLINGER_BANDS',
            'symbol': 'BTCUSDT',
            'direction': 'BUY'
        }
    ]
    
    result = resolver.resolve(signals)
    assert result is not None
    assert result['symbol'] == 'BTCUSDT'
    assert result['direction'] == 'BUY'
    assert 'confidence' in result
    assert 'timestamp' in result

def test_conflicting_signals(resolver):
    """Test resolution of conflicting signals based on weights."""
    signals = [
        {
            'strategy': 'BOLLINGER_BANDS',  # Higher weight
            'symbol': 'BTCUSDT',
            'direction': 'BUY'
        },
        {
            'strategy': 'volume',  # Lower weight
            'symbol': 'BTCUSDT',
            'direction': 'SELL'
        }
    ]
    
    result = resolver.resolve(signals)
    assert result is not None
    assert result['symbol'] == 'BTCUSDT'
    assert result['direction'] == 'BUY'  # BOLLINGER_BANDS has higher weight
    assert 0.5 < result['confidence'] <= 1.0  # Should be high confidence

def test_signals_for_different_symbols(resolver):
    """Test behavior with signals for different symbols."""
    signals = [
        {
            'strategy': 'BOLLINGER_BANDS',
            'symbol': 'BTCUSDT',
            'direction': 'BUY'
        },
        {
            'strategy': 'RSI_MACD',
            'symbol': 'ETHUSDT',
            'direction': 'SELL'
        }
    ]
    
    # Both signals should be preserved as they're for different symbols
    result = resolver.resolve(signals)
    assert result is not None
    
    # Either BTCUSDT or ETHUSDT could be chosen based on weighting
    assert result['symbol'] in ['BTCUSDT', 'ETHUSDT']
    
    # Direction should match the chosen symbol
    if result['symbol'] == 'BTCUSDT':
        assert result['direction'] == 'BUY'
    else:
        assert result['direction'] == 'SELL'

def test_veto_logic(resolver):
    """Test the cross-veto logic."""
    signals = [
        {
            'strategy': 'mean_reversion',
            'symbol': 'BTCUSDT',
            'direction': 'BUY'
        },
        {
            'strategy': 'BREAKOUT_ATR',
            'symbol': 'BTCUSDT',
            'direction': 'SELL',
            'signal_strength': 0.8  # Strong breakout signal
        }
    ]
    
    result = resolver.resolve(signals)
    assert result is not None
    assert result['symbol'] == 'BTCUSDT'
    assert result['direction'] == 'SELL'  # Breakout should veto mean_reversion

def test_get_recent_signals(resolver):
    """Test retrieving recent signals."""
    # Add some signals first
    signals1 = [{'strategy': 'BOLLINGER_BANDS', 'symbol': 'BTCUSDT', 'direction': 'BUY'}]
    signals2 = [{'strategy': 'RSI_MACD', 'symbol': 'ETHUSDT', 'direction': 'SELL'}]
    
    resolver.resolve(signals1)
    resolver.resolve(signals2)
    
    # Get recent signals
    recent = resolver.get_recent_signals()
    assert len(recent) == 2
    assert recent[0]['symbol'] == 'BTCUSDT'
    assert recent[1]['symbol'] == 'ETHUSDT'
