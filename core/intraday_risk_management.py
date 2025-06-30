
"""
Intraday Risk Management - Gerenciamento dinâmico de risco para Day Trade
Stops e alvos adaptados para operações intradiárias rápidas
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional
from ta.volatility import AverageTrueRange
from utils.logger import logger

class IntradayRiskManager:
    def __init__(self):
        self.base_risk_per_trade = 0.01  # 1% para day trade
        self.max_intraday_risk = 0.03   # 3% máximo por dia
        self.current_daily_risk = 0.0
        self.active_positions = 0
        self.max_concurrent_positions = 3
    
    def calculate_intraday_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        """
        Calcula ATR ajustado para timeframes intradiários
        """
        try:
            if len(df) < period:
                return 0.0
            
            atr_indicator = AverageTrueRange(
                high=df['high'],
                low=df['low'], 
                close=df['close'],
                window=period
            )
            
            atr_value = atr_indicator.average_true_range().iloc[-1]
            return atr_value
            
        except Exception as e:
            logger.error(f"Erro no cálculo do ATR intradiário: {e}")
            return 0.0
    
    def intraday_risk_management(self, entry: float, atr: float, direction: str, timeframe: str = '5m') -> Dict:
        """
        Calcula stops e alvos para day trade com gestão dinâmica
        
        Args:
            entry: Preço de entrada
            atr: ATR atual
            direction: 'BUY' ou 'SELL'
            timeframe: Timeframe da operação
        
        Returns:
            dict: Níveis de stop e take profits
        """
        try:
            if atr <= 0:
                logger.warning("ATR inválido para cálculo de risco")
                return {}
            
            # Multipliers adaptados por timeframe
            multipliers = self._get_timeframe_multipliers(timeframe)
            
            direction_mult = 1 if direction == 'BUY' else -1
            
            # Stop loss mais próximo para day trade
            stop_loss = entry - (direction_mult * atr * multipliers['stop_loss'])
            
            # Take profits escalonados
            take_profit_1 = entry + (direction_mult * atr * multipliers['tp1'])
            take_profit_2 = entry + (direction_mult * atr * multipliers['tp2']) 
            take_profit_3 = entry + (direction_mult * atr * multipliers['tp3'])
            
            # Cálculo de risk/reward
            risk = abs(entry - stop_loss)
            reward_1 = abs(take_profit_1 - entry)
            reward_2 = abs(take_profit_2 - entry) 
            reward_3 = abs(take_profit_3 - entry)
            
            rr_ratios = [
                reward_1 / risk if risk > 0 else 0,
                reward_2 / risk if risk > 0 else 0,
                reward_3 / risk if risk > 0 else 0
            ]
            
            logger.info(f"💰 Risk Management {direction}:")
            logger.info(f"   Entry: {entry:.6f}")
            logger.info(f"   SL: {stop_loss:.6f} (Risk: {risk:.6f})")
            logger.info(f"   TP1: {take_profit_1:.6f} (RR: {rr_ratios[0]:.2f})")
            logger.info(f"   TP2: {take_profit_2:.6f} (RR: {rr_ratios[1]:.2f})")
            logger.info(f"   TP3: {take_profit_3:.6f} (RR: {rr_ratios[2]:.2f})")
            
            return {
                'entry_price': entry,
                'stop_loss': round(stop_loss, 6),
                'take_profits': [
                    round(take_profit_1, 6),
                    round(take_profit_2, 6),
                    round(take_profit_3, 6)
                ],
                'risk_amount': risk,
                'reward_amounts': [reward_1, reward_2, reward_3],
                'rr_ratios': rr_ratios,
                'timeframe': timeframe,
                'atr_used': atr
            }
            
        except Exception as e:
            logger.error(f"Erro no gerenciamento de risco intradiário: {e}")
            return {}
    
    def _get_timeframe_multipliers(self, timeframe: str) -> Dict:
        """
        Retorna multiplicadores de ATR baseados no timeframe
        """
        multipliers_map = {
            '1m': {
                'stop_loss': 0.3,   # Stop muito próximo
                'tp1': 0.5,
                'tp2': 0.8,
                'tp3': 1.2
            },
            '5m': {
                'stop_loss': 0.5,   # Stop próximo
                'tp1': 0.75,
                'tp2': 1.25,
                'tp3': 1.75
            },
            '15m': {
                'stop_loss': 0.7,   # Stop padrão
                'tp1': 1.0,
                'tp2': 1.8,
                'tp3': 2.5
            }
        }
        
        return multipliers_map.get(timeframe, multipliers_map['5m'])
    
    def calculate_position_size(self, account_balance: float, risk_per_trade: float, entry_price: float, stop_loss: float) -> Dict:
        """
        Calcula tamanho da posição baseado no risco
        """
        try:
            risk_amount = abs(entry_price - stop_loss)
            if risk_amount == 0:
                return {}
            
            # Valor em risco por trade
            dollar_risk = account_balance * risk_per_trade
            
            # Quantidade de contratos/unidades
            position_size = dollar_risk / risk_amount
            
            # Ajusta para não exceder limite diário
            remaining_daily_risk = self.max_intraday_risk - self.current_daily_risk
            max_size_by_daily_limit = (account_balance * remaining_daily_risk) / risk_amount
            
            final_position_size = min(position_size, max_size_by_daily_limit)
            
            return {
                'position_size': final_position_size,
                'dollar_risk': dollar_risk,
                'risk_per_unit': risk_amount,
                'remaining_daily_risk': remaining_daily_risk,
                'can_trade': final_position_size > 0 and self.active_positions < self.max_concurrent_positions
            }
            
        except Exception as e:
            logger.error(f"Erro no cálculo do tamanho da posição: {e}")
            return {}
    
    def adaptive_stops(self, df: pd.DataFrame, entry_price: float, direction: str, atr: float) -> Dict:
        """
        Calcula stops adaptativos baseados na volatilidade atual
        """
        try:
            current_price = df['close'].iloc[-1]
            
            # Stop inicial
            initial_multiplier = 0.5
            initial_stop = entry_price - (1 if direction == 'BUY' else -1) * atr * initial_multiplier
            
            # Trailing stop baseado no movimento favorável
            if direction == 'BUY':
                favorable_move = (current_price - entry_price) / entry_price
                if favorable_move > 0.01:  # 1% de lucro
                    # Move stop para breakeven + pequeno buffer
                    trailing_stop = entry_price + atr * 0.2
                else:
                    trailing_stop = initial_stop
            else:
                favorable_move = (entry_price - current_price) / entry_price
                if favorable_move > 0.01:
                    trailing_stop = entry_price - atr * 0.2
                else:
                    trailing_stop = initial_stop
            
            return {
                'initial_stop': round(initial_stop, 6),
                'trailing_stop': round(trailing_stop, 6),
                'favorable_move_pct': favorable_move * 100,
                'should_trail': favorable_move > 0.01
            }
            
        except Exception as e:
            logger.error(f"Erro no cálculo de stops adaptativos: {e}")
            return {}
    
    def validate_intraday_conditions(self, symbol: str, timeframe: str) -> bool:
        """
        Valida se condições estão adequadas para day trade
        """
        try:
            # Verifica limites de risco diário
            if self.current_daily_risk >= self.max_intraday_risk:
                logger.warning(f"🛑 Limite diário de risco atingido: {self.current_daily_risk:.2%}")
                return False
            
            # Verifica número de posições ativas
            if self.active_positions >= self.max_concurrent_positions:
                logger.warning(f"🛑 Limite de posições simultâneas atingido: {self.active_positions}")
                return False
            
            # Verifica se é horário adequado para day trade
            if not self._is_good_trading_hours():
                logger.warning("⏰ Fora do horário ideal para day trade")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Erro na validação de condições intradiárias: {e}")
            return False
    
    def _is_good_trading_hours(self) -> bool:
        """
        Verifica se está em horário de boa liquidez
        """
        from datetime import datetime
        
        try:
            now = datetime.utcnow()
            hour = now.hour
            
            # Horários de maior liquidez (UTC):
            # 13:00-17:00 (overlap London/NY)
            # 00:00-02:00 (abertura Ásia)
            
            good_hours = (13 <= hour <= 17) or (0 <= hour <= 2)
            return good_hours
            
        except Exception as e:
            logger.error(f"Erro na verificação de horários: {e}")
            return True  # Default para permitir
    
    def update_daily_risk(self, trade_result: str, risk_amount: float):
        """
        Atualiza controle de risco diário
        """
        try:
            if trade_result in ['LOSS', 'STOPPED']:
                self.current_daily_risk += risk_amount
                logger.info(f"📉 Risco diário atualizado: {self.current_daily_risk:.2%} / {self.max_intraday_risk:.2%}")
            
            # Reset diário (simplificado)
            # Em produção, isso seria controlado por scheduler
            
        except Exception as e:
            logger.error(f"Erro na atualização de risco diário: {e}")

def calculate_intraday_targets(df: pd.DataFrame, entry_price: float, direction: str, timeframe: str = '5m') -> Dict:
    """
    Função wrapper para cálculo rápido de alvos intradiários
    """
    risk_manager = IntradayRiskManager()
    atr = risk_manager.calculate_intraday_atr(df)
    
    if atr <= 0:
        return {}
    
    return risk_manager.intraday_risk_management(entry_price, atr, direction, timeframe)

def validate_intraday_risk(symbol: str, timeframe: str = '5m') -> bool:
    """
    Função wrapper para validação rápida de condições
    """
    risk_manager = IntradayRiskManager()
    return risk_manager.validate_intraday_conditions(symbol, timeframe)
