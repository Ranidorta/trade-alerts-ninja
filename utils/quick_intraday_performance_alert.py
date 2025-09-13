
"""
Quick Intraday Performance Alert - Monitoramento rápido de performance
Sistema de alertas para proteger contra sequências de perdas intradiárias
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from utils.logger import logger

class IntradayPerformanceMonitor:
    def __init__(self, alert_threshold: float = 0.5):
        self.alert_threshold = alert_threshold  # 50% de perda
        self.max_consecutive_losses = 3
        self.max_daily_trades = 10
        self.performance_file = "data/intraday_performance.json"
        self.alerts_sent = []
        
        # Carrega dados existentes
        self.performance_data = self._load_performance_data()
    
    def _load_performance_data(self) -> Dict:
        """
        Carrega dados de performance do arquivo
        """
        try:
            if os.path.exists(self.performance_file):
                with open(self.performance_file, 'r') as f:
                    return json.load(f)
            return {
                'trades': [],
                'daily_stats': {},
                'alerts': []
            }
        except Exception as e:
            logger.error(f"Erro ao carregar dados de performance: {e}")
            return {'trades': [], 'daily_stats': {}, 'alerts': []}
    
    def _save_performance_data(self):
        """
        Salva dados de performance no arquivo
        """
        try:
            os.makedirs(os.path.dirname(self.performance_file), exist_ok=True)
            with open(self.performance_file, 'w') as f:
                json.dump(self.performance_data, f, indent=2)
        except Exception as e:
            logger.error(f"Erro ao salvar dados de performance: {e}")
    
    def record_trade_result(self, symbol: str, result: str, profit_loss: float, timeframe: str):
        """
        Registra resultado de um trade
        """
        try:
            trade_record = {
                'timestamp': datetime.utcnow().isoformat(),
                'symbol': symbol,
                'result': result,
                'profit_loss': profit_loss,
                'timeframe': timeframe,
                'date': datetime.utcnow().strftime('%Y-%m-%d')
            }
            
            self.performance_data['trades'].append(trade_record)
            self._update_daily_stats(trade_record)
            self._save_performance_data()
            
            # Verifica se precisa enviar alertas
            self._check_performance_alerts()
            
        except Exception as e:
            logger.error(f"Erro ao registrar resultado do trade: {e}")
    
    def _update_daily_stats(self, trade_record: Dict):
        """
        Atualiza estatísticas diárias
        """
        try:
            date = trade_record['date']
            
            if date not in self.performance_data['daily_stats']:
                self.performance_data['daily_stats'][date] = {
                    'total_trades': 0,
                    'wins': 0,
                    'losses': 0,
                    'total_pnl': 0.0,
                    'consecutive_losses': 0,
                    'max_consecutive_losses': 0
                }
            
            stats = self.performance_data['daily_stats'][date]
            stats['total_trades'] += 1
            stats['total_pnl'] += trade_record['profit_loss']
            
            if trade_record['result'] in ['WIN', 'WINNER', 'PARTIAL']:
                stats['wins'] += 1
                stats['consecutive_losses'] = 0
            else:
                stats['losses'] += 1
                stats['consecutive_losses'] += 1
                stats['max_consecutive_losses'] = max(
                    stats['max_consecutive_losses'],
                    stats['consecutive_losses']
                )
            
        except Exception as e:
            logger.error(f"Erro ao atualizar estatísticas diárias: {e}")
    
    def _check_performance_alerts(self):
        """
        Verifica se deve enviar alertas de performance
        """
        try:
            today = datetime.utcnow().strftime('%Y-%m-%d')
            daily_stats = self.performance_data['daily_stats'].get(today, {})
            
            if not daily_stats:
                return
            
            wins = daily_stats.get('wins', 0)
            losses = daily_stats.get('losses', 0)
            total_trades = wins + losses
            consecutive_losses = daily_stats.get('consecutive_losses', 0)
            total_pnl = daily_stats.get('total_pnl', 0)
            
            alerts_to_send = []
            
            # Alert por taxa de perda alta
            if total_trades >= 3:
                loss_rate = losses / total_trades
                if loss_rate >= self.alert_threshold:
                    alerts_to_send.append({
                        'type': 'HIGH_LOSS_RATE',
                        'message': f"⚠️ Alta taxa de perda intradiária: {loss_rate:.1%} ({losses}/{total_trades})",
                        'severity': 'HIGH'
                    })
            
            # Alert por perdas consecutivas
            if consecutive_losses >= self.max_consecutive_losses:
                alerts_to_send.append({
                    'type': 'CONSECUTIVE_LOSSES',
                    'message': f"🚨 {consecutive_losses} perdas consecutivas detectadas. Considere parar operações.",
                    'severity': 'CRITICAL'
                })
            
            # Alert por muitos trades no dia
            if total_trades >= self.max_daily_trades:
                alerts_to_send.append({
                    'type': 'EXCESSIVE_TRADING',
                    'message': f"📊 Muitos trades hoje: {total_trades}. Possível overtrading.",
                    'severity': 'WARNING'
                })
            
            # Alert por PnL negativo significativo
            if total_pnl < -500:  # Perda de $500 (ajustar conforme necessário)
                alerts_to_send.append({
                    'type': 'SIGNIFICANT_LOSS',
                    'message': f"💸 Perda diária significativa: ${total_pnl:.2f}",
                    'severity': 'HIGH'
                })
            
            # Envia alertas
            for alert in alerts_to_send:
                self._send_alert(alert)
            
        except Exception as e:
            logger.error(f"Erro na verificação de alertas: {e}")
    
    def _send_alert(self, alert: Dict):
        """
        Envia alerta (implementação simplificada)
        """
        try:
            alert_key = f"{alert['type']}_{datetime.utcnow().strftime('%Y-%m-%d')}"
            
            # Evita spam de alertas
            if alert_key in self.alerts_sent:
                return
            
            self.alerts_sent.append(alert_key)
            
            # Log do alerta
            logger.warning(f"🚨 ALERTA INTRADIÁRIO: {alert['message']}")
            
            # Salva alerta no histórico
            alert_record = {
                'timestamp': datetime.utcnow().isoformat(),
                'type': alert['type'],
                'message': alert['message'],
                'severity': alert['severity']
            }
            
            self.performance_data['alerts'].append(alert_record)
            self._save_performance_data()
            
            # Em produção, aqui enviaria por Telegram/Discord/Email
            
        except Exception as e:
            logger.error(f"Erro ao enviar alerta: {e}")
    
    def get_current_performance(self) -> Dict:
        """
        Retorna performance atual do dia
        """
        try:
            today = datetime.utcnow().strftime('%Y-%m-%d')
            daily_stats = self.performance_data['daily_stats'].get(today, {})
            
            wins = daily_stats.get('wins', 0)
            losses = daily_stats.get('losses', 0)
            total_trades = wins + losses
            
            if total_trades == 0:
                return {
                    'total_trades': 0,
                    'win_rate': 0.0,
                    'total_pnl': 0.0,
                    'consecutive_losses': 0,
                    'status': 'NO_TRADES'
                }
            
            win_rate = wins / total_trades
            total_pnl = daily_stats.get('total_pnl', 0)
            consecutive_losses = daily_stats.get('consecutive_losses', 0)
            
            # Determina status
            if consecutive_losses >= self.max_consecutive_losses:
                status = 'CRITICAL'
            elif win_rate < self.alert_threshold:
                status = 'WARNING'
            elif total_pnl > 0:
                status = 'GOOD'
            else:
                status = 'NEUTRAL'
            
            return {
                'total_trades': total_trades,
                'wins': wins,
                'losses': losses,
                'win_rate': win_rate,
                'total_pnl': total_pnl,
                'consecutive_losses': consecutive_losses,
                'status': status
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter performance atual: {e}")
            return {}
    
    def should_stop_trading(self) -> bool:
        """
        Determina se deve parar de operar com base na performance
        """
        try:
            performance = self.get_current_performance()
            
            if not performance:
                return False
            
            # Para se muitas perdas consecutivas
            if performance.get('consecutive_losses', 0) >= self.max_consecutive_losses:
                logger.warning("🛑 Parando operações: muitas perdas consecutivas")
                return True
            
            # Para se taxa de perda muito alta
            if (performance.get('total_trades', 0) >= 5 and 
                performance.get('win_rate', 1) < 0.3):
                logger.warning("🛑 Parando operações: taxa de perda muito alta")
                return True
            
            # Para se perda financeira muito grande
            if performance.get('total_pnl', 0) < -1000:
                logger.warning("🛑 Parando operações: perda financeira excessiva")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Erro ao verificar se deve parar: {e}")
            return False

# Instância global
intraday_monitor = IntradayPerformanceMonitor()

def quick_intraday_performance_alert(wins: int, losses: int):
    """
    Função wrapper para alerta rápido de performance
    
    Args:
        wins: Número de trades ganhos
        losses: Número de trades perdidos
    """
    try:
        total_trades = wins + losses
        if total_trades == 0:
            return
        
        loss_rate = losses / total_trades
        
        if losses >= 2 and loss_rate > 0.5:
            message = f"⚠️ Alta taxa de perda intradiária detectada: {loss_rate:.1%} ({losses}/{total_trades}). Revise os critérios imediatamente."
            logger.warning(message)
            
            # Registra alerta
            alert_record = {
                'timestamp': datetime.utcnow().isoformat(),
                'type': 'QUICK_ALERT',
                'message': message,
                'wins': wins,
                'losses': losses,
                'loss_rate': loss_rate
            }
            
            # Em produção, salvaria em arquivo ou enviaria notificação
            
    except Exception as e:
        logger.error(f"Erro no alerta rápido: {e}")

def record_intraday_trade(symbol: str, result: str, profit_loss: float = 0.0, timeframe: str = '5m'):
    """
    Função wrapper para registrar trade intradiário
    """
    intraday_monitor.record_trade_result(symbol, result, profit_loss, timeframe)

def get_intraday_status() -> Dict:
    """
    Função wrapper para obter status atual
    """
    return intraday_monitor.get_current_performance()

def should_halt_intraday_trading() -> bool:
    """
    Função wrapper para verificar se deve parar
    """
    return intraday_monitor.should_stop_trading()
