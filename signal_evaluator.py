# signal_evaluator.py

import pandas as pd

from ml.save_evaluation_result import save_evaluation_result
from ml.continuous_learning import continuous_learning_agent

def evaluate_signal(signal: dict, future_df: pd.DataFrame) -> str:
    """
    Avalia o resultado do sinal com base nos preços futuros.
    Classificação possível:
    - WINNER: Se atingiu TP3 sem tocar o SL
    - PARTIAL: Se atingiu TP1 ou TP2 mas não TP3, e depois voltou no SL
    - LOSER: Se bateu o SL antes de atingir qualquer TP
    - FALSE: Se dentro do período de validade o sinal não atingiu nenhum alvo nem o SL

    future_df deve conter colunas: high, low, close
    """
    if not signal or future_df is None or future_df.empty:
        return "FALSE"

    entry = signal["entry"]
    sl = signal["sl"]
    tp1 = signal["tp1"]
    tp2 = signal["tp2"]
    tp3 = signal["tp3"]
    direction = signal["direction"]

    hit_tp1 = hit_tp2 = hit_tp3 = False

    for _, row in future_df.iterrows():
        high = row['high']
        low = row['low']

        if direction == 'UP':
            if high >= tp3:
                result = "WINNER"
                save_evaluation_result(signal, result)
                # Verificar se precisa retreinar após novo resultado
                if continuous_learning_agent.should_retrain():
                    continuous_learning_agent.continuous_train()
                return result
            if high >= tp2:
                hit_tp2 = True
            if high >= tp1:
                hit_tp1 = True
            if low <= sl:
                if hit_tp2:
                    result = "PARTIAL"
                elif hit_tp1:
                    result = "PARTIAL"
                else:
                    result = "LOSER"
                save_evaluation_result(signal, result)
                # Verificar se precisa retreinar após novo resultado
                if continuous_learning_agent.should_retrain():
                    continuous_learning_agent.continuous_train()
                return result
        elif direction == 'DOWN':
            if low <= tp3:
                result = "WINNER"
                save_evaluation_result(signal, result)
                # Verificar se precisa retreinar após novo resultado
                if continuous_learning_agent.should_retrain():
                    continuous_learning_agent.continuous_train()
                return result
            if low <= tp2:
                hit_tp2 = True
            if low <= tp1:
                hit_tp1 = True
            if high >= sl:
                if hit_tp2:
                    result = "PARTIAL"
                elif hit_tp1:
                    result = "PARTIAL"
                else:
                    result = "LOSER"
                save_evaluation_result(signal, result)
                # Verificar se precisa retreinar após novo resultado
                if continuous_learning_agent.should_retrain():
                    continuous_learning_agent.continuous_train()
                return result

    # Se nenhum TP nem SL foi atingido no período analisado
    result = "FALSE"
    save_evaluation_result(signal, result)
    # Verificar se precisa retreinar após novo resultado
    if continuous_learning_agent.should_retrain():
        continuous_learning_agent.continuous_train()
    return result