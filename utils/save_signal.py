import json
import os
import logging
from datetime import datetime
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

def save_signal(signal, folder='signals'):
    """
    Salva sinal em arquivo JSON e registra métricas de R/R
    """
    try:
        os.makedirs(folder, exist_ok=True)
        
        # Gera nome do arquivo único
        timestamp_safe = signal.get('timestamp', datetime.utcnow().isoformat()).replace(':', '-')
        path = os.path.join(folder, f"{signal['symbol']}_{timestamp_safe}.json")
        
        # Adiciona métricas de R/R se não estiverem presentes
        if 'expected_rr' not in signal and all(key in signal for key in ['entry_price', 'sl', 'tp']):
            risk = abs(signal['entry_price'] - signal['sl'])
            reward = abs(signal['tp'] - signal['entry_price'])
            signal['expected_rr'] = round(reward / risk if risk > 0 else 0, 2)
            signal['risk_amount'] = round(risk, 6)
            signal['reward_amount'] = round(reward, 6)
        
        # Salva o sinal
        with open(path, 'w') as f:
            json.dump(signal, f, indent=2)
        
        # Log detalhado do R/R esperado
        strategy = signal.get('strategy', 'unknown')
        expected_rr = signal.get('expected_rr', 0)
        
        logger.info(f"💾 Sinal salvo: {strategy.upper()} - {signal['symbol']}")
        logger.info(f"   📊 R/R Esperado: {expected_rr:.2f}")
        logger.info(f"   📁 Arquivo: {path}")
        
        return True
        
    except Exception as e:
        logger.error(f"Erro ao salvar sinal: {e}")
        return False

def generate_metrics_report() -> Tuple[Optional[float], Optional[int]]:
    """
    Gera relatório de métricas de performance básicas
    Procura arquivos de sinais salvos e calcula estatísticas
    """
    try:
        from utils.performance_tracker import generate_metrics_report as generate_full_report
        
        # Usa o sistema completo de performance tracking
        full_report = generate_full_report()
        
        if 'agents' in full_report:
            # Combina estatísticas de todos os agentes
            total_trades = 0
            total_wins = 0
            
            for agent_name, metrics in full_report['agents'].items():
                if isinstance(metrics, dict) and 'total_trades' in str(metrics):
                    # Parse das métricas do agente
                    try:
                        agent_trades = metrics.get('total_trades', 0)
                        win_rate_str = metrics.get('win_rate', '0%')
                        win_rate = float(win_rate_str.replace('%', '')) / 100
                        
                        total_trades += agent_trades
                        total_wins += int(agent_trades * win_rate)
                        
                        logger.info(f"📊 {agent_name}: {agent_trades} trades, {win_rate_str} win rate")
                    except (ValueError, TypeError):
                        continue
            
            overall_win_rate = total_wins / total_trades if total_trades > 0 else 0
            
            logger.info(f"📈 Resumo Geral: {overall_win_rate:.2%} win rate em {total_trades} trades")
            return overall_win_rate, total_trades
        
        return None, None
        
    except Exception as e:
        logger.error(f"Erro ao gerar relatório de métricas: {e}")
        return None, None
