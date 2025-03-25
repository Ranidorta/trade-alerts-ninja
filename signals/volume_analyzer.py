
"""
Volume analysis with Z-Score normalization by asset.
"""

import numpy as np
import pandas as pd
from scipy import stats
import logging
from typing import Dict, List, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("volume_analyzer")

class VolumeAnalyzer:
    """
    Analyzes volume using Z-Score statistics normalized by asset.
    
    Replaces static thresholds with dynamic ones based on each asset's
    historical volume patterns.
    """
    
    def __init__(self, lookback: int = 20):
        """
        Initialize volume analyzer.
        
        Args:
            lookback: Number of periods to use for Z-Score calculation
        """
        self.lookback = lookback
        self.history: Dict[str, List[float]] = {}
        self.z_scores: Dict[str, float] = {}
        logger.info(f"Initialized VolumeAnalyzer with lookback={lookback}")
        
    def add_volume_data(self, symbol: str, volume: float) -> None:
        """
        Add new volume data point for a symbol.
        
        Args:
            symbol: Asset symbol
            volume: Volume value
        """
        if symbol not in self.history:
            self.history[symbol] = []
            
        self.history[symbol].append(volume)
        
        # Keep history limited to lookback period
        if len(self.history[symbol]) > self.lookback:
            self.history[symbol].pop(0)
            
        # Calculate new Z-Score
        self._calculate_zscore(symbol)
        
    def analyze(self, symbol: str, current_volume: Optional[float] = None) -> float:
        """
        Calculate normalized Z-Score for asset's volume.
        
        Args:
            symbol: Asset symbol
            current_volume: Latest volume (optional, will use last if not provided)
            
        Returns:
            float: Normalized Z-Score value
        """
        # Add current volume if provided
        if current_volume is not None:
            self.add_volume_data(symbol, current_volume)
            
        # Return current Z-Score
        return self.z_scores.get(symbol, 0)
        
    def get_high_volume_symbols(self, threshold: float = 1.5) -> List[str]:
        """
        Get symbols with abnormally high volume.
        
        Args:
            threshold: Z-Score threshold to consider high
            
        Returns:
            List[str]: Symbols with high volume
        """
        return [symbol for symbol, z_score in self.z_scores.items() 
                if z_score > threshold]
                
    def get_low_volume_symbols(self, threshold: float = -1.0) -> List[str]:
        """
        Get symbols with abnormally low volume.
        
        Args:
            threshold: Z-Score threshold to consider low
            
        Returns:
            List[str]: Symbols with low volume
        """
        return [symbol for symbol, z_score in self.z_scores.items() 
                if z_score < threshold]
    
    def _calculate_zscore(self, symbol: str) -> None:
        """
        Calculate Z-Score for a symbol's volume.
        
        Args:
            symbol: Asset symbol to calculate for
        """
        if symbol not in self.history or len(self.history[symbol]) < 5:
            self.z_scores[symbol] = 0
            return
            
        # Calculate z-score 
        volumes = self.history[symbol]
        if len(volumes) < 2 or np.std(volumes) == 0:
            self.z_scores[symbol] = 0
            return
            
        z = stats.zscore(volumes)[-1]
        
        # Normalize to avoid extreme values
        normalized_z = np.clip(z / 2, -3, 3)
        
        self.z_scores[symbol] = normalized_z
        logger.debug(f"Calculated volume Z-Score for {symbol}: {normalized_z:.2f}")
        
    def analyze_dataframe(self, df: pd.DataFrame, symbol_col: str = 'symbol', 
                          volume_col: str = 'volume') -> pd.DataFrame:
        """
        Process a DataFrame with volume data for multiple symbols.
        
        Args:
            df: DataFrame with symbol and volume columns
            symbol_col: Name of the symbol column
            volume_col: Name of the volume column
            
        Returns:
            DataFrame with added 'volume_zscore' column
        """
        result = df.copy()
        
        # Group by symbol and process each group
        for symbol, group in result.groupby(symbol_col):
            # Add all volumes to history
            volumes = group[volume_col].values
            for vol in volumes:
                self.add_volume_data(symbol, vol)
        
        # Add Z-Score to DataFrame
        result['volume_zscore'] = result.apply(
            lambda row: self.z_scores.get(row[symbol_col], 0), axis=1)
            
        logger.info(f"Processed volume data for {len(result[symbol_col].unique())} symbols")
        return result
            
    def get_volume_anomalies(self, threshold: float = 2.0) -> Dict[str, float]:
        """
        Get all symbols with volume anomalies.
        
        Args:
            threshold: Absolute Z-Score threshold
            
        Returns:
            Dict mapping symbols to their Z-Scores
        """
        return {symbol: z_score for symbol, z_score in self.z_scores.items() 
                if abs(z_score) > threshold}
