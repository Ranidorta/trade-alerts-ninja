import sqlite3
import pickle
import numpy as np
from sklearn.metrics import classification_report
from datetime import datetime

def evaluate_model(db_path, model_path):
    with sqlite3.connect(db_path) as conn:
        df = conn.execute("""
            SELECT features, result FROM signals
            WHERE closed = 1 AND result IS NOT NULL AND features IS NOT NULL
            LIMIT 200
        """).fetchall()

        if len(df) < 50:
            print("Dados insuficientes.")
            return

        X = np.vstack([pickle.loads(x[0]) for x in df])
        y = np.where([x[1] > 0 for x in df], 1, 0)

        with open(model_path, 'rb') as f:
            model = pickle.load(f)

        preds = model.predict(X)

        report = classification_report(y, preds, output_dict=True)
        print(f"Accuracy: {report['accuracy']:.2%}")
        print("Relatório completo:", report)

        conn.execute("""
            INSERT INTO model_performance VALUES (?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().isoformat(),
            report['accuracy'],
            report['1']['precision'],
            report['1']['recall'],
            report['1']['f1-score'],
            "v1.0"
        ))
