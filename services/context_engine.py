# services/context_engine.py
import requests
import logging
from typing import Dict, Tuple, Optional
from bs4 import BeautifulSoup
import ollama
import json
import hashlib
import sqlite3
from datetime import datetime, timedelta
import random

logger = logging.getLogger("ContextEngine")

class ContextEngine:
    def __init__(self, config: Dict):
        self.llm_config = config.get("llm_config", {})
        self.model = self.llm_config.get("model", "mistral")
        self.timeout = self.llm_config.get("timeout", 15)
        self.cache_ttl = self.llm_config.get("cache_ttl", 3600)  # 1 hora
        
        # Configuração de resiliência
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        ]
        
        # Banco de dados para cache
        self._init_cache_db()

    def _init_cache_db(self):
        """Inicializa SQLite para cache de notícias/respostas"""
        self.conn = sqlite3.connect("context_cache.db")
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS analysis_cache (
                key TEXT PRIMARY KEY,
                score REAL,
                reason TEXT,
                expires INTEGER
            )
        """)
        self.conn.commit()

    def _cache_get(self, key: str) -> Optional[Tuple[float, str]]:
        """Obtém resultado do cache"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT score, reason FROM analysis_cache
            WHERE key = ? AND expires > ?
        """, (key, int(datetime.now().timestamp())))
        return cursor.fetchone()

    def _cache_set(self, key: str, score: float, reason: str):
        """Armazena resultado no cache"""
        expires = int((datetime.now() + timedelta(seconds=self.cache_ttl)).timestamp()
        self.conn.execute("""
            INSERT OR REPLACE INTO analysis_cache
            (key, score, reason, expires) VALUES (?, ?, ?, ?)
        """, (key, score, reason, expires))
        self.conn.commit()

    def _generate_cache_key(self, symbol: str, context: str) -> str:
        """Gera chave de cache única"""
        content = f"{symbol}-{context}"
        return hashlib.md5(content.encode()).hexdigest()

    def analyze(self, symbol: str, context_text: Optional[str] = None) -> Tuple[float, str]:
        """
        Versão production-ready com:
        - Cache
        - Rotação de User-Agent
        - Timeout
        - Fallback hierárquico
        """
        cache_key = self._generate_cache_key(symbol, context_text or "")
        
        # 1. Tentar cache
        if cached := self._cache_get(cache_key):
            logger.debug(f"Cache hit para {symbol}")
            return cached

        # 2. Análise principal
        try:
            if context_text is None:
                context_text = self._scrape_news(symbol)
                if "Erro" in context_text:
                    raise ValueError("Scraping falhou")

            score, reason = self._ollama_analysis(symbol, context_text)
            self._cache_set(cache_key, score, reason)
            return score, reason
            
        except Exception as e:
            logger.warning(f"Falha na análise ({symbol}): {str(e)}")
            return self._fallback_analysis(symbol)

    def _scrape_news(self, symbol: str) -> str:
        """Scraping resiliente com rotação de UA e fallback"""
        urls = [
            f"https://news.google.com/search?q={symbol}+criptomoeda&hl=pt-BR",
            f"https://www.investing.com/search/?q={symbol}",
            f"https://cointelegraph.com/search?query={symbol}"
        ]
        
        for url in urls:
            try:
                response = requests.get(
                    url,
                    headers={"User-Agent": random.choice(self.user_agents)},
                    timeout=self.timeout
                )
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extração genérica (adaptável por site)
                titles = []
                for selector in ['h3', '.title', '.article-title']:
                    titles.extend(t.text for t in soup.select(selector))
                    if titles: break
                
                return " ".join(titles[:5]) or "Sem conteúdo encontrado"
                
            except Exception as e:
                logger.debug(f"Falha em {url}: {str(e)}")
                continue
                
        return "Erro: todas as fontes falharam"

    def _ollama_analysis(self, symbol: str, context: str) -> Tuple[float, str]:
        """Análise com Ollama otimizada para produção"""
        prompt = f"""
        [ANÁLISE DE MERCADO]
        Ativo: {symbol}
        Contexto: {context[:2000]}...  # Limite de tokens

        FORMATE A RESPOSTA COMO JSON:
        {{
            "score": 0.0-1.0 (0.5 = neutro),
            "reason": "string concisa",
            "confidence": 0.0-1.0
        }}
        """
        
        try:
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                format="json",
                options={
                    "temperature": 0.2,
                    "timeout": self.timeout
                }
            )
            data = json.loads(response["response"])
            
            # Validação rigorosa
            if not 0 <= data["score"] <= 1:
                raise ValueError("Score inválido")
                
            return (
                float(data["score"]),
                f"{data['reason']} (Confiança: {data['confidence']*100:.0f}%)"
            )
            
        except Exception as e:
            logger.error(f"Falha no Ollama: {str(e)}")
            raise

    def _fallback_analysis(self, symbol: str) -> Tuple[float, str]:
        """Fallback hierárquico para produção"""
        # 1. Tentar análise técnica básica
        try:
            from services.technical_analyzer import get_trend_strength
            strength = get_trend_strength(symbol)
            return (
                max(0.4, min(0.6, 0.5 + strength/100)),  # Normaliza para 0.4-0.6
                f"Fallback técnico | Força da tendência: {strength:.1f}%"
            )
        except:
            # 2. Fallback estático com variação pseudo-aleatória
            seed = hash(symbol) % 100
            r = (seed/100) * 0.3  # Variação controlada
            return (
                0.5 + r - 0.15,  # Entre 0.35-0.65
                "Análise neutra (sistema fallback)"
            )

    def __del__(self):
        """Garante fechamento da conexão"""
        if hasattr(self, 'conn'):
            self.conn.close()
