
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
        
        return df

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

        # Fibonacci component: +20 if close > fib_618
        mask = df['close'] > df['fib_618']
        df.loc[mask, 'signal_score'] += 20

        # Return just the necessary columns
        return df[['timestamp', 'close', 'signal_score']]
