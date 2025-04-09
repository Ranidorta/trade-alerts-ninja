import logging
import pickle
import numpy as np
from datetime import datetime
from typing import Optional, Tuple
from sklearn.base import BaseEstimator
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from pathlib import Path

logger = logging.getLogger("MLTrainer")

class MLTrainer:
    def __init__(self, model_path: str, retrain_interval_days: int = 7):
        self.model_path = model_path
        self.retrain_interval = retrain_interval_days
        self.model: Optional[BaseEstimator] = None
        self.last_retrain_date: Optional[datetime] = None
        self._load_model()

    def _load_model(self) -> None:
        """Carrega o modelo do disco ou cria um novo se não existir."""
        try:
            with open(self.model_path, "rb") as f:
                self.model = pickle.load(f)
            self.last_retrain_date = datetime.fromtimestamp(Path(self.model_path).stat().st_mtime)
            logger.info(f"Modelo carregado: {self.model_path}")
        except (FileNotFoundError, pickle.PickleError) as e:
            logger.warning(f"Modelo não encontrado ou corrompido: {e}. Um novo será criado durante o retreinamento.")
            self.model = None

    def _needs_retraining(self) -> bool:
        """Verifica se o modelo precisa ser retreinado."""
        if not self.model or not self.last_retrain_date:
            return True
        return (datetime.now() - self.last_retrain_date).days >= self.retrain_interval

    def predict(self, features: np.ndarray) -> np.ndarray:
        """
        Faz previsões validando as features de entrada.
        
        Args:
            features: Array numpy com shape (n_samples, n_features).
                     Features esperadas: [RSI norm, ATR ratio, EMA diff, Volume ratio].
        
        Returns:
            Probabilidades de sucesso (shape: n_samples,).
        
        Raises:
            ValueError: Se features forem incompatíveis.
        """
        if not self.model:
            raise ValueError("Modelo não carregado. Execute retrain() primeiro.")

        if features.shape[1] != 4:  # Verifica número de features
            raise ValueError(f"Esperadas 4 features, recebidas {features.shape[1]}")

        # Validação adicional dos ranges esperados
        if not (0 <= features[:, 0]).all() <= 1:  # RSI norm
            logger.warning("Feature RSI fora do range esperado [0, 1]")

        return self.model.predict_proba(features)[:, 1]  # Retorna probabilidades da classe positiva

    def retrain(self, X: np.ndarray, y: np.ndarray, test_size: float = 0.2) -> Tuple[float, float]:
        """
        Retreina o modelo e salva em disco.
        
        Args:
            X: Dados de treino (shape: n_samples, n_features).
            y: Labels (0 ou 1, shape: n_samples,).
            test_size: Tamanho do conjunto de teste.
        
        Returns:
            (accuracy_train, accuracy_test)
        """
        from sklearn.ensemble import RandomForestClassifier  # Lazy import

        # Split dos dados
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

        # Cria/retreina o modelo
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_train, y_train)

        # Avaliação
        train_acc = accuracy_score(y_train, self.model.predict(X_train))
        test_acc = accuracy_score(y_test, self.model.predict(X_test))

        # Salva o modelo
        with open(self.model_path, "wb") as f:
            pickle.dump(self.model, f)
        self.last_retrain_date = datetime.now()

        logger.info(
            f"Modelo retreinado. Acurácia: Treino={train_acc:.2%}, Teste={test_acc:.2%}. "
            f"Salvo em {self.model_path}"
        )
        return train_acc, test_acc

    def auto_retrain_if_needed(self, X: np.ndarray, y: np.ndarray) -> bool:
        """Retreina automaticamente se necessário."""
        if self._needs_retraining():
            logger.info("Iniciando retreinamento automático...")
            self.retrain(X, y)
            return True
        return False
