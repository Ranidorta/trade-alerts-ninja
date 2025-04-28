import pickle
import numpy as np
from sklearn.linear_model import SGDClassifier

class MLTrainer:
    def __init__(self, model_path="models/trade_agent_model.pkl"):
        self.model_path = model_path
        self.model = SGDClassifier(loss='log_loss', warm_start=True)
        self.load()

    def load(self):
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
        except:
            pass

    def save(self):
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)

    def train(self, X, y):
        self.model.partial_fit(X, y, classes=[0, 1])
        self.save()

    def predict(self, X):
        return self.model.predict_proba(X)[:, 1]

    def score(self, X, y):
        return self.model.score(X, y)
