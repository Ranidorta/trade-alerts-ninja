import requests
import logging
from typing import Dict, Tuple

logger = logging.getLogger("ContextEngine")

class ContextEngine:
    def __init__(self, config: Dict):
        self.llm_config = config

    def analyze(self, symbol: str, context_text: str = "") -> Tuple[float, str]:
        if self.llm_config.get("use_ollama"):
            return self._analyze_with_ollama(symbol, context_text)
        else:
            return self._analyze_with_fallback(symbol)

    def _analyze_with_ollama(self, symbol: str, context_text: str) -> Tuple[float, str]:
        prompt = (
            f"Considere o ativo {symbol}. Com base nas seguintes informações:
"
            f"{context_text}

"
            "Diga se o sentimento é positivo, negativo ou neutro. Retorne uma justificativa e um score de 0 a 1."
        )
        try:
            response = requests.post("http://localhost:11434/api/generate", json={
                "model": self.llm_config.get("model", "mistral"),
                "prompt": prompt,
                "stream": False
            })
            texto = response.json().get("response", "").lower()
            score = 0.8 if "positivo" in texto else 0.3 if "negativo" in texto else 0.5
            return score, texto
        except Exception as e:
            logger.error(f"Erro no contexto: {e}")
            return 0.5, "Erro na análise contextual"
        
    def _analyze_with_fallback(self, symbol: str) -> Tuple[float, str]:
        return 0.5, "Fallback: contexto não disponível"
