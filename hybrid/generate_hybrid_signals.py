
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
    try:
        # First try to import bybit API
        from api.bybit import get_candles, mock_candles
        
        # Try to fetch from API
        df = get_candles(symbol, interval, limit)
        
        # If no data returned, use mock data
        if df.empty:
            print(f"No data available from API for {symbol} {interval}, using mock data")
            df = mock_candles(symbol, days=limit * int(interval) / 1440 if interval.isdigit() else 30)
            
        return df
    except Exception as e:
        print(f"Error fetching data: {e}")
        
        # Generate mock data if API fails
        print(f"Generating mock data for {symbol} {interval}")
        
        # Create date range
        dates = pd.date_range(end=datetime.now(), periods=limit, freq='15min' if interval == '15m' else 
                                                               '1h' if interval == '1h' else '4h')
        
        # Generate random price data
        base_price = 30000 if 'BTC' in symbol else 2000 if 'ETH' in symbol else 100
        
        # Add some trend and randomness
        noise = np.random.normal(0, 1, size=limit)
        trend = np.linspace(0, 0.1, limit)  # Small upward trend
        close = base_price * (1 + trend + noise * 0.01)
        
        # Generate OHLC based on close
        high = close * (1 + abs(np.random.normal(0, 0.005, size=limit)))
        low = close * (1 - abs(np.random.normal(0, 0.005, size=limit)))
        open_price = low + (high - low) * np.random.random(size=limit)
        
        # Create DataFrame
        df = pd.DataFrame({
            'timestamp': dates,
            'open': open_price,
            'high': high,
            'low': low,
            'close': close,
            'volume': np.random.normal(base_price * 100, base_price * 10, size=limit)
        })
        
        return df


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
        f'trend_valid_{label}': df['trend_valid']
    })
    
    return result_df


def generate_hybrid_signal(symbol='BTCUSDT'):
    """
    Generate hybrid signal that checks for alignment across multiple timeframes.
    
    A signal is generated only when all 3 timeframes (15m, 1h, 4h) show alignment:
    - Price above 200 SMA
    - RSI > 30
    - MACD line crossed above signal line
    
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
        print("⚠️ Failed to fetch data for one or more timeframes")
        return False
        
    # Calculate indicators for each timeframe
    df_15m_ind = calculate_indicators(df_15m, '15m')
    df_1h_ind = calculate_indicators(df_1h, '1h')
    df_4h_ind = calculate_indicators(df_4h, '4h')
    
    # Check if all timeframes have a valid trend
    valid_15m = df_15m_ind.iloc[-1]['trend_valid_15m']
    valid_1h = df_1h_ind.iloc[-1]['trend_valid_1h']
    valid_4h = df_4h_ind.iloc[-1]['trend_valid_4h']
    
    all_valid = valid_15m and valid_1h and valid_4h
    
    if all_valid:
        # Get current price and calculate targets
        entry_price = df_15m.iloc[-1]['close']
        stop_loss = entry_price * 0.98  # 2% below entry
        take_profit1 = entry_price * 1.03  # 3% above entry
        take_profit2 = entry_price * 1.05  # 5% above entry
        take_profit3 = entry_price * 1.08  # 8% above entry
        
        # Create signal data
        signal = {
            'timestamp': datetime.utcnow().isoformat(),
            'asset': symbol,
            'direction': 'BUY',
            'timeframe': 'hybrid',
            'score': 1.0,  # Maximum confidence
            'entry_price': entry_price,
            'sl': stop_loss,
            'tp1': take_profit1,
            'tp2': take_profit2,
            'tp3': take_profit3,
            'result': None,
            'indicators': {
                '15m': {
                    'rsi': df_15m_ind.iloc[-1][f'rsi_15m'],
                    'sma200': df_15m_ind.iloc[-1][f'sma_200_15m'],
                    'macd': df_15m_ind.iloc[-1][f'macd_15m'],
                    'macd_signal': df_15m_ind.iloc[-1][f'macd_signal_15m'],
                },
                '1h': {
                    'rsi': df_1h_ind.iloc[-1][f'rsi_1h'],
                    'sma200': df_1h_ind.iloc[-1][f'sma_200_1h'],
                    'macd': df_1h_ind.iloc[-1][f'macd_1h'],
                    'macd_signal': df_1h_ind.iloc[-1][f'macd_signal_1h'],
                },
                '4h': {
                    'rsi': df_4h_ind.iloc[-1][f'rsi_4h'],
                    'sma200': df_4h_ind.iloc[-1][f'sma_200_4h'],
                    'macd': df_4h_ind.iloc[-1][f'macd_4h'],
                    'macd_signal': df_4h_ind.iloc[-1][f'macd_signal_4h'],
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
        print(f"  - Stop Loss: {stop_loss:.2f}")
        print(f"  - Take Profit 1: {take_profit1:.2f}")
        print(f"  - Take Profit 2: {take_profit2:.2f}")
        print(f"  - Take Profit 3: {take_profit3:.2f}")
        
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
        print("⛔ No alignment across timeframes. Signal criteria not met:")
        print(f"  - 15m valid: {valid_15m}")
        print(f"  - 1h valid: {valid_1h}")
        print(f"  - 4h valid: {valid_4h}")
        return False


if __name__ == "__main__":
    # Test with Bitcoin
    generate_hybrid_signal(symbol='BTCUSDT')
    
    # Test with Ethereum
    generate_hybrid_signal(symbol='ETHUSDT')
    
    # Test with Solana
    generate_hybrid_signal(symbol='SOLUSDT')
