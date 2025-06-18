# ml/real_time_training.py

import pandas as pd
import sqlite3
import joblib
import os
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from utils.logger import logger

class RealTimeMLTrainer:
    def __init__(self, db_path="signals.db", model_path="models/advanced_signal_classifier.pkl"):
        self.db_path = db_path
        self.model_path = model_path
        self.encoder_path = model_path.replace('.pkl', '_encoder.pkl')
        self.min_samples_for_retrain = 20
        self.retrain_frequency_hours = 24
        self.last_retrain = None
    
    def get_recent_trades(self, period_hours=48):
        """
        Busca trades recentes com resultados para re-treinar o modelo
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Calcula timestamp de início do período
                start_time = (datetime.utcnow() - timedelta(hours=period_hours)).isoformat()
                
                query = """
                SELECT symbol, direction, rsi, adx, volume_ratio, candle_body_ratio, 
                       result, timestamp, success_prob, atr, score
                FROM signals 
                WHERE result IS NOT NULL 
                AND timestamp >= ?
                AND result IN ('WINNER', 'PARTIAL', 'LOSER', 'FALSE')
                ORDER BY timestamp DESC
                """
                
                df = pd.read_sql_query(query, conn, params=[start_time])
                logger.info(f"📊 Coletados {len(df)} trades recentes ({period_hours}h)")
                return df
                
        except Exception as e:
            logger.error(f"❌ Erro ao buscar trades recentes: {e}")
            return pd.DataFrame()
    
    def prepare_training_data(self, df_trades):
        """
        Prepara dados de training com features avançadas
        """
        try:
            if df_trades.empty:
                return None, None
            
            # Features básicas existentes
            basic_features = ['rsi', 'adx', 'volume_ratio', 'candle_body_ratio']
            
            # Adiciona features avançadas calculadas
            df_trades['rsi_normalized'] = df_trades['rsi'] / 100
            df_trades['success_prob_feature'] = df_trades.get('success_prob', 0.5)
            df_trades['atr_normalized'] = df_trades.get('atr', 0) / 1000
            df_trades['score_normalized'] = df_trades.get('score', 0.5)
            
            # Features direcionais
            df_trades['is_buy'] = (df_trades['direction'] == 'BUY').astype(int)
            df_trades['is_sell'] = (df_trades['direction'] == 'SELL').astype(int)
            
            # Calcula momentum baseado em timestamps
            df_trades['timestamp_dt'] = pd.to_datetime(df_trades['timestamp'])
            df_trades = df_trades.sort_values('timestamp_dt')
            df_trades['hour_of_day'] = df_trades['timestamp_dt'].dt.hour
            df_trades['day_of_week'] = df_trades['timestamp_dt'].dt.dayofweek
            
            # Features finais para o modelo
            feature_columns = [
                'rsi_normalized', 'adx', 'volume_ratio', 'candle_body_ratio',
                'success_prob_feature', 'atr_normalized', 'score_normalized',
                'is_buy', 'is_sell', 'hour_of_day'
            ]
            
            # Remove linhas com valores nulos
            df_clean = df_trades.dropna(subset=feature_columns + ['result'])
            
            if len(df_clean) < self.min_samples_for_retrain:
                logger.warning(f"⚠️ Dados insuficientes para treino: {len(df_clean)} < {self.min_samples_for_retrain}")
                return None, None
            
            X = df_clean[feature_columns]
            y = df_clean['result']
            
            logger.info(f"✅ Dados preparados: {len(X)} amostras com {len(feature_columns)} features")
            return X, y
            
        except Exception as e:
            logger.error(f"❌ Erro ao preparar dados de treino: {e}")
            return None, None
    
    def update_model_with_trade_results(self, force_retrain=False):
        """
        Atualiza o modelo com resultados de trades recentes
        """
        try:
            # Verifica se é necessário re-treinar
            if not force_retrain and self.last_retrain:
                time_since_retrain = datetime.utcnow() - self.last_retrain
                if time_since_retrain.total_seconds() < self.retrain_frequency_hours * 3600:
                    logger.info(f"⏰ Re-treino não necessário ainda ({time_since_retrain.total_seconds()/3600:.1f}h)")
                    return False
            
            # Busca trades recentes
            recent_trades = self.get_recent_trades(period_hours=72)
            if recent_trades.empty:
                logger.warning("⚠️ Nenhum trade recente encontrado para re-treino")
                return False
            
            # Prepara dados de treino
            X, y = self.prepare_training_data(recent_trades)
            if X is None or y is None:
                return False
            
            # Analisa distribuição de resultados
            result_counts = y.value_counts()
            logger.info(f"📊 Distribuição de resultados: {dict(result_counts)}")
            
            # Verifica se há pelo menos 2 classes diferentes
            if len(result_counts) < 2:
                logger.warning("⚠️ Dados insuficientemente diversos para treino")
                return False
            
            # Prepara encoder de labels
            label_encoder = LabelEncoder()
            y_encoded = label_encoder.fit_transform(y)
            
            # Treina novo modelo
            model = RandomForestClassifier(
                n_estimators=150,  # Mais árvores para melhor performance
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                class_weight='balanced'  # Balanceia classes desbalanceadas
            )
            
            # Split para validação
            X_train, X_test, y_train, y_test = train_test_split(
                X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
            )
            
            # Treina o modelo
            model.fit(X_train, y_train)
            
            # Avalia performance
            train_score = model.score(X_train, y_train)
            test_score = model.score(X_test, y_test)
            
            logger.info(f"🎯 Performance do modelo:")
            logger.info(f"   Treino: {train_score:.3f}")
            logger.info(f"   Teste: {test_score:.3f}")
            
            # Salva apenas se performance for razoável
            if test_score > 0.5:  # Melhor que chance aleatória
                # Cria diretório se não existe
                os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
                
                # Salva modelo e encoder
                joblib.dump(model, self.model_path)
                joblib.dump(label_encoder, self.encoder_path)
                
                # Atualiza timestamp do último treino
                self.last_retrain = datetime.utcnow()
                
                # Log de importância das features
                feature_names = X.columns.tolist()
                feature_importance = dict(zip(feature_names, model.feature_importances_))
                
                logger.info("🔍 Top features importantes:")
                for feature, importance in sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]:
                    logger.info(f"   {feature}: {importance:.4f}")
                
                logger.info(f"✅ Modelo re-treinado e salvo: {test_score:.3f} acurácia")
                logger.info(f"📅 Próximo re-treino em {self.retrain_frequency_hours}h")
                
                return True
            else:
                logger.warning(f"⚠️ Performance insuficiente ({test_score:.3f}) - modelo não salvo")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro durante re-treino do modelo: {e}")
            return False
    
    def get_model_stats(self):
        """
        Retorna estatísticas do modelo atual
        """
        try:
            if not os.path.exists(self.model_path):
                return {"status": "not_found"}
            
            model_time = datetime.fromtimestamp(os.path.getmtime(self.model_path))
            age_hours = (datetime.now() - model_time).total_seconds() / 3600
            
            # Conta trades recentes para avaliar se precisa retreinar
            recent_trades = self.get_recent_trades(period_hours=24)
            
            return {
                "status": "available",
                "last_updated": model_time.isoformat(),
                "age_hours": round(age_hours, 1),
                "recent_trades": len(recent_trades),
                "needs_retrain": age_hours > self.retrain_frequency_hours or len(recent_trades) >= self.min_samples_for_retrain
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao obter stats do modelo: {e}")
            return {"status": "error", "error": str(e)}

def auto_retrain_model():
    """
    Função para re-treino automático do modelo
    """
    trainer = RealTimeMLTrainer()
    stats = trainer.get_model_stats()
    
    logger.info(f"📊 Status do modelo: {stats}")
    
    if stats.get("needs_retrain", False):
        logger.info("🔄 Iniciando re-treino automático...")
        success = trainer.update_model_with_trade_results()
        if success:
            logger.info("✅ Re-treino automático concluído com sucesso")
        else:
            logger.warning("⚠️ Re-treino automático falhou")
    else:
        logger.info("ℹ️ Re-treino não necessário no momento")

if __name__ == "__main__":
    auto_retrain_model()