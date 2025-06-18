# utils/false_breakout_detector.py

import numpy as np
import pandas as pd
from ta.volatility import AverageTrueRange
from ta.momentum import RSIIndicator
from utils.logger import logger

class FalseBreakoutDetector:
    def __init__(self, lookback_periods=5):
        self.lookback_periods = lookback_periods
    
    def is_valid_breakout(self, df, direction="UP"):
        """
        Verifica se um breakout é válido ou é um falso breakout
        """
        if df is None or len(df) < self.lookback_periods + 1:
            logger.warning("Dados insuficientes para detectar breakout")
            return False
        
        try:
            last_candle = df.iloc[-1]
            last_close = last_candle['close']
            
            # Obtém máximos e mínimos dos períodos anteriores
            prev_candles = df.iloc[-self.lookback_periods-1:-1]
            prev_high = prev_candles['high'].max()
            prev_low = prev_candles['low'].min()
            
            # Calcula ATR para determinar significância do breakout
            atr = AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range().iloc[-1]
            
            # Threshold mínimo para considerar breakout válido (0.3% do preço ou 1 ATR)
            price_threshold = last_close * 0.003
            atr_threshold = atr
            min_threshold = max(price_threshold, atr_threshold)
            
            if direction == "UP":
                # Breakout de alta: preço deve estar acima do máximo anterior
                breakout_distance = last_close - prev_high
                is_breakout = last_close > prev_high
                is_significant = breakout_distance > min_threshold
                
                # Verifica se o volume confirma o breakout
                volume_confirmation = self._check_volume_confirmation(df)
                
                # Verifica se não há divergência bearish no RSI
                rsi_confirmation = self._check_rsi_confirmation(df, direction)
                
                logger.info(f"📈 Breakout UP: {is_breakout}, Significativo: {is_significant} (dist: {breakout_distance:.6f} > {min_threshold:.6f})")
                logger.info(f"   Volume: {volume_confirmation}, RSI: {rsi_confirmation}")
                
                return is_breakout and is_significant and volume_confirmation and rsi_confirmation
                
            elif direction == "DOWN":
                # Breakout de baixa: preço deve estar abaixo do mínimo anterior
                breakout_distance = prev_low - last_close
                is_breakout = last_close < prev_low
                is_significant = breakout_distance > min_threshold
                
                volume_confirmation = self._check_volume_confirmation(df)
                rsi_confirmation = self._check_rsi_confirmation(df, direction)
                
                logger.info(f"📉 Breakout DOWN: {is_breakout}, Significativo: {is_significant} (dist: {breakout_distance:.6f} > {min_threshold:.6f})")
                logger.info(f"   Volume: {volume_confirmation}, RSI: {rsi_confirmation}")
                
                return is_breakout and is_significant and volume_confirmation and rsi_confirmation
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar breakout: {e}")
            return False
    
    def _check_volume_confirmation(self, df):
        """
        Verifica se o volume confirma o breakout (volume atual > média)
        """
        try:
            if len(df) < 20:
                return True  # Assume confirmação se dados insuficientes
            
            current_volume = df['volume'].iloc[-1]
            avg_volume = df['volume'].rolling(20).mean().iloc[-1]
            
            volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1
            is_confirmed = volume_ratio > 1.2  # 20% acima da média
            
            logger.info(f"📊 Volume ratio: {volume_ratio:.2f} ({'✅' if is_confirmed else '❌'})")
            return is_confirmed
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar volume: {e}")
            return False
    
    def _check_rsi_confirmation(self, df, direction):
        """
        Verifica se o RSI confirma o breakout (sem divergência)
        """
        try:
            if len(df) < 20:
                return True  # Assume confirmação se dados insuficientes
            
            rsi = RSIIndicator(df['close'], window=14).rsi()
            
            # Verifica os últimos 3 valores de RSI e preço
            rsi_values = rsi.iloc[-3:].values
            price_values = df['close'].iloc[-3:].values
            
            if len(rsi_values) < 3 or len(price_values) < 3:
                return True
            
            # Tendência de preço
            price_trend = np.polyfit(range(3), price_values, 1)[0]
            # Tendência de RSI
            rsi_trend = np.polyfit(range(3), rsi_values, 1)[0]
            
            # Para breakout UP: não deve haver divergência bearish (preço sobe, RSI desce)
            if direction == "UP":
                has_divergence = price_trend > 0 and rsi_trend < -0.5  # RSI caindo significativamente
                is_confirmed = not has_divergence
            # Para breakout DOWN: não deve haver divergência bullish (preço desce, RSI sobe)
            else:
                has_divergence = price_trend < 0 and rsi_trend > 0.5  # RSI subindo significativamente
                is_confirmed = not has_divergence
            
            logger.info(f"📈 RSI trend: {rsi_trend:.2f}, Price trend: {price_trend:.6f} ({'✅' if is_confirmed else '❌'})")
            return is_confirmed
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar RSI: {e}")
            return True  # Default para True em caso de erro
    
    def has_rsi_divergence(self, df, direction):
        """
        Detecta divergências bullish/bearish de RSI
        """
        try:
            if len(df) < 20:
                return False
            
            rsi = RSIIndicator(df['close'], window=14).rsi()
            
            # Últimos 5 valores para análise
            recent_prices = df['close'].iloc[-5:].values
            recent_rsi = rsi.iloc[-5:].values
            
            if len(recent_prices) < 5 or len(recent_rsi) < 5:
                return False
            
            # Calcula tendências
            price_slope = np.polyfit(range(5), recent_prices, 1)[0]
            rsi_slope = np.polyfit(range(5), recent_rsi, 1)[0]
            
            # Divergência bullish: preço em queda, RSI em alta (bom para BUY)
            bullish_divergence = price_slope < 0 and rsi_slope > 1.0
            
            # Divergência bearish: preço em alta, RSI em queda (bom para SELL)
            bearish_divergence = price_slope > 0 and rsi_slope < -1.0
            
            if direction == "BUY" and bullish_divergence:
                logger.info("🔄 Divergência BULLISH detectada - favorável para BUY")
                return True
            elif direction == "SELL" and bearish_divergence:
                logger.info("🔄 Divergência BEARISH detectada - favorável para SELL")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Erro ao detectar divergência RSI: {e}")
            return False
    
    def is_near_support_resistance(self, df, threshold_pct=0.5):
        """
        Verifica se o preço está próximo de níveis de suporte/resistência
        """
        try:
            if len(df) < 50:
                return False, 0
            
            current_price = df['close'].iloc[-1]
            
            # Calcula níveis de suporte e resistência (máximos e mínimos dos últimos 50 períodos)
            high_50 = df['high'].rolling(50).max().iloc[-1]
            low_50 = df['low'].rolling(50).min().iloc[-1]
            
            # Distância para resistência e suporte em %
            resistance_dist = abs(current_price - high_50) / current_price * 100
            support_dist = abs(current_price - low_50) / current_price * 100
            
            near_resistance = resistance_dist <= threshold_pct
            near_support = support_dist <= threshold_pct
            
            if near_resistance:
                logger.info(f"⚠️ Próximo à RESISTÊNCIA: {resistance_dist:.2f}% (threshold: {threshold_pct}%)")
                return True, resistance_dist
            elif near_support:
                logger.info(f"⚠️ Próximo ao SUPORTE: {support_dist:.2f}% (threshold: {threshold_pct}%)")
                return True, support_dist
            
            return False, min(resistance_dist, support_dist)
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar suporte/resistência: {e}")
            return False, 0

def detect_false_breakout(df, direction="UP"):
    """
    Função wrapper para detectar falsos breakouts
    """
    detector = FalseBreakoutDetector()
    return detector.is_valid_breakout(df, direction)

def check_rsi_divergence(df, direction):
    """
    Função wrapper para verificar divergências RSI
    """
    detector = FalseBreakoutDetector()
    return detector.has_rsi_divergence(df, direction)