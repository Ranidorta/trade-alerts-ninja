# ml/model_integration.py

import numpy as np
import pandas as pd
import joblib
import os
from ta.momentum import RSIIndicator
from ta.volatility import AverageTrueRange
from utils.logger import logger

class AdvancedMLPredictor:
    def __init__(self, model_path="models/advanced_signal_classifier.pkl"):
        self.model_path = model_path
        self.encoder_path = model_path.replace('.pkl', '_encoder.pkl')
        self.model = None
        self.label_encoder = None
        self.load_model()
    
    def load_model(self):
        """Carrega o modelo e encoder se existirem"""
        if os.path.exists(self.model_path) and os.path.exists(self.encoder_path):
            try:
                self.model = joblib.load(self.model_path)
                self.label_encoder = joblib.load(self.encoder_path)
                logger.info("✅ Modelo ML avançado carregado com sucesso")
            except Exception as e:
                logger.error(f"❌ Erro ao carregar modelo: {e}")
                self.model = None
                self.label_encoder = None
        else:
            logger.warning("⚠️ Modelo ML não encontrado. Usando fallback conservador.")
    
    def add_advanced_features(self, df, spx_data=None):
        """
        Adiciona features avançadas para o modelo ML
        """
        if df is None or len(df) < 30:
            return None
        
        try:
            features = {}
            
            # Volume spike (comparado com média de 20 períodos)
            volume_ma20 = df['volume'].rolling(20).mean()
            features['volume_spike'] = df['volume'].iloc[-1] / volume_ma20.iloc[-1] if volume_ma20.iloc[-1] > 0 else 1
            
            # RSI slope (tendência do RSI nos últimos 3 períodos)
            rsi = RSIIndicator(df['close'], window=14).rsi()
            features['rsi_slope'] = rsi.diff(3).iloc[-1] if len(rsi) >= 3 else 0
            features['rsi_current'] = rsi.iloc[-1]
            
            # Price-ATR ratio (preço atual dividido pelo ATR)
            atr = AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range()
            features['price_atr_ratio'] = df['close'].iloc[-1] / atr.iloc[-1] if atr.iloc[-1] > 0 else 100
            
            # Volatilidade normalizada
            atr_current = atr.iloc[-1]
            atr_avg = atr.rolling(50).mean().iloc[-1]
            features['volatility_norm'] = atr_current / atr_avg if atr_avg > 0 else 1
            
            # Momentum (variação percentual dos últimos 5 períodos)
            features['momentum_5'] = (df['close'].iloc[-1] - df['close'].iloc[-6]) / df['close'].iloc[-6] if len(df) >= 6 else 0
            
            # Correlação com SPX (se disponível)
            if spx_data is not None and len(spx_data) >= 20:
                try:
                    correlation = df['close'].rolling(20).corr(spx_data['close']).iloc[-1]
                    features['spx_correlation'] = correlation if not np.isnan(correlation) else 0
                except:
                    features['spx_correlation'] = 0
            else:
                features['spx_correlation'] = 0
            
            # Candlestick body ratio
            body_size = abs(df['close'].iloc[-1] - df['open'].iloc[-1])
            total_range = df['high'].iloc[-1] - df['low'].iloc[-1]
            features['candle_body_ratio'] = body_size / total_range if total_range > 0 else 0
            
            # Support/Resistance proximity
            high_20 = df['high'].rolling(20).max().iloc[-1]
            low_20 = df['low'].rolling(20).min().iloc[-1]
            current_price = df['close'].iloc[-1]
            range_20 = high_20 - low_20
            features['resistance_proximity'] = (high_20 - current_price) / range_20 if range_20 > 0 else 0.5
            features['support_proximity'] = (current_price - low_20) / range_20 if range_20 > 0 else 0.5
            
            logger.info(f"🧠 Features avançadas calculadas: {len(features)} indicadores")
            return features
            
        except Exception as e:
            logger.error(f"❌ Erro ao calcular features avançadas: {e}")
            return None
    
    def dynamic_threshold(self, base_prob, market_volatility, consecutive_losses=0):
        """
        Calcula threshold adaptativo baseado na volatilidade do mercado
        """
        base_threshold = 0.60
        
        # Ajusta threshold baseado na volatilidade
        volatility_adjustment = market_volatility * 0.05
        
        # Aumenta threshold após perdas consecutivas
        loss_adjustment = consecutive_losses * 0.05
        
        # Threshold final
        dynamic_threshold = base_threshold + volatility_adjustment + loss_adjustment
        dynamic_threshold = min(dynamic_threshold, 0.85)  # Limita a 85%
        
        logger.info(f"📊 Threshold dinâmico: {dynamic_threshold:.3f} (base: {base_threshold}, vol: +{volatility_adjustment:.3f}, perdas: +{loss_adjustment:.3f})")
        
        return dynamic_threshold
    
    def predict_signal_quality(self, df, spx_data=None, market_volatility=1.0, consecutive_losses=0):
        """
        Prediz a qualidade do sinal usando o modelo avançado
        """
        if self.model is None or self.label_encoder is None:
            logger.warning("⚠️ Modelo não disponível. Usando fallback conservador.")
            return "LOSER", 0.3
        
        try:
            # Calcula features avançadas
            features = self.add_advanced_features(df, spx_data)
            if features is None:
                return "LOSER", 0.3
            
            # Converte para array numpy na ordem correta
            feature_vector = np.array([
                features['volume_spike'],
                features['rsi_slope'],
                features['rsi_current'] / 100,  # Normaliza RSI
                features['price_atr_ratio'] / 1000,  # Normaliza price-atr ratio
                features['volatility_norm'],
                features['momentum_5'],
                features['spx_correlation'],
                features['candle_body_ratio'],
                features['resistance_proximity'],
                features['support_proximity']
            ]).reshape(1, -1)
            
            # Faz predição
            probabilities = self.model.predict_proba(feature_vector)[0]
            pred_numeric = self.model.predict(feature_vector)[0]
            pred_label = self.label_encoder.inverse_transform([pred_numeric])[0]
            
            # Obtém probabilidade da classe predita
            max_prob = max(probabilities)
            
            # Calcula threshold dinâmico
            threshold = self.dynamic_threshold(max_prob, market_volatility, consecutive_losses)
            
            # Decide se aprova o sinal
            if max_prob >= threshold:
                logger.info(f"🤖 ML APROVADO: {pred_label} (prob: {max_prob:.3f} >= threshold: {threshold:.3f})")
                return pred_label, max_prob
            else:
                logger.info(f"🤖 ML REJEITADO: {pred_label} (prob: {max_prob:.3f} < threshold: {threshold:.3f})")
                return "REJECTED", max_prob
            
        except Exception as e:
            logger.error(f"❌ Erro na predição ML: {e}")
            return "LOSER", 0.3
    
    def get_feature_importance(self):
        """
        Retorna a importância das features do modelo
        """
        if self.model is None:
            return {}
        
        try:
            feature_names = [
                'volume_spike', 'rsi_slope', 'rsi_current', 'price_atr_ratio',
                'volatility_norm', 'momentum_5', 'spx_correlation', 
                'candle_body_ratio', 'resistance_proximity', 'support_proximity'
            ]
            
            importance = dict(zip(feature_names, self.model.feature_importances_))
            return importance
        except:
            return {}

def get_spx_data():
    """
    Placeholder para obter dados do SPX para correlação
    Na implementação real, isso faria uma chamada para API
    """
    # Por agora retorna None, mas deveria buscar dados do S&P 500
    return None