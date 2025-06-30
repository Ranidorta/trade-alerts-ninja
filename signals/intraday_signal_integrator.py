
"""
Intraday Signal Integrator - Integração dos módulos de Day Trade
Orquestra todas as validações rápidas para geração de sinais intradiários
"""

import pandas as pd
from typing import Dict, Optional
from datetime import datetime
from utils.logger import logger
from api.fetch_data import fetch_data

# Importa os novos módulos
from signals.quick_timeframe_validation import validate_quick_trend_alignment, get_ema_cross_signal_strength
from signals.order_book_validator import validate_order_book_support, get_market_depth_score
from signals.quick_candle_reversal import validate_reversal_signal, get_candle_reversal_score
from signals.rapid_volume_spike import validate_volume_support, get_institutional_flow_score
from signals.quick_momentum_validator import validate_momentum_alignment, get_momentum_score
from core.intraday_risk_management import calculate_intraday_targets, validate_intraday_risk
from utils.quick_intraday_performance_alert import should_halt_intraday_trading, record_intraday_trade

class IntradaySignalGenerator:
    def __init__(self):
        self.min_combined_score = 0.65  # Score mínimo para aprovação
        self.required_validations = 4   # Mínimo de validações aprovadas
        
    def generate_intraday_signal(self, symbol: str) -> Optional[Dict]:
        """
        Gera sinal integrado para Day Trade usando todas as validações rápidas
        
        Args:
            symbol: Par de trading (ex: 'BTCUSDT')
        
        Returns:
            dict: Sinal completo ou None se não aprovado
        """
        try:
            logger.info(f"🔍 [INTRADAY] Analisando {symbol} com validações rápidas...")
            
            # 1. VERIFICAÇÕES PRELIMINARES
            if should_halt_intraday_trading():
                logger.warning(f"🛑 Trading intradiário suspenso por performance")
                return None
            
            if not validate_intraday_risk(symbol, '5m'):
                logger.warning(f"🛑 Condições de risco intradiário não adequadas")
                return None
            
            # 2. OBTER DADOS MULTI-TIMEFRAME
            df_1m = fetch_data(symbol, "1m", limit=100)
            df_5m = fetch_data(symbol, "5m", limit=100)
            df_15m = fetch_data(symbol, "15m", limit=100)
            
            if df_1m.empty or df_5m.empty or df_15m.empty:
                logger.warning(f"Dados insuficientes para {symbol}")
                return None
            
            # 3. ANÁLISE DE DIREÇÃO BASEADA EM MOMENTUM
            momentum_analysis = self._analyze_primary_direction(df_5m)
            if not momentum_analysis or momentum_analysis['direction'] == 'NEUTRAL':
                logger.info(f"🛑 Direção indefinida para {symbol}")
                return None
            
            intended_direction = momentum_analysis['direction']
            logger.info(f"🎯 Direção pretendida: {intended_direction}")
            
            # 4. EXECUTA TODAS AS VALIDAÇÕES RÁPIDAS
            validations = self._run_all_validations(
                df_1m, df_5m, df_15m, symbol, intended_direction
            )
            
            # 5. CALCULA SCORES E VERIFICA APROVAÇÃO
            combined_score, approval_result = self._evaluate_validations(validations)
            
            if not approval_result['approved']:
                logger.info(f"🛑 Sinal não aprovado: {approval_result['reason']}")
                return None
            
            # 6. CALCULA NÍVEIS DE ENTRADA E SAÍDA
            entry_price = df_5m['close'].iloc[-1]
            risk_levels = calculate_intraday_targets(
                df_5m, entry_price, intended_direction, '5m'
            )
            
            if not risk_levels:
                logger.error(f"Erro no cálculo de níveis de risco")
                return None
            
            # 7. MONTA SINAL FINAL
            signal = {
                'symbol': symbol,
                'direction': intended_direction,
                'entry_price': round(entry_price, 6),
                'stop_loss': risk_levels['stop_loss'],
                'take_profits': risk_levels['take_profits'],
                'tp1': risk_levels['take_profits'][0],
                'tp2': risk_levels['take_profits'][1], 
                'tp3': risk_levels['take_profits'][2],
                'rr_ratios': risk_levels['rr_ratios'],
                'atr': risk_levels['atr_used'],
                'timestamp': datetime.utcnow().isoformat(),
                'timeframe': 'intraday_5m',
                'strategy': 'intraday_integrated',
                'combined_score': round(combined_score, 3),
                'validations_passed': approval_result['validations_passed'],
                'validations_details': validations,
                'expires': (datetime.utcnow().timestamp() + 300)  # 5 minutos
            }
            
            # 8. LOG DE SUCESSO
            logger.info(f"✅ SINAL INTRADIÁRIO gerado para {symbol}:")
            logger.info(f"   🎯 {signal['direction']} @ {signal['entry_price']}")
            logger.info(f"   📊 Score: {combined_score:.3f}, Validações: {approval_result['validations_passed']}/{len(validations)}")
            logger.info(f"   💰 RR: {risk_levels['rr_ratios'][0]:.2f} | {risk_levels['rr_ratios'][1]:.2f} | {risk_levels['rr_ratios'][2]:.2f}")
            
            return signal
            
        except Exception as e:
            logger.exception(f"Erro na geração de sinal intradiário para {symbol}")
            return None
    
    def _analyze_primary_direction(self, df: pd.DataFrame) -> Optional[Dict]:
        """
        Analisa direção primária baseada em momentum
        """
        try:
            from signals.quick_momentum_validator import analyze_momentum_confluence
            
            momentum = analyze_momentum_confluence(df)
            if not momentum:
                return None
            
            primary_signal = momentum.get('primary_signal', 'NEUTRAL')
            confluence = max(
                momentum.get('bullish_confluence', 0),
                momentum.get('bearish_confluence', 0)
            )
            
            # Converte sinal para direção padrão
            if primary_signal == 'LONG':
                direction = 'BUY'
            elif primary_signal == 'SHORT':
                direction = 'SELL'
            else:
                direction = 'NEUTRAL'
            
            return {
                'direction': direction,
                'confidence': confluence,
                'momentum_data': momentum
            }
            
        except Exception as e:
            logger.error(f"Erro na análise de direção: {e}")
            return None
    
    def _run_all_validations(self, df_1m: pd.DataFrame, df_5m: pd.DataFrame, 
                           df_15m: pd.DataFrame, symbol: str, direction: str) -> Dict:
        """
        Executa todas as validações rápidas
        """
        validations = {}
        
        try:
            # 1. Validação de tendência rápida (1m/5m)
            validations['quick_trend'] = {
                'passed': validate_quick_trend_alignment(df_1m, df_5m, direction),
                'score': get_ema_cross_signal_strength(df_5m),
                'weight': 0.20
            }
            
            # 2. Validação do book de ordens
            validations['order_book'] = {
                'passed': validate_order_book_support(symbol, 'LONG' if direction == 'BUY' else 'SHORT'),
                'score': get_market_depth_score(symbol),
                'weight': 0.15
            }
            
            # 3. Validação de padrões de candle
            validations['candle_reversal'] = {
                'passed': validate_reversal_signal(df_5m, direction),
                'score': get_candle_reversal_score(df_5m),
                'weight': 0.15
            }
            
            # 4. Validação de volume spike
            validations['volume_spike'] = {
                'passed': validate_volume_support(df_5m, direction),
                'score': get_institutional_flow_score(df_5m),
                'weight': 0.20
            }
            
            # 5. Validação de momentum
            validations['momentum'] = {
                'passed': validate_momentum_alignment(df_5m, direction),
                'score': get_momentum_score(df_5m),
                'weight': 0.30
            }
            
            logger.info(f"📋 Validações executadas: {len(validations)}")
            for name, validation in validations.items():
                status = "✅" if validation['passed'] else "❌"
                logger.info(f"   {status} {name}: {validation['score']:.3f}")
            
            return validations
            
        except Exception as e:
            logger.error(f"Erro na execução das validações: {e}")
            return validations
    
    def _evaluate_validations(self, validations: Dict) -> tuple[float, Dict]:
        """
        Avalia validações e calcula score combinado
        """
        try:
            if not validations:
                return 0.0, {'approved': False, 'reason': 'Nenhuma validação executada'}
            
            # Calcula score ponderado
            total_weighted_score = 0.0
            total_weight = 0.0
            validations_passed = 0
            
            for name, validation in validations.items():
                if validation.get('passed', False):
                    validations_passed += 1
                
                score = validation.get('score', 0.0)
                weight = validation.get('weight', 0.2)
                
                total_weighted_score += score * weight
                total_weight += weight
            
            combined_score = total_weighted_score / total_weight if total_weight > 0 else 0.0
            
            # Critérios de aprovação
            min_validations_passed = self.required_validations
            min_score = self.min_combined_score
            
            approved = (
                validations_passed >= min_validations_passed and
                combined_score >= min_score
            )
            
            if not approved:
                if validations_passed < min_validations_passed:
                    reason = f"Poucas validações aprovadas: {validations_passed}/{len(validations)}"
                else:
                    reason = f"Score insuficiente: {combined_score:.3f} < {min_score}"
            else:
                reason = "Aprovado"
            
            return combined_score, {
                'approved': approved,
                'reason': reason,
                'validations_passed': validations_passed,
                'total_validations': len(validations),
                'combined_score': combined_score
            }
            
        except Exception as e:
            logger.error(f"Erro na avaliação das validações: {e}")
            return 0.0, {'approved': False, 'reason': f'Erro na avaliação: {e}'}

# Instância global
intraday_generator = IntradaySignalGenerator()

def generate_intraday_signal(symbol: str) -> Optional[Dict]:
    """
    Função wrapper para geração de sinal intradiário
    """
    return intraday_generator.generate_intraday_signal(symbol)

def test_intraday_system(symbols: list = None) -> Dict:
    """
    Testa o sistema intradiário com múltiplos símbolos
    """
    if symbols is None:
        symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
    
    results = {}
    signals_generated = 0
    
    for symbol in symbols:
        logger.info(f"🧪 Testando sistema intradiário para {symbol}")
        signal = generate_intraday_signal(symbol)
        
        results[symbol] = {
            'signal_generated': signal is not None,
            'signal_data': signal
        }
        
        if signal:
            signals_generated += 1
    
    logger.info(f"🏁 Teste concluído: {signals_generated}/{len(symbols)} sinais gerados")
    
    return {
        'total_symbols': len(symbols),
        'signals_generated': signals_generated,
        'success_rate': signals_generated / len(symbols) if symbols else 0,
        'results': results
    }
