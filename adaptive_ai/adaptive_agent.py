import numpy as np
import os
import logging
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback
from trading_env import TradingEnv

logger = logging.getLogger("AdaptiveAgent")

class TradingCallback(BaseCallback):
    """
    Callback personalizado para logging durante o treinamento
    """
    def __init__(self, verbose=0):
        super(TradingCallback, self).__init__(verbose)
        self.episode_rewards = []
        self.episode_lengths = []
    
    def _on_step(self) -> bool:
        # Log a cada 100 steps
        if self.n_calls % 100 == 0:
            logger.info(f"🎯 Training step: {self.n_calls}")
        return True
    
    def _on_rollout_end(self) -> None:
        # Log ao final de cada rollout
        if len(self.locals.get('infos', [])) > 0:
            info = self.locals['infos'][-1]
            if 'win_rate' in info:
                logger.info(f"📈 Rollout end - Win Rate: {info['win_rate']:.2%}, "
                           f"Return: {info['total_return']:.2%}")

class AdaptiveTradingAgent:
    """
    Agente de trading adaptativo que aprende automaticamente
    os melhores parâmetros para o Monster V2
    """
    
    def __init__(self, model_path="models/adaptive_trading_agent"):
        self.env = TradingEnv()
        self.model_path = model_path
        self.model = None
        self.is_trained = False
        
        # Cria diretório de modelos se não existir
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        logger.info("🤖 AdaptiveTradingAgent inicializado")
    
    def train(self, timesteps=50000, save_every=10000):
        """
        Treina o agente adaptativo com PPO
        """
        logger.info(f"🚀 Iniciando treinamento do agente adaptativo ({timesteps} timesteps)")
        
        # Inicializa modelo PPO
        self.model = PPO(
            'MlpPolicy',
            self.env,
            verbose=1,
            learning_rate=0.0003,
            n_steps=2048,
            batch_size=64,
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            tensorboard_log="./adaptive_ai_tensorboard/"
        )
        
        # Callback personalizado
        callback = TradingCallback()
        
        try:
            # Treina o modelo
            self.model.learn(
                total_timesteps=timesteps,
                callback=callback,
                progress_bar=True
            )
            
            # Salva modelo treinado
            self.model.save(self.model_path)
            self.is_trained = True
            
            logger.info(f"✅ Treinamento concluído! Modelo salvo em: {self.model_path}.zip")
            
            # Avalia performance final
            self._evaluate_performance()
            
        except Exception as e:
            logger.error(f"❌ Erro durante treinamento: {e}")
            raise
    
    def load_model(self, path=None):
        """
        Carrega modelo pré-treinado
        """
        model_file = path or f"{self.model_path}.zip"
        
        if os.path.exists(model_file):
            try:
                self.model = PPO.load(model_file)
                self.is_trained = True
                logger.info(f"✅ Modelo carregado: {model_file}")
                return True
            except Exception as e:
                logger.error(f"❌ Erro ao carregar modelo: {e}")
                return False
        else:
            logger.warning(f"⚠️ Modelo não encontrado: {model_file}")
            return False
    
    def adapt_parameters(self, market_observation):
        """
        Adapta parâmetros baseado na observação do mercado
        """
        if not self.is_trained or self.model is None:
            logger.warning("⚠️ Modelo não treinado! Usando parâmetros padrão.")
            return self._get_default_adjustments()
        
        try:
            # Predição do modelo
            action, _states = self.model.predict(market_observation, deterministic=True)
            
            ema_adj, rsi_adj, vol_adj, atr_adj = action
            
            # Converte ações [-1,1] para ajustes práticos
            adjustments = {
                "ema_adj": float(ema_adj * 15),      # ±15 períodos EMA
                "rsi_adj": float(rsi_adj * 15),      # ±15 pontos RSI
                "vol_adj": float(vol_adj * 0.5),     # ±0.5 volume ratio
                "atr_adj": float(atr_adj * 0.02)     # ±0.02 ATR ratio
            }
            
            logger.debug(f"🎯 Parâmetros adaptados: {adjustments}")
            return adjustments
            
        except Exception as e:
            logger.error(f"❌ Erro na adaptação de parâmetros: {e}")
            return self._get_default_adjustments()
    
    def _get_default_adjustments(self):
        """Parâmetros padrão quando modelo não disponível"""
        return {
            "ema_adj": 0.0,
            "rsi_adj": 0.0,
            "vol_adj": 0.0,
            "atr_adj": 0.0
        }
    
    def _evaluate_performance(self, num_episodes=10):
        """
        Avalia performance do modelo treinado
        """
        logger.info(f"📊 Avaliando performance ({num_episodes} episódios)...")
        
        total_rewards = []
        win_rates = []
        
        for episode in range(num_episodes):
            obs = self.env.reset()
            episode_reward = 0
            done = False
            
            while not done:
                action, _states = self.model.predict(obs, deterministic=True)
                obs, reward, done, info = self.env.step(action)
                episode_reward += reward
            
            total_rewards.append(episode_reward)
            win_rates.append(info.get('win_rate', 0))
            
            logger.info(f"   Episódio {episode+1}: Reward={episode_reward:.2f}, "
                       f"Win Rate={info.get('win_rate', 0):.2%}")
        
        avg_reward = np.mean(total_rewards)
        avg_win_rate = np.mean(win_rates)
        
        logger.info(f"📈 PERFORMANCE FINAL:")
        logger.info(f"   💰 Reward médio: {avg_reward:.2f}")
        logger.info(f"   🎯 Win rate médio: {avg_win_rate:.2%}")
        logger.info(f"   📊 Std reward: {np.std(total_rewards):.2f}")
        
        return {
            'avg_reward': avg_reward,
            'avg_win_rate': avg_win_rate,
            'std_reward': np.std(total_rewards)
        }
    
    def get_model_status(self):
        """Retorna status do modelo"""
        return {
            'is_trained': self.is_trained,
            'model_exists': os.path.exists(f"{self.model_path}.zip"),
            'model_path': self.model_path
        }