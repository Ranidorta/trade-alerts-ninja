import gym
import numpy as np
from gym import spaces
import logging

logger = logging.getLogger("AdaptiveAI")

class TradingEnv(gym.Env):
    """
    Ambiente de trading que simula e recompensa o agente adaptativo
    para otimização contínua dos parâmetros do Monster V2
    """
    
    def __init__(self, initial_balance=10000):
        super(TradingEnv, self).__init__()
        
        # Observações (EMA diff, RSI, Volume ratio, ATR ratio)
        self.observation_space = spaces.Box(
            low=-np.inf, 
            high=np.inf, 
            shape=(4,), 
            dtype=np.float32
        )
        
        # Ações: Ajuste dos parâmetros técnicos [-1, 1]
        # [ema_adj, rsi_adj, vol_adj, atr_adj]
        self.action_space = spaces.Box(
            low=-1, 
            high=1, 
            shape=(4,), 
            dtype=np.float32
        )
        
        self.initial_balance = initial_balance
        self.balance = initial_balance
        self.current_step = 0
        self.state = None
        self.trade_history = []
        self.win_rate = 0.0
        self.total_return = 0.0
        
        logger.info(f"🤖 TradingEnv inicializado com balance: ${initial_balance}")
        
    def step(self, action):
        """
        Executa uma ação (ajuste de parâmetros) e retorna resultado
        """
        # Aplicar ajustes dinâmicos
        ema_adj, rsi_adj, vol_adj, atr_adj = action
        
        # Simula resultado do trade baseado nos ajustes
        reward = self._simulate_trade(ema_adj, rsi_adj, vol_adj, atr_adj)
        
        # Atualiza balance
        self.balance += reward
        self.total_return = (self.balance - self.initial_balance) / self.initial_balance
        
        # Calcula win rate
        if len(self.trade_history) > 0:
            wins = sum(1 for trade in self.trade_history if trade > 0)
            self.win_rate = wins / len(self.trade_history)
        
        self.current_step += 1
        done = self.current_step >= 200  # Cada episódio = 200 trades
        
        self.state = self._next_observation()
        
        info = {
            'balance': self.balance,
            'win_rate': self.win_rate,
            'total_return': self.total_return,
            'trade_count': len(self.trade_history)
        }
        
        return self.state, reward, done, info
        
    def reset(self):
        """Reset do ambiente para novo episódio"""
        self.balance = self.initial_balance
        self.current_step = 0
        self.trade_history = []
        self.win_rate = 0.0
        self.total_return = 0.0
        self.state = self._next_observation()
        
        logger.info("🔄 Ambiente resetado para novo episódio")
        return self.state
    
    def _next_observation(self):
        """
        Gera próxima observação (substitua por dados reais depois)
        """
        # Por enquanto, dados simulados
        # Depois integrar com dados reais do mercado
        obs = np.array([
            np.random.uniform(-0.5, 0.5),  # EMA diff
            np.random.uniform(20, 80),     # RSI
            np.random.uniform(0.5, 3.0),   # Volume ratio
            np.random.uniform(0.001, 0.05) # ATR ratio
        ], dtype=np.float32)
        
        return obs
    
    def _simulate_trade(self, ema_adj, rsi_adj, vol_adj, atr_adj):
        """
        Simula resultado do trade com base nos ajustes
        Recompensa baseada na qualidade dos parâmetros
        """
        # Score baseado na qualidade dos ajustes
        parameter_quality = 0.0
        
        # EMA: ajustes moderados são melhores
        parameter_quality += 1.0 - abs(ema_adj) * 0.5
        
        # RSI: ajustes que evitam extremos
        parameter_quality += 1.0 - abs(rsi_adj) * 0.3
        
        # Volume: ajustes positivos moderados são bons
        parameter_quality += max(0, vol_adj) * 0.5
        
        # ATR: ajustes pequenos são melhores
        parameter_quality += 1.0 - abs(atr_adj) * 0.7
        
        # Normalizar score
        parameter_quality = max(0, min(4, parameter_quality)) / 4.0
        
        # Simular resultado do trade (60% win rate base + parameter quality)
        win_probability = 0.6 + (parameter_quality - 0.5) * 0.3
        win_probability = max(0.3, min(0.8, win_probability))
        
        # Resultado binário
        is_winner = np.random.random() < win_probability
        
        if is_winner:
            # Trade vencedor: +100 a +300
            trade_result = np.random.uniform(100, 300)
        else:
            # Trade perdedor: -50 a -150
            trade_result = np.random.uniform(-150, -50)
        
        # Adiciona bonus por consistência
        if len(self.trade_history) > 10:
            recent_wins = sum(1 for trade in self.trade_history[-10:] if trade > 0)
            consistency_bonus = (recent_wins - 5) * 10  # Bonus/penalty por win rate
            trade_result += consistency_bonus
        
        self.trade_history.append(trade_result)
        
        # Log periodicamente
        if len(self.trade_history) % 20 == 0:
            logger.info(f"📊 Step {self.current_step}: Win Rate: {self.win_rate:.2%}, "
                       f"Balance: ${self.balance:.2f}, Return: {self.total_return:.2%}")
        
        return trade_result
    
    def get_performance_metrics(self):
        """Retorna métricas de performance atuais"""
        return {
            'win_rate': self.win_rate,
            'total_return': self.total_return,
            'balance': self.balance,
            'total_trades': len(self.trade_history),
            'current_step': self.current_step
        }