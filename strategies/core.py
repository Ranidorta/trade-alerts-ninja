
import numpy as np
import pandas as pd
import talib  # Using talib which is already in requirements.txt
from strategies.patterns import calculate_fibonacci_levels, detect_poc

class SignalGenerator:
    def __init__(self, df):
        self.df = self._calculate_indicators(df)

    def _calculate_indicators(self, df):
        """Calculate all technical indicators needed for signal generation"""
        # Make sure we have a copy to avoid modifying the original
        df = df.copy()
        
        # Calculate SMA indicators
        df['sma_50'] = talib.SMA(df['close'].values, timeperiod=50)
        df['sma_200'] = talib.SMA(df['close'].values, timeperiod=200)
        
        # Calculate MACD
        macd, macdsignal, macdhist = talib.MACD(df['close'].values)
        df['macd'] = macd
        
        # Calculate volume moving average
        df['volume_ma_20'] = talib.SMA(df['volume'].values, timeperiod=20)
        
        # Calculate RSI
        df['rsi'] = talib.RSI(df['close'].values)
        
        # Calculate POC (Point of Control)
        df['poc'] = detect_poc(df)
        
        # Calculate Fibonacci levels
        fibs = calculate_fibonacci_levels(df)
        df['fib_618'] = fibs['61.8%']
        
        # Calculate ADX - Added for trend strength confirmation
        df['adx'] = talib.ADX(df['high'].values, df['low'].values, df['close'].values, timeperiod=14)
        
        # Detect hammer patterns
        df['hammer'] = self._detect_hammer(df)
        
        return df

    def _detect_hammer(self, df):
        """
        Detect hammer candlestick patterns (reversal patterns)
        Hammer has small body and long lower shadow
        """
        # Initialize the result array
        hammer = np.zeros(len(df))
        
        for i in range(len(df)):
            # Calculate body and shadows
            body_size = abs(df['close'].iloc[i] - df['open'].iloc[i])
            upper_shadow = df['high'].iloc[i] - max(df['close'].iloc[i], df['open'].iloc[i])
            lower_shadow = min(df['close'].iloc[i], df['open'].iloc[i]) - df['low'].iloc[i]
            
            # Hammer conditions:
            # 1. Lower shadow should be at least 2x the body size
            # 2. Upper shadow should be small (less than half the body)
            # 3. Body should be in the upper 1/3 of the candle
            if (body_size > 0 and  # Ensure there is a body
                lower_shadow >= 2 * body_size and  # Long lower shadow
                upper_shadow <= 0.5 * body_size and  # Small upper shadow
                lower_shadow >= 3 * upper_shadow):  # Lower shadow much larger than upper
                
                hammer[i] = 1
        
        return hammer

    def generate_signal(self):
        """Generate signal scores based on technical criteria"""
        df = self.df.copy()
        df['signal_score'] = 0

        # Trend component: +30 if close > SMA 200
        mask = df['close'] > df['sma_200']
        df.loc[mask, 'signal_score'] += 30

        # Momentum component: +30 if RSI > 30 and MACD > 0
        mask = (df['rsi'] > 30) & (df['macd'] > 0)
        df.loc[mask, 'signal_score'] += 30

        # Volume confirmation: +20 if volume > volume_ma_20 and close > POC
        mask = (df['volume'] > df['volume_ma_20']) & (df['close'] > df['poc'])
        df.loc[mask, 'signal_score'] += 20

        # Trend strength and Fibonacci component: +10 if ADX >= 25 and close > fib_618
        mask = (df['adx'] >= 25) & (df['close'] > df['fib_618'])
        df.loc[mask, 'signal_score'] += 10

        # Candlestick patterns component: +10 if hammer detected
        mask = df['hammer'] == 1
        df.loc[mask, 'signal_score'] += 10

        # Return just the necessary columns
        return df[['timestamp', 'close', 'signal_score']]
