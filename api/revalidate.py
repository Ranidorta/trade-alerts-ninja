from fastapi import APIRouter
from signal_evaluator import evaluate_signal
import sqlite3
import json
from datetime import datetime

router = APIRouter()

@router.post("/signals/revalidate")
def revalidate_signals():
    db_path = "signals.db"
    updated = {"WINNER": 0, "LOSER": 0, "PARTIAL": 0, "FALSE": 0}

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Buscar sinais abertos e ainda sem resultado
        cur.execute("SELECT * FROM signals WHERE closed = 0 AND result IS NULL")
        rows = cur.fetchall()

        for row in rows:
            signal = dict(row)
            result = evaluate_signal(signal)

            if result:
                updated[result] += 1
                cur.execute("""
                    UPDATE signals
                    SET result = ?, closed = 1
                    WHERE id = ?
                """, (result, signal['id']))

        conn.commit()

    return {
        "status": "success",
        "updated_counts": updated,
        "evaluated": sum(updated.values()),
        "timestamp": datetime.utcnow().isoformat()
    }
