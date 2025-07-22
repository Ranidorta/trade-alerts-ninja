"""
Performance Tracker - Sistema de monitoramento de performance para agentes de sinais
Rastreia métricas de R/R, lucro médio, perdas médias e taxa de acerto por agente
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """Métricas de performance para um agente"""
    agent_name: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    avg_rr_ratio: float
    avg_profit: float
    avg_loss: float
    total_profit: float
    total_loss: float
    net_result: float
    consecutive_losses: int
    consecutive_wins: int
    best_trade: float
    worst_trade: float
    last_updated: str

class PerformanceTracker:
    def __init__(self, db_path: str = "performance.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Inicializa o banco de dados de performance"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_name TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    trade_id TEXT UNIQUE NOT NULL,
                    direction TEXT NOT NULL,
                    entry_price REAL NOT NULL,
                    exit_price REAL,
                    stop_loss REAL NOT NULL,
                    take_profit REAL NOT NULL,
                    atr REAL NOT NULL,
                    expected_rr REAL NOT NULL,
                    actual_rr REAL,
                    profit_loss REAL,
                    result TEXT,
                    timestamp TEXT NOT NULL,
                    closed_at TEXT,
                    notes TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_statistics (
                    agent_name TEXT PRIMARY KEY,
                    total_trades INTEGER DEFAULT 0,
                    winning_trades INTEGER DEFAULT 0,
                    losing_trades INTEGER DEFAULT 0,
                    consecutive_losses INTEGER DEFAULT 0,
                    consecutive_wins INTEGER DEFAULT 0,
                    total_profit REAL DEFAULT 0.0,
                    total_loss REAL DEFAULT 0.0,
                    last_updated TEXT
                )
            """)
    
    def calculate_expected_rr(self, entry_price: float, stop_loss: float, take_profit: float) -> float:
        """Calcula o Risk/Reward esperado do trade"""
        risk = abs(entry_price - stop_loss)
        reward = abs(take_profit - entry_price)
        return reward / risk if risk > 0 else 0
    
    def log_trade_opened(self, signal: Dict) -> bool:
        """Registra abertura de um novo trade"""
        try:
            agent_name = signal.get('strategy', 'unknown')
            expected_rr = self.calculate_expected_rr(
                signal['entry_price'], 
                signal['sl'], 
                signal.get('tp', signal.get('tp3', signal['sl']))
            )
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO agent_performance (
                        agent_name, symbol, trade_id, direction, entry_price,
                        stop_loss, take_profit, atr, expected_rr, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    agent_name,
                    signal['symbol'],
                    signal.get('id', f"{signal['symbol']}_{datetime.now().isoformat()}"),
                    signal['direction'],
                    signal['entry_price'],
                    signal['sl'],
                    signal.get('tp', signal.get('tp3', signal['sl'])),
                    signal.get('atr', 0),
                    expected_rr,
                    signal.get('timestamp', datetime.now().isoformat())
                ))
            
            logger.info(f"📊 Trade registrado: {agent_name} - {signal['symbol']} R/R esperado: {expected_rr:.2f}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao registrar trade: {e}")
            return False
    
    def log_trade_closed(self, trade_id: str, exit_price: float, result: str) -> bool:
        """Registra fechamento de um trade"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Busca dados do trade
                cursor.execute("""
                    SELECT agent_name, entry_price, stop_loss, take_profit, direction
                    FROM agent_performance WHERE trade_id = ?
                """, (trade_id,))
                
                trade_data = cursor.fetchone()
                if not trade_data:
                    logger.warning(f"Trade {trade_id} não encontrado")
                    return False
                
                agent_name, entry_price, stop_loss, take_profit, direction = trade_data
                
                # Calcula R/R real e P&L
                if direction == "BUY":
                    profit_loss = exit_price - entry_price
                else:
                    profit_loss = entry_price - exit_price
                
                risk = abs(entry_price - stop_loss)
                actual_rr = abs(profit_loss) / risk if risk > 0 else 0
                if profit_loss < 0:
                    actual_rr = -actual_rr
                
                # Atualiza o trade
                conn.execute("""
                    UPDATE agent_performance 
                    SET exit_price = ?, actual_rr = ?, profit_loss = ?, 
                        result = ?, closed_at = ?
                    WHERE trade_id = ?
                """, (exit_price, actual_rr, profit_loss, result, datetime.now().isoformat(), trade_id))
                
                # Atualiza estatísticas do agente
                self._update_agent_statistics(agent_name, profit_loss, result)
                
            logger.info(f"📊 Trade fechado: {trade_id} - R/R real: {actual_rr:.2f}, P&L: {profit_loss:.6f}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao fechar trade: {e}")
            return False
    
    def _update_agent_statistics(self, agent_name: str, profit_loss: float, result: str):
        """Atualiza estatísticas acumuladas do agente"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Busca estatísticas atuais
            cursor.execute("SELECT * FROM agent_statistics WHERE agent_name = ?", (agent_name,))
            stats = cursor.fetchone()
            
            if stats:
                (_, total_trades, winning_trades, losing_trades, 
                 consecutive_losses, consecutive_wins, total_profit, total_loss, _) = stats
            else:
                total_trades = winning_trades = losing_trades = 0
                consecutive_losses = consecutive_wins = 0
                total_profit = total_loss = 0.0
            
            # Atualiza contadores
            total_trades += 1
            
            if result in ['WIN', 'WINNER', 'PROFIT']:
                winning_trades += 1
                total_profit += abs(profit_loss)
                consecutive_wins += 1
                consecutive_losses = 0
            else:
                losing_trades += 1
                total_loss += abs(profit_loss)
                consecutive_losses += 1
                consecutive_wins = 0
            
            # Salva estatísticas atualizadas
            conn.execute("""
                INSERT OR REPLACE INTO agent_statistics (
                    agent_name, total_trades, winning_trades, losing_trades,
                    consecutive_losses, consecutive_wins, total_profit, total_loss, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent_name, total_trades, winning_trades, losing_trades,
                consecutive_losses, consecutive_wins, total_profit, total_loss,
                datetime.now().isoformat()
            ))
    
    def get_agent_metrics(self, agent_name: str, days: int = 30) -> Optional[PerformanceMetrics]:
        """Obtém métricas detalhadas de um agente"""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Busca trades do período
                cursor.execute("""
                    SELECT actual_rr, profit_loss, result, timestamp
                    FROM agent_performance 
                    WHERE agent_name = ? AND timestamp >= ? AND result IS NOT NULL
                    ORDER BY timestamp DESC
                """, (agent_name, cutoff_date))
                
                trades = cursor.fetchall()
                
                if not trades:
                    return None
                
                # Calcula métricas
                total_trades = len(trades)
                winning_trades = len([t for t in trades if t[2] in ['WIN', 'WINNER', 'PROFIT']])
                losing_trades = total_trades - winning_trades
                win_rate = winning_trades / total_trades if total_trades > 0 else 0
                
                # R/R médio
                rr_values = [t[0] for t in trades if t[0] is not None]
                avg_rr_ratio = sum(rr_values) / len(rr_values) if rr_values else 0
                
                # Lucros e perdas
                profits = [t[1] for t in trades if t[1] > 0]
                losses = [t[1] for t in trades if t[1] < 0]
                
                avg_profit = sum(profits) / len(profits) if profits else 0
                avg_loss = abs(sum(losses) / len(losses)) if losses else 0
                total_profit = sum(profits)
                total_loss = abs(sum(losses))
                net_result = total_profit - total_loss
                
                best_trade = max([t[1] for t in trades]) if trades else 0
                worst_trade = min([t[1] for t in trades]) if trades else 0
                
                # Consecutivas atuais
                cursor.execute("SELECT consecutive_losses, consecutive_wins FROM agent_statistics WHERE agent_name = ?", (agent_name,))
                consecutive_data = cursor.fetchone()
                consecutive_losses, consecutive_wins = consecutive_data if consecutive_data else (0, 0)
                
                return PerformanceMetrics(
                    agent_name=agent_name,
                    total_trades=total_trades,
                    winning_trades=winning_trades,
                    losing_trades=losing_trades,
                    win_rate=win_rate,
                    avg_rr_ratio=avg_rr_ratio,
                    avg_profit=avg_profit,
                    avg_loss=avg_loss,
                    total_profit=total_profit,
                    total_loss=total_loss,
                    net_result=net_result,
                    consecutive_losses=consecutive_losses,
                    consecutive_wins=consecutive_wins,
                    best_trade=best_trade,
                    worst_trade=worst_trade,
                    last_updated=datetime.now().isoformat()
                )
                
        except Exception as e:
            logger.error(f"Erro ao obter métricas do agente {agent_name}: {e}")
            return None
    
    def generate_performance_report(self) -> Dict:
        """Gera relatório completo de performance"""
        try:
            agents = ['monster_v2_advanced', 'intraday_signal']
            report = {
                'generated_at': datetime.now().isoformat(),
                'agents': {}
            }
            
            for agent in agents:
                metrics = self.get_agent_metrics(agent)
                if metrics:
                    report['agents'][agent] = {
                        'total_trades': metrics.total_trades,
                        'win_rate': f"{metrics.win_rate:.2%}",
                        'avg_rr_ratio': f"{metrics.avg_rr_ratio:.2f}",
                        'avg_profit': f"{metrics.avg_profit:.6f}",
                        'avg_loss': f"{metrics.avg_loss:.6f}",
                        'net_result': f"{metrics.net_result:.6f}",
                        'consecutive_losses': metrics.consecutive_losses,
                        'status': 'SAFE_MODE' if metrics.consecutive_losses >= 3 else 'ACTIVE'
                    }
                else:
                    report['agents'][agent] = {'status': 'NO_DATA'}
            
            logger.info("📊 Relatório de performance gerado")
            return report
            
        except Exception as e:
            logger.error(f"Erro ao gerar relatório: {e}")
            return {'error': str(e)}

# Instância global
performance_tracker = PerformanceTracker()

def log_signal_opened(signal: Dict) -> bool:
    """Função wrapper para registrar abertura de sinal"""
    return performance_tracker.log_trade_opened(signal)

def log_signal_closed(trade_id: str, exit_price: float, result: str) -> bool:
    """Função wrapper para registrar fechamento de sinal"""
    return performance_tracker.log_trade_closed(trade_id, exit_price, result)

def get_agent_performance(agent_name: str) -> Optional[PerformanceMetrics]:
    """Função wrapper para obter performance de um agente"""
    return performance_tracker.get_agent_metrics(agent_name)

def generate_metrics_report() -> Dict:
    """Função wrapper para gerar relatório de métricas"""
    return performance_tracker.generate_performance_report()