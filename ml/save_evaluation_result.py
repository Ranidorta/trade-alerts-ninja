# ml/save_evaluation_result.py

import pandas as pd
import os
from datetime import datetime

def save_evaluation_result(signal, evaluation_result, csv_path='signals_history.csv'):
    """
    Salva o resultado da avaliação de um sinal no CSV de histórico.

    Parâmetros:
    - signal: dict com os campos técnicos do sinal (rsi, adx, volume_ratio, candle_body_ratio, etc)
    - evaluation_result: string com o resultado final do sinal: WINNER, PARTIAL, LOSER, FALSE
    - csv_path: caminho do CSV onde os sinais são armazenados
    """
    try:
        # Extrair features do sinal - verificar se existem as chaves ML
        ml_features = signal.get('ml_features', {})
        
        row = {
            'timestamp': datetime.utcnow().isoformat(),
            'symbol': signal.get('symbol', 'UNKNOWN'),
            'direction': signal.get('direction', signal.get('signal', 'BUY')),
            'rsi': ml_features.get('rsi', signal.get('rsi', 50.0)),
            'adx': ml_features.get('adx', signal.get('adx', 25.0)),
            'volume_ratio': ml_features.get('volume_ratio', signal.get('volume_ratio', 1.0)),
            'candle_body_ratio': ml_features.get('candle_body_ratio', signal.get('candle_body_ratio', 0.5)),
            'result': evaluation_result
        }

        file_exists = os.path.isfile(csv_path)

        df_row = pd.DataFrame([row])

        if file_exists:
            df_row.to_csv(csv_path, mode='a', header=False, index=False)
        else:
            df_row.to_csv(csv_path, mode='w', header=True, index=False)

        print(f"✅ [DATASET] Resultado salvo no histórico: {evaluation_result} para sinal {signal.get('symbol', 'UNKNOWN')} ({signal.get('direction', 'BUY')})")
        
    except Exception as e:
        print(f"❌ Erro ao salvar resultado no CSV: {e}")