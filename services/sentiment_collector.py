# services/sentiment_collector.py
import requests
import logging
from bs4 import BeautifulSoup
from datetime import datetime
import random
from typing import List, Dict
import json

logger = logging.getLogger("SentimentCollector")

class NewsScraper:
    def __init__(self):
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        ]
        self.timeout = 15

    def scrape_financial_news(self, symbol: str) -> List[Dict]:
        """Coleta notícias de múltiplas fontes para um ativo específico"""
        sources = [
            self._scrape_google_news,
            self._scrape_cointelegraph,
            self._scrape_investing
        ]
        
        all_news = []
        for source in sources:
            try:
                news = source(symbol)
                if news:
                    all_news.extend(news)
                    if len(all_news) >= 5:  # Limite de notícias
                        break
            except Exception as e:
                logger.warning(f"Falha em {source.__name__}: {str(e)}")
                continue

        return all_news[:5]  # Retorna no máximo 5 notícias

    def _scrape_google_news(self, symbol: str) -> List[Dict]:
        """Raspa notícias do Google News"""
        url = f"https://news.google.com/search?q={symbol}+criptomoeda&hl=pt-BR"
        headers = {"User-Agent": random.choice(self.user_agents)}
        
        response = requests.get(url, headers=headers, timeout=self.timeout)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        news = []
        for article in soup.select('article')[:3]:  # Limite por fonte
            title = article.select_one('h3')
            if title:
                news.append({
                    "source": "Google News",
                    "title": title.text,
                    "url": f"https://news.google.com{article.find('a')['href'][1:]}",
                    "timestamp": datetime.now().isoformat()
                })
        return news

    def _scrape_cointelegraph(self, symbol: str) -> List[Dict]:
        """Raspa notícias específicas da Cointelegraph"""
        url = f"https://cointelegraph.com/tags/{symbol.lower()}"
        headers = {"User-Agent": random.choice(self.user_agents)}
        
        response = requests.get(url, headers=headers, timeout=self.timeout)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        news = []
        for item in soup.select('.post-card__title-link')[:3]:
            news.append({
                "source": "Cointelegraph",
                "title": item.text.strip(),
                "url": f"https://cointelegraph.com{item['href']}",
                "timestamp": datetime.now().isoformat()
            })
        return news

    def _scrape_investing(self, symbol: str) -> List[Dict]:
        """Raspa notícias do Investing.com"""
        url = f"https://www.investing.com/search/?q={symbol}"
        headers = {
            "User-Agent": random.choice(self.user_agents),
            "X-Requested-With": "XMLHttpRequest"
        }
        
        response = requests.get(url, headers=headers, timeout=self.timeout)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        news = []
        for item in soup.select('.searchResultsItem')[:3]:
            title = item.select_one('a.title')
            if title:
                news.append({
                    "source": "Investing.com",
                    "title": title.text.strip(),
                    "url": f"https://www.investing.com{title['href']}",
                    "timestamp": datetime.now().isoformat()
                })
        return news

    def to_context_text(self, news: List[Dict]) -> str:
        """Converte notícias em texto para o LLM"""
        return json.dumps(news, ensure_ascii=False)
