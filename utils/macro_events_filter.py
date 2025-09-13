# utils/macro_events_filter.py

from datetime import datetime, timedelta
import requests
import json
from utils.logger import logger

class MacroEventsFilter:
    def __init__(self):
        self.high_impact_events = [
            'Non-Farm Employment Change', 'Non-Farm Payrolls', 'NFP',
            'Consumer Price Index', 'CPI', 'Core CPI',
            'Federal Funds Rate', 'Interest Rate Decision', 'FOMC',
            'Gross Domestic Product', 'GDP', 'Core GDP',
            'Unemployment Rate', 'Employment Change',
            'Central Bank Rate Decision', 'ECB Rate Decision',
            'Bank of England Rate', 'Bank of Japan Rate'
        ]
        self.cache = {}
        self.cache_duration = timedelta(hours=1)
        self.forexfactory_url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
    
    def get_real_macro_events(self, hours_ahead=4):
        """
        Busca eventos reais da API do ForexFactory
        """
        try:
            cache_key = f"real_events_{hours_ahead}"
            now = datetime.utcnow()
            
            # Verifica cache
            if cache_key in self.cache:
                cached_time, cached_data = self.cache[cache_key]
                if now - cached_time < self.cache_duration:
                    logger.info(f"📋 Usando eventos macro do cache ({len(cached_data)} eventos)")
                    return cached_data
            
            # Faz request para ForexFactory
            logger.info("🌐 Buscando eventos macro reais da ForexFactory...")
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
            
            response = requests.get(self.forexfactory_url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.warning(f"⚠️ ForexFactory API retornou status {response.status_code}")
                return self._fallback_events_check(hours_ahead)
            
            events_data = response.json()
            upcoming_events = []
            
            cutoff_time = now + timedelta(hours=hours_ahead)
            
            for event in events_data:
                try:
                    # Parse event time
                    event_time_str = event.get('date', '') + ' ' + event.get('time', '')
                    if not event_time_str or event_time_str.strip() == ' ':
                        continue
                    
                    event_time = datetime.strptime(event_time_str.strip(), '%m-%d-%Y %I:%M%p')
                    event_time = event_time.replace(year=now.year)
                    
                    # Check if event is in our timeframe
                    if now <= event_time <= cutoff_time:
                        impact = event.get('impact', '').upper()
                        title = event.get('title', '').upper()
                        
                        # Check if it's a high impact event we care about
                        is_high_impact = impact == 'HIGH' or any(
                            keyword.upper() in title for keyword in self.high_impact_events
                        )
                        
                        if is_high_impact:
                            upcoming_events.append({
                                'name': event.get('title', 'Unknown Event'),
                                'impact': 'HIGH',
                                'time': event_time,
                                'currency': event.get('currency', 'USD'),
                                'source': 'ForexFactory'
                            })
                            
                except (ValueError, TypeError) as e:
                    logger.debug(f"Erro ao processar evento: {e}")
                    continue
            
            # Atualiza cache
            self.cache[cache_key] = (now, upcoming_events)
            
            logger.info(f"✅ Encontrados {len(upcoming_events)} eventos HIGH IMPACT nas próximas {hours_ahead}h")
            for event in upcoming_events:
                logger.info(f"   🚨 {event['name']} ({event['currency']}) às {event['time']}")
            
            return upcoming_events
            
        except requests.RequestException as e:
            logger.warning(f"🌐 Erro de conexão com ForexFactory: {e}")
            return self._fallback_events_check(hours_ahead)
        except Exception as e:
            logger.error(f"❌ Erro inesperado ao buscar eventos macro: {e}")
            return self._fallback_events_check(hours_ahead)
    
    def _fallback_events_check(self, hours_ahead):
        """
        Fallback para quando a API externa falha - usa lógica baseada em tempo
        """
        logger.info("🔄 Usando fallback para eventos macro (sem API externa)")
        
        events = []
        now = datetime.utcnow()
        
        # NFP: Primeira sexta-feira do mês às 13:30 UTC
        if now.weekday() == 4 and 1 <= now.day <= 7:
            nfp_time = now.replace(hour=13, minute=30, second=0, microsecond=0)
            if abs((nfp_time - now).total_seconds()) <= hours_ahead * 3600:
                events.append({
                    'name': 'Non-Farm Payrolls (NFP) - Estimated',
                    'impact': 'HIGH',
                    'time': nfp_time,
                    'currency': 'USD',
                    'source': 'Fallback'
                })
        
        # CPI: Geralmente dia 10-15 do mês às 13:30 UTC
        if 10 <= now.day <= 15:
            cpi_time = now.replace(hour=13, minute=30, second=0, microsecond=0)
            if abs((cpi_time - now).total_seconds()) <= hours_ahead * 3600:
                events.append({
                    'name': 'Consumer Price Index (CPI) - Estimated',
                    'impact': 'HIGH',
                    'time': cpi_time,
                    'currency': 'USD',
                    'source': 'Fallback'
                })
        
        return events
    
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
        Filtra sinais baseado em eventos fundamentais próximos - IMPLEMENTAÇÃO REAL
        """
        try:
            # Usa a nova função de eventos reais
            upcoming_events = self.get_real_macro_events(hours_ahead)
            
            # Verifica se há eventos de alto impacto próximos
            high_impact_upcoming = [
                event for event in upcoming_events 
                if event.get('impact') == 'HIGH'
            ]
            
            if high_impact_upcoming:
                logger.warning(f"🚨 BLOQUEIO FUNDAMENTAL REAL: {len(high_impact_upcoming)} eventos HIGH IMPACT nas próximas {hours_ahead}h")
                for event in high_impact_upcoming:
                    event_time = event.get('time', 'Unknown')
                    source = event.get('source', 'Unknown')
                    logger.warning(f"   - {event['name']} ({event.get('currency', 'N/A')}) às {event_time} [fonte: {source}]")
                return False
            
            # Para crypto, verifica apenas eventos críticos específicos
            if 'BTC' in symbol or 'ETH' in symbol:
                critical_events = [
                    event for event in upcoming_events
                    if any(keyword in event['name'].upper() for keyword in [
                        'FEDERAL FUNDS RATE', 'FOMC', 'INTEREST RATE DECISION',
                        'ECB RATE', 'BANK OF ENGLAND', 'CENTRAL BANK'
                    ])
                ]
                
                if critical_events:
                    logger.warning(f"⚠️ EVENTOS CRÍTICOS PARA CRYPTO: {len(critical_events)} nas próximas {hours_ahead}h")
                    for event in critical_events:
                        logger.warning(f"   - {event['name']} às {event.get('time', 'Unknown')}")
                    return True  # Permite crypto com cuidado em eventos de juros
            
            logger.info(f"✅ Filtro fundamental REAL aprovado: Nenhum evento HIGH IMPACT nas próximas {hours_ahead}h")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro no filtro fundamental real: {e}")
            return True  # Fallback: permite trade em caso de erro
    
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
    Função wrapper para verificar filtro fundamental REAL
    """
    filter_instance = MacroEventsFilter()
    return filter_instance.fundamental_filter(symbol, hours_ahead=4)

def get_upcoming_macro_events(hours_ahead=4):
    """
    Função para obter eventos macro próximos (para logging/debug)
    """
    filter_instance = MacroEventsFilter()
    return filter_instance.get_real_macro_events(hours_ahead)

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