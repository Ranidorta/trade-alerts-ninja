import sqlite3
import pandas as pd
from datetime import datetime
from api.fetch_data import fetch_data
import logging

logger = logging.getLogger("SignalEvaluator")
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')

def evaluate_signal(symbol, entry, sl, tps, direction, start_time, window_minutes=60):
    """Avalia um sinal já salvo com base em preços futuros."""
    df = fetch_data(symbol, '1m', limit=window_minutes)
    df = df[df['timestamp'] >= start_time]

    for _, row in df.iterrows():
        price = row['close']
        if direction == 'BUY':
            if price <= sl:
                return 'LOSER'
            if price >= tps[2]:
                return 'WINNER'
            if price >= tps[1]:
                return 'PARTIAL'
            if price >= tps[0]:
                return 'PARTIAL'
        else:
            if price >= sl:
                return 'LOSER'
            if price <= tps[2]:
                return 'WINNER'
            if price <= tps[1]:
                return 'PARTIAL'
            if price <= tps[0]:
                return 'PARTIAL'

    return 'FALSE'

def revalidate_signals(db_path='signals.db', window_minutes=60):
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, symbol, direction, entry_price, sl, tp, timestamp, result 
            FROM signals
            WHERE closed = 0
        """)
        rows = cursor.fetchall()

        updated = 0
        for row in rows:
            signal_id, symbol, direction, entry, sl, tp, timestamp_str, current_result = row
            if current_result in ('WINNER', 'LOSER'):
                continue

            try:
                timestamp = datetime.fromisoformat(timestamp_str)
                tps = [tp * r for r in [0.3, 0.6, 1.0]]
                result = evaluate_signal(symbol, entry, sl, tps, direction, timestamp, window_minutes)

                if result != current_result:
                    cursor.execute("""
                        UPDATE signals
                        SET result = ?, closed = 1
                        WHERE id = ?
                    """, (result, signal_id))
                    updated += 1
                    logger.info(f"Sinal {signal_id} atualizado: {result}")

            except Exception as e:
                logger.error(f"Erro ao revalidar {signal_id}: {str(e)}")

        conn.commit()
        logger.info(f"✅ Total de sinais reavaliados: {updated}")

if __name__ == '__main__':
    revalidate_signals()
