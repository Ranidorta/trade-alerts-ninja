
from typing import Dict, List, Optional
import numpy as np
import logging
import yaml
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("conflict_resolver")

class ConflictResolver:
    """
    System to resolve conflicts between signals from different strategies.
    
    Uses a weighted voting system with strategy priorities and cross-veto logic.
    """
    
    # Default weights if config file not available
    DEFAULT_STRATEGY_WEIGHTS = {
        'BOLLINGER_BANDS': 0.9,
        'BREAKOUT_ATR': 0.85,
        'CLASSIC': 0.75,
        'FAST': 0.7,
        'RSI_MACD': 0.8,
        'TREND_ADX': 0.65,
        'mean_reversion': 0.6,
        'volume': 0.4
    }

    def __init__(self, config_path=None):
        """
        Initialize the conflict resolver.
        
        Args:
            config_path: Path to configuration file with strategy weights
        """
        self.signal_history = []
        self.strategy_weights = self.DEFAULT_STRATEGY_WEIGHTS.copy()
        
        # Load weights from config if available
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as file:
                    config = yaml.safe_load(file)
                    if 'strategy_weights' in config:
                        self.strategy_weights.update(config['strategy_weights'])
                    self.conflict_rules = config.get('conflict_rules', [])
                    logger.info(f"Loaded strategy weights from {config_path}")
            except Exception as e:
                logger.error(f"Error loading config: {str(e)}")

    def resolve(self, signals: List[Dict]) -> Optional[Dict]:
        """
        Resolve conflicts between signals using weighted voting.
        
        Args:
            signals: List of signal dictionaries with strategy, symbol, direction
            
        Returns:
            Dict: Resolved signal with highest confidence or None if no signals
        """
        if not signals:
            return None
            
        weighted_votes = {}
        for signal in signals:
            weight = self.strategy_weights.get(signal.get('strategy', ''), 0.5)
            key = (signal.get('symbol', ''), signal.get('direction', ''))
            weighted_votes[key] = weighted_votes.get(key, 0) + weight
            
            # Apply cross-veto logic
            if self._should_veto(signal, signals):
                logger.info(f"Signal vetoed: {signal['strategy']} on {signal['symbol']}")
                weighted_votes[key] = 0

        if not weighted_votes:
            return None

        # Find best signal
        best_signal_key, best_weight = max(weighted_votes.items(), key=lambda x: x[1])
        
        # Calculate confidence as proportion of total weight
        total_weight = sum(weighted_votes.values())
        confidence = best_weight / total_weight if total_weight > 0 else 0
        
        resolved_signal = {
            'symbol': best_signal_key[0],
            'direction': best_signal_key[1],
            'confidence': confidence,
            'timestamp': np.datetime64('now').astype('datetime64[s]').astype(str)
        }
        
        logger.info(f"Resolved signal: {resolved_signal['symbol']} {resolved_signal['direction']} with {confidence:.2f} confidence")
        
        # Add to history
        self.signal_history.append(resolved_signal)
        if len(self.signal_history) > 100:  # Keep history manageable
            self.signal_history.pop(0)
            
        return resolved_signal
    
    def _should_veto(self, signal: Dict, all_signals: List[Dict]) -> bool:
        """
        Check if signal should be vetoed based on conflict rules.
        
        Args:
            signal: The signal to check
            all_signals: All signals to compare against
            
        Returns:
            bool: True if signal should be vetoed
        """
        # Implement cross-veto logic
        # For example, veto mean_reversion signals if there's a strong breakout signal
        if signal.get('strategy') == 'mean_reversion':
            for other in all_signals:
                if (other.get('strategy') == 'BREAKOUT_ATR' and 
                    other.get('direction') != signal.get('direction') and
                    other.get('signal_strength', 0) > 0.7):
                    return True
                    
        # Veto volume signals if there's a strong trend signal in opposite direction
        if signal.get('strategy') == 'volume':
            for other in all_signals:
                if (other.get('strategy') == 'TREND_ADX' and 
                    other.get('direction') != signal.get('direction')):
                    return True
                    
        return False

    def get_recent_signals(self, limit=10):
        """
        Get most recent resolved signals.
        
        Args:
            limit: Maximum number of signals to return
            
        Returns:
            List of recent signals
        """
        return self.signal_history[-limit:]
