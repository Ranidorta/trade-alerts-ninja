# utils/macro_events_filter.py

from datetime import datetime, timedelta
import requests
import json
from utils.logger import logger

class MacroEventsFilter:
    def __init__(self):
        self.high_impact_events = [
            'FOMC', 'NFP', 'CPI', 'GDP', 'Employment', 'Interest Rate',
            'Central Bank', 'OPEC', 'Elections', 'Referendum'
        ]
        self.cache = {}
        self.cache_duration = timedelta(hours=1)
    
    def get_macro_events(self, symbol="BTCUSDT", hours_ahead=24):
        """
        Busca eventos macroeconômicos nas próximas horas
        Implementação simplificada - na produção usar API real como ForexFactory
        """
        try:
            cache_key = f"{symbol}_{hours_ahead}"
            now = datetime.utcnow()
            
            # Verifica cache
            if cache_key in self.cache:
                cached_time, cached_data = self.cache[cache_key]
                if now - cached_time < self.cache_duration:
                    return cached_data
            
            # Simula busca de eventos (implementação real usaria API)
            events = self._simulate_events_check(symbol, hours_ahead)
            
            # Atualiza cache
            self.cache[cache_key] = (now, events)
            
            return events
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar eventos macro: {e}")
            return []
    
    def _simulate_events_check(self, symbol, hours_ahead):
        """
        Simula verificação de eventos (substituir por API real)
        """
        # Implementação simplificada para demonstração
        # Na produção, isso faria uma chamada real para APIs como:
        # - ForexFactory Calendar API
        # - TradingEconomics API
        # - FinnHub Economic Calendar
        
        events = []
        
        # Simula alguns eventos baseados em horários conhecidos
        now = datetime.utcnow()
        
        # Exemplo: NFP sempre na primeira sexta-feira do mês às 12:30 UTC
        if now.weekday() == 4 and now.day <= 7:  # Primeira sexta-feira
            nfp_time = now.replace(hour=12, minute=30, second=0, microsecond=0)
            if abs((nfp_time - now).total_seconds()) <= hours_ahead * 3600:
                events.append({
                    'name': 'Non-Farm Payrolls (NFP)',
                    'impact': 'high',
                    'time': nfp_time,
                    'currency': 'USD'
                })
        
        # Exemplo: CPI sempre no dia 10-15 do mês às 12:30 UTC
        if 10 <= now.day <= 15:
            cpi_time = now.replace(hour=12, minute=30, second=0, microsecond=0)
            if abs((cpi_time - now).total_seconds()) <= hours_ahead * 3600:
                events.append({
                    'name': 'Consumer Price Index (CPI)',
                    'impact': 'high', 
                    'time': cpi_time,
                    'currency': 'USD'
                })
        
        return events
    
    def fundamental_filter(self, symbol="BTCUSDT", hours_ahead=4):
        """
        Filtra sinais baseado em eventos fundamentais próximos
        """
        try:
            upcoming_events = self.get_macro_events(symbol, hours_ahead)
            
            # Verifica se há eventos de alto impacto próximos
            high_impact_upcoming = [
                event for event in upcoming_events 
                if event.get('impact') == 'high'
            ]
            
            if high_impact_upcoming:
                logger.warning(f"🚨 BLOQUEIO FUNDAMENTAL: {len(high_impact_upcoming)} eventos de alto impacto nas próximas {hours_ahead}h")
                for event in high_impact_upcoming:
                    event_time = event.get('time', 'Unknown')
                    logger.warning(f"   - {event['name']} ({event.get('currency', 'N/A')}) às {event_time}")
                return False
            
            # Verifica eventos médio impacto para crypto
            if 'BTC' in symbol or 'ETH' in symbol:
                # Crypto é menos afetado por eventos tradicionais, mas ainda considera alguns
                critical_events = [
                    event for event in upcoming_events
                    if any(keyword in event['name'].upper() for keyword in ['INTEREST RATE', 'FOMC', 'CENTRAL BANK'])
                ]
                
                if critical_events:
                    logger.warning(f"⚠️ CUIDADO: {len(critical_events)} eventos críticos para crypto nas próximas {hours_ahead}h")
                    return True  # Permite, mas com cuidado
            
            logger.info(f"✅ Fundamental filter: Nenhum evento crítico nas próximas {hours_ahead}h")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro no filtro fundamental: {e}")
            return True  # Em caso de erro, permite o trade
    
    def is_market_holiday(self):
        """
        Verifica se é feriado em mercados principais
        """
        try:
            now = datetime.utcnow()
            
            # Lista de feriados conhecidos (simplificada)
            holidays = [
                (12, 25),  # Natal
                (1, 1),    # Ano Novo
                (7, 4),    # Independência dos EUA
            ]
            
            current_date = (now.month, now.day)
            is_holiday = current_date in holidays
            
            if is_holiday:
                logger.warning(f"🏖️ FERIADO detectado: {current_date}")
            
            return is_holiday
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar feriados: {e}")
            return False
    
    def get_market_session(self):
        """
        Identifica a sessão de mercado atual
        """
        try:
            now = datetime.utcnow()
            hour = now.hour
            
            # Sessões de mercado (UTC)
            if 0 <= hour < 8:
                return "ASIA"
            elif 8 <= hour < 16:
                return "LONDON"
            elif 16 <= hour < 24:
                return "NEW_YORK"
            else:
                return "OFF_HOURS"
                
        except Exception as e:
            logger.error(f"❌ Erro ao identificar sessão: {e}")
            return "UNKNOWN"

def check_fundamental_filter(symbol="BTCUSDT"):
    """
    Função wrapper para verificar filtro fundamental
    """
    filter_instance = MacroEventsFilter()
    return filter_instance.fundamental_filter(symbol)

def is_safe_trading_time():
    """
    Verifica se é um horário seguro para trading
    """
    filter_instance = MacroEventsFilter()
    
    # Não é feriado E não há eventos críticos
    safe_time = not filter_instance.is_market_holiday()
    
    # Evita horários de muito baixa liquidez (fins de semana para forex)
    now = datetime.utcnow()
    is_weekend = now.weekday() >= 5  # Sábado ou Domingo
    
    if is_weekend:
        logger.info("⏰ Fim de semana - liquidez reduzida para alguns ativos")
        # Para crypto, fim de semana é OK, para forex não
        return True
    
    return safe_time