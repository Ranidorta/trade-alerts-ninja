
"""
Hybrid signal generation module that combines multiple timeframes
to generate high-confidence trading signals.

This module analyzes data from multiple timeframes (15m, 1h, 4h)
to ensure alignment of technical indicators before generating a signal.
"""

import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import os
from ta.trend import ADXIndicator

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

def fetch_data(symbol='BTCUSDT', interval='15m', limit=250):
    """
    Fetch OHLCV data for the specified symbol and timeframe.
    
    This is a wrapper around the API fetch function. If API is not available,
    it will attempt to use cached data or generate mock data for testing.
    
    Args:
        symbol: Trading pair to fetch data for
        interval: Timeframe (15m, 1h, 4h, etc.)
        limit: Number of candles to fetch
        
    Returns:
        DataFrame with OHLCV data
    """
    # ... keep existing code (API fetching and mock data generation)


def calculate_indicators(df, label):
    """
    Calculate technical indicators for the given DataFrame.
    
    Args:
        df: DataFrame with OHLCV data
        label: Timeframe label for column naming
        
    Returns:
        DataFrame with calculated indicators
    """
    df = df.copy()
    
    # Calculate SMA 200
    df['sma_200'] = df['close'].rolling(window=200).mean()
    
    # Calculate volume moving average
    df['volume_ma_20'] = df['volume'].rolling(window=20).mean()
    
    # Calculate RSI
    delta = df['close'].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    rs = avg_gain / avg_loss
    df['rsi'] = 100 - (100 / (1 + rs))
    
    # Calculate MACD
    exp12 = df['close'].ewm(span=12, adjust=False).mean()
    exp26 = df['close'].ewm(span=26, adjust=False).mean()
    df['macd'] = exp12 - exp26
    df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['macd_histogram'] = df['macd'] - df['macd_signal']
    
    # Calculate ADX
    adx = ADXIndicator(high=df['high'], low=df['low'], close=df['close'], window=14)
    df['adx'] = adx.adx()
    
    # Fibonacci 61.8% retracement level (based on last 100 candles)
    high = df['high'].rolling(window=100).max()
    low = df['low'].rolling(window=100).min()
    df['fib_618'] = high - (0.618 * (high - low))
    
    # Volume Profile - Point of Control approximation
    # Group close prices into bins for better volume distribution analysis
    price_bins = pd.cut(df['close'], bins=50)
    volume_profile = df.groupby(price_bins)['volume'].sum()
    # Find bin with maximum volume
    poc_bin = volume_profile.idxmax()
    # Assign POC value to all rows
    if not volume_profile.empty and poc_bin is not None:
        df['poc'] = poc_bin.mid
    else:
        # Fallback if binning doesn't work properly
        df['poc'] = df.groupby(df['close'].round(decimals=1))['volume'].transform('sum').idxmax()
    
    # Check if indicators meet criteria
    df['above_sma200'] = df['close'] > df['sma_200']
    df['rsi_ok'] = df['rsi'] > 30
    df['macd_cross'] = df['macd'] > df['macd_signal']
    
    # Overall trend validity
    df['trend_valid'] = df['above_sma200'] & df['rsi_ok'] & df['macd_cross']
    
    # Rename columns for timeframe identification
    result_df = pd.DataFrame({
        f'close_{label}': df['close'],
        f'sma_200_{label}': df['sma_200'],
        f'rsi_{label}': df['rsi'],
        f'macd_{label}': df['macd'],
        f'macd_signal_{label}': df['macd_signal'],
        f'trend_valid_{label}': df['trend_valid'],
        f'volume_{label}': df['volume'],
        f'volume_ma_20_{label}': df['volume_ma_20'],
        f'adx_{label}': df['adx'],
        f'fib_618_{label}': df['fib_618'],
        f'poc_{label}': df['poc']
    })
    
    return result_df


def is_trend_aligned(df_15m, df_1h, df_4h):
    """
    Check if trend is aligned across multiple timeframes with weighted importance.
    
    Args:
        df_15m: DataFrame with 15m indicators
        df_1h: DataFrame with 1h indicators
        df_4h: DataFrame with 4h indicators
        
    Returns:
        Boolean indicating if trend alignment score meets threshold (≥0.7)
    """
    # Define timeframe weights (4h=50%, 1h=30%, 15m=20%)
    weights = {'4h': 0.5, '1h': 0.3, '15m': 0.2}
    
    # Get latest data for each timeframe
    s15 = df_15m.iloc[-1]
    s1h = df_1h.iloc[-1]
    s4h = df_4h.iloc[-1]
    
    # Calculate weighted score
    score = 0.0
    
    # Apply weights to each timeframe's trend validity
    if s4h['trend_valid_4h']:
        score += weights['4h']
        
    if s1h['trend_valid_1h']:
        score += weights['1h']
        
    if s15['trend_valid_15m']:
        score += weights['15m']
    
    # Check if score meets or exceeds threshold (0.7)
    return score >= 0.7


