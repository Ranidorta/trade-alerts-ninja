
"""
Basic Trading Strategy

This module defines a basic trading strategy that uses technical indicators to generate buy and sell signals.
"""

class BasicStrategy:
    """Basic trading strategy using RSI, Moving Averages, ATR, and Bollinger Bands."""
    
    def __init__(self):
        """Initialize strategy parameters."""
        # Strategy parameters
        self.RSI_THRESHOLD_BUY = 30
        self.RSI_THRESHOLD_SELL = 70
        self.ATR_MIN = 0.5
        self.VOLATILITY_MIN = 0.3
        self.RISK_REWARD_RATIO = 1.5
        self.RISK_PER_TRADE = 0.02  # 2% of capital per trade
    
    def generate_signal(self, row):
        """
        Generate trading signal based on technical indicators.
        
        Args:
            row: DataFrame row with technical indicators
            
        Returns:
            int: 1 for buy signal, -1 for sell signal, 0 for no signal
        """
        # Strategy with confluence of indicators and risk/volatility filters + MACD and BBands
        if (
            row['rsi'] < self.RSI_THRESHOLD_BUY and
            row['ma_short'] > row['ma_long'] and
            row['atr'] > self.ATR_MIN and
            row['volatility'] > self.VOLATILITY_MIN and
            row['macd'] > row['macd_signal'] and
            row['close'] < row['bb_lower']
        ):
            return 1  # Buy signal
        elif (
            row['rsi'] > self.RSI_THRESHOLD_SELL and
            row['ma_short'] < row['ma_long'] and
            row['atr'] > self.ATR_MIN and
            row['volatility'] > self.VOLATILITY_MIN and
            row['macd'] < row['macd_signal'] and
            row['close'] > row['bb_upper']
        ):
            return -1  # Sell signal
        return 0