def generate_hybrid_signal(symbol='BTCUSDT'):
    """
    Generate hybrid signal that checks for alignment across multiple timeframes.
    
    Signal is generated only when:
    - Trend is aligned across timeframes (with hierarchical weights)
    - 1h volume > 20-period volume MA
    - 4h ADX > 25 (strong trend)
    - Current 15m price > Fibonacci 61.8% retracement level from 4h
    - Current 15m price > Point of Control (POC) from 4h volume profile
    
    Args:
        symbol: Trading pair to analyze
        
    Returns:
        Boolean indicating if a signal was generated
    """
    print(f"Analyzing {symbol} across multiple timeframes...")
    
    # Fetch data for each timeframe
    df_15m = fetch_data(symbol=symbol, interval='15m', limit=250)
    df_1h = fetch_data(symbol=symbol, interval='1h', limit=250)
    df_4h = fetch_data(symbol=symbol, interval='4h', limit=250)
    
    if df_15m.empty or df_1h.empty or df_4h.empty:
        print(f"⚠️ Failed to fetch data for one or more timeframes for {symbol}")
        return False
        
    # Calculate indicators for each timeframe
    df_15m_ind = calculate_indicators(df_15m, '15m')
    df_1h_ind = calculate_indicators(df_1h, '1h')
    df_4h_ind = calculate_indicators(df_4h, '4h')
    
    # Get latest values
    s_15m = df_15m_ind.iloc[-1]
    s_1h = df_1h_ind.iloc[-1]
    s_4h = df_4h_ind.iloc[-1]
    
    # Check condition 1: Trend alignment with hierarchical weights
    trend_aligned = is_trend_aligned(df_15m_ind, df_1h_ind, df_4h_ind)
    
    # Check condition 2: 1h volume > 20-period volume MA
    volume_ok = s_1h[f'volume_1h'] > s_1h[f'volume_ma_20_1h']
    
    # Check condition 3: 4h ADX > 25 (strong trend)
    strong_trend = s_4h[f'adx_4h'] > 25
    
    # Check condition 4: 15m price > Fibonacci 61.8% retracement level from 4h
    fib_confirmation = s_15m[f'close_15m'] > s_4h[f'fib_618_4h']
    
    # Check condition 5: 15m price > Point of Control (POC) from 4h volume profile
    poc_confirmation = s_15m[f'close_15m'] > s_4h[f'poc_4h']
    
    # All conditions must be true
    all_conditions_met = (
        trend_aligned and 
        volume_ok and 
        strong_trend and 
        fib_confirmation and 
        poc_confirmation
    )
    
    if all_conditions_met:
        # Get current price and calculate targets
        entry_price = df_15m.iloc[-1]['close']
        stop_loss = entry_price * 0.98  # 2% below entry
        take_profit = entry_price * 1.03  # 3% above entry
        
        # Create signal data
        signal = {
            'timestamp': datetime.utcnow().isoformat(),
            'asset': symbol,
            'direction': 'BUY',
            'timeframe': 'hybrid',
            'score': 1.0,  # Highest confidence score (was 0.95, now 1.0)
            'entry_price': entry_price,
            'sl': stop_loss,
            'tp': take_profit,
            'result': None,
            'indicators': {
                '15m': {
                    'rsi': df_15m_ind.iloc[-1][f'rsi_15m'],
                    'sma200': df_15m_ind.iloc[-1][f'sma_200_15m'],
                    'trend_valid': df_15m_ind.iloc[-1][f'trend_valid_15m'],
                    'close': df_15m_ind.iloc[-1][f'close_15m'],
                },
                '1h': {
                    'rsi': df_1h_ind.iloc[-1][f'rsi_1h'],
                    'sma200': df_1h_ind.iloc[-1][f'sma_200_1h'],
                    'volume': df_1h_ind.iloc[-1][f'volume_1h'],
                    'volume_ma20': df_1h_ind.iloc[-1][f'volume_ma_20_1h'],
                    'trend_valid': df_1h_ind.iloc[-1][f'trend_valid_1h'],
                },
                '4h': {
                    'rsi': df_4h_ind.iloc[-1][f'rsi_4h'],
                    'sma200': df_4h_ind.iloc[-1][f'sma_200_4h'],
                    'adx': df_4h_ind.iloc[-1][f'adx_4h'],
                    'trend_valid': df_4h_ind.iloc[-1][f'trend_valid_4h'],
                    'fib_618': df_4h_ind.iloc[-1][f'fib_618_4h'],
                    'poc': df_4h_ind.iloc[-1][f'poc_4h'],
                }
            }
        }
        
        # Ensure the data directory exists
        data_dir = Path("data")
        data_dir.mkdir(exist_ok=True)
        
        # Save to CSV
        file_path = data_dir / "historical_signals_hybrid.csv"
        df_signal = pd.DataFrame([signal])
        
        # Write header only if file doesn't exist
        write_header = not file_path.exists()
        
        # Save signal to CSV
        df_signal.to_csv(file_path, mode='a', header=write_header, index=False)
        
        print(f"✅ Hybrid signal generated for {symbol} @ {entry_price}")
        print(f"  - Entry: {entry_price:.2f}")
        print(f"  - Stop Loss: {stop_loss:.2f} (-2%)")
        print(f"  - Take Profit: {take_profit:.2f} (+3%)")
        print(f"  - Score: 1.0")
        print(f"  - Confirmations:")
        print(f"    • Trend alignment: ✓")
        print(f"    • 1h volume > MA: ✓")
        print(f"    • 4h ADX > 25: ✓")
        print(f"    • Above Fib 61.8%: ✓")
        print(f"    • Above POC: ✓")
        
        # Save to a specific utils function if available
        try:
            from utils.save_signal import save_signal
            save_signal(signal)
            print("  - Also saved using utils.save_signal")
        except ImportError:
            # If save_signal not available, we already saved to CSV above
            pass
            
        return True
    else:
        print(f"⛔ Signal criteria not met for {symbol}:")
        print(f"  - Trend aligned: {'✓' if trend_aligned else '✗'}")
        print(f"  - 1h Volume > MA: {'✓' if volume_ok else '✗'}")
        print(f"  - 4h ADX > 25: {'✓' if strong_trend else '✗'}")
        print(f"  - Above Fib 61.8%: {'✓' if fib_confirmation else '✗'}")
        print(f"  - Above POC: {'✓' if poc_confirmation else '✗'}")
        return False


if __name__ == "__main__":
    # Test with multiple symbols
    symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
    for symbol in symbols:
        generate_hybrid_signal(symbol=symbol)
