
"""
Agente de Trade Automatizado com integração à API da Bybit (v5), geração de sinais, simulação e persistência em banco de dados SQLite.
Atualizado para processar automaticamente todos os pares de futuros disponíveis.
Otimizado com processamento paralelo e armazenamento de dados brutos.
"""

import pandas as pd
import numpy as np
import talib
import requests
import joblib
import os
import sqlite3
import json
import time
import concurrent.futures
from river import linear_model, preprocessing
from datetime import datetime, timedelta

# ===============================
# CONFIGURAÇÕES GERAIS
# ===============================
BYBIT_API_URL = "https://api.bybit.com/v5/market/kline"
BYBIT_SYMBOLS_URL = "https://api.bybit.com/v5/market/instruments"
MODEL_PATH = "model.pkl"
DB_PATH = "signals.db"
RAW_DATA_DIR = "raw_data"
INTERVAL = "1h"
CANDLE_LIMIT = 200

# Limites de requisições API
MAX_REQUESTS_PER_SECOND = 5
MAX_PARALLEL_PROCESSES = 10

# Parâmetros de estratégia
RSI_THRESHOLD_BUY = 30
RSI_THRESHOLD_SELL = 70
RISK_REWARD_RATIO = 1.5
RISK_PER_TRADE = 0.02
ACCOUNT_BALANCE = 10000

# ===============================
# DIRETÓRIOS E INICIALIZAÇÃO
# ===============================
if not os.path.exists(RAW_DATA_DIR):
    os.makedirs(RAW_DATA_DIR)

# ===============================
# MODELO
# ===============================
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
else:
    model = preprocessing.StandardScaler() | linear_model.LogisticRegression()

# ===============================
# BANCO DE DADOS
# ===============================
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Tabela de sinais principal
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT,
            signal_type TEXT,
            signal INTEGER,
            result INTEGER,
            position_size REAL,
            entry_price REAL,
            timestamp TEXT,
            UNIQUE(symbol, signal_type, timestamp)
        )
    ''')
    
    # Tabela para armazenar metadados de execução
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_timestamp TEXT,
            symbols_processed INTEGER,
            signals_generated INTEGER,
            execution_time_seconds REAL
        )
    ''')
    
    # Índices para melhorar performance de queries
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_signal_symbol ON signals (symbol)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_signal_type ON signals (signal_type)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_signal_timestamp ON signals (timestamp)')
    
    conn.commit()
    conn.close()


def save_signal_to_db(symbol, signal_type, signal, result, position_size, entry_price):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        timestamp = datetime.utcnow().isoformat()
        
        # Usa INSERT OR IGNORE com UNIQUE constraint para evitar duplicatas
        cursor.execute('''
            INSERT OR IGNORE INTO signals (symbol, signal_type, signal, result, position_size, entry_price, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (symbol, signal_type, signal, result, position_size, entry_price, timestamp))
        
        inserted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return inserted
    except Exception as e:
        print(f"Erro ao salvar sinal no banco: {str(e)}")
        return False

def save_metadata(run_timestamp, symbols_processed, signals_generated, execution_time):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO metadata (run_timestamp, symbols_processed, signals_generated, execution_time_seconds)
        VALUES (?, ?, ?, ?)
    ''', (run_timestamp, symbols_processed, signals_generated, execution_time))
    conn.commit()
    conn.close()

# ===============================
# OBTÉM TODOS OS SÍMBOLOS FUTUROS COM PAGINAÇÃO
# ===============================
def get_all_symbols():
    all_symbols = []
    next_cursor = None
    page = 1
    
    while True:
        try:
            params = {"category": "linear", "limit": 200}
            if next_cursor:
                params["cursor"] = next_cursor
            
            print(f"Buscando símbolos (página {page})...")
            response = requests.get(BYBIT_SYMBOLS_URL, params=params)
            data = response.json()
            
            if "result" not in data or "list" not in data["result"]:
                print(f"Erro ao buscar símbolos: {data}")
                break
                
            symbols_page = [item["symbol"] for item in data["result"]["list"] if "USDT" in item["symbol"]]
            all_symbols.extend(symbols_page)
            
            if "nextPageCursor" not in data["result"] or not data["result"]["nextPageCursor"]:
                break
                
            next_cursor = data["result"]["nextPageCursor"]
            page += 1
            
            # Respeita o rate limit
            time.sleep(1/MAX_REQUESTS_PER_SECOND)
            
        except Exception as e:
            print(f"Erro na paginação de símbolos: {str(e)}")
            break
    
    print(f"Total de símbolos encontrados: {len(all_symbols)}")
    return all_symbols

# ===============================
# COLETA DE DADOS
# ===============================
def get_candles(symbol, interval="1h", limit=200):
    params = {
        "category": "linear",
        "symbol": symbol,
        "interval": interval,
        "limit": limit
    }
    
    try:
        res = requests.get(BYBIT_API_URL, params=params)
        data = res.json()
        
        if "result" in data and "list" in data["result"]:
            candles = data["result"]["list"]
            df = pd.DataFrame(candles, columns=[
                "timestamp", "open", "high", "low", "close", "volume", "turnover"])
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
            df[["open", "high", "low", "close"]] = df[["open", "high", "low", "close"]].astype(float)
            
            # Salva dados brutos em JSON para reprocessamento posterior
            save_raw_data(symbol, data["result"]["list"])
            
            return df
    except Exception as e:
        print(f"Erro ao buscar velas para {symbol}: {str(e)}")
    
    return pd.DataFrame()

def save_raw_data(symbol, candles_data):
    """Salva dados brutos em formato JSON para reprocessamento posterior"""
    try:
        filepath = os.path.join(RAW_DATA_DIR, f"{symbol}.json")
        with open(filepath, 'w') as file:
            timestamp = datetime.utcnow().isoformat()
            json.dump({
                "data": candles_data,
                "timestamp": timestamp,
                "symbol": symbol
            }, file)
    except Exception as e:
        print(f"Erro ao salvar dados brutos para {symbol}: {str(e)}")

# ===============================
# FEATURES
# ===============================
def extract_features(df):
    df['rsi'] = talib.RSI(df['close'], timeperiod=14)
    df['ma_short'] = talib.SMA(df['close'], timeperiod=5)
    df['ma_long'] = talib.SMA(df['close'], timeperiod=20)
    df['atr'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=14)
    df['macd'], df['macd_signal'], _ = talib.MACD(df['close'], 12, 26, 9)
    return df.dropna()

# ===============================
# SINAIS
# ===============================
def generate_classic_signal(row):
    if (
        row['rsi'] < RSI_THRESHOLD_BUY and
        row['ma_short'] > row['ma_long'] and
        row['macd'] > row['macd_signal']
    ):
        return 1
    elif (
        row['rsi'] > RSI_THRESHOLD_SELL and
        row['ma_short'] < row['ma_long'] and
        row['macd'] < row['macd_signal']
    ):
        return -1
    return 0

def generate_fast_signal(row):
    if row['rsi'] < 40 and row['macd'] > row['macd_signal']:
        return 1
    elif row['rsi'] > 60 and row['macd'] < row['macd_signal']:
        return -1
    return 0

# ===============================
# SIMULAÇÃO + APRENDIZADO
# ===============================
def simulate_trade(row):
    entry = row['close']
    future = row['future']
    atr = row['atr']
    tp = atr * RISK_REWARD_RATIO
    sl = atr
    signal = row['signal']
    
    # Se não houver sinal ou dados futuros, retorna None
    if signal == 0 or pd.isna(future):
        return None
        
    if signal == 1 and future >= entry + tp:
        return 1
    elif signal == 1 and future <= entry - sl:
        return 0
    elif signal == -1 and future <= entry - tp:
        return 1
    elif signal == -1 and future >= entry + sl:
        return 0
    return None

def update_model(row, outcome):
    if outcome is None:
        return
        
    x = {
        'rsi': row['rsi'],
        'ma_diff': row['ma_short'] - row['ma_long'],
        'macd': row['macd'],
        'atr': row['atr']
    }
    model.learn_one(x, outcome)

def save_model_periodically():
    """Salva o modelo para evitar perda de aprendizado em caso de falha"""
    joblib.dump(model, MODEL_PATH)
    print(f"Modelo salvo em {MODEL_PATH}")

def calculate_position_size(capital, atr, risk_pct):
    risk = capital * risk_pct
    return round(risk / atr, 2) if atr > 0 else 0

# ===============================
# PROCESSAMENTO DO ATIVO
# ===============================
def process_symbol(symbol):
    """Processa um único símbolo e retorna número de sinais gerados"""
    signals_generated = 0
    
    try:
        df = get_candles(symbol, interval=INTERVAL, limit=CANDLE_LIMIT)
        if df.empty:
            print(f"Sem dados para: {symbol}")
            return 0

        df = extract_features(df)
        df['future'] = df['close'].shift(-5)

        for tipo, generator in [("CLASSIC", generate_classic_signal), ("FAST", generate_fast_signal)]:
            df['signal'] = df.apply(generator, axis=1)
            df['result'] = df.apply(simulate_trade, axis=1)
            df['position_size'] = df.apply(lambda r: calculate_position_size(ACCOUNT_BALANCE, r['atr'], RISK_PER_TRADE), axis=1)

            for _, row in df[df['signal'] != 0].dropna().iterrows():
                if row['result'] is not None:
                    update_model(row, row['result'])
                    inserted = save_signal_to_db(symbol, tipo, row['signal'], row['result'], row['position_size'], row['close'])
                    if inserted:
                        signals_generated += 1
                        print(f"[{tipo}] {symbol}: sinal={row['signal']} resultado={row['result']} pos={row['position_size']}")
    
        return signals_generated
    except Exception as e:
        print(f"Erro ao processar {symbol}: {str(e)}")
        return 0

# ===============================
# PROCESSAMENTO PARALELO
# ===============================
def process_symbols_batch(symbols_batch):
    """Processa um lote de símbolos e retorna o número total de sinais gerados"""
    signals_count = 0
    for symbol in symbols_batch:
        signals_count += process_symbol(symbol)
        # Respeita o rate limit
        time.sleep(1/MAX_REQUESTS_PER_SECOND)
    return signals_count

def process_all_parallel():
    """Processa todos os símbolos em paralelo com rate limiting inteligente"""
    start_time = time.time()
    run_timestamp = datetime.utcnow().isoformat()
    
    init_db()
    all_symbols = get_all_symbols()
    
    # Divide símbolos em lotes para processar em paralelo
    # mas respeitando o rate limit
    batch_size = MAX_REQUESTS_PER_SECOND * 2  # 2 requisições por símbolo em média
    symbol_batches = [all_symbols[i:i+batch_size] for i in range(0, len(all_symbols), batch_size)]
    
    total_signals = 0
    model_save_counter = 0
    
    # Processa os lotes em paralelo
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_PARALLEL_PROCESSES) as executor:
        futures = [executor.submit(process_symbols_batch, batch) for batch in symbol_batches]
        
        for future in concurrent.futures.as_completed(futures):
            batch_signals = future.result()
            total_signals += batch_signals
            
            # Salva o modelo periodicamente
            model_save_counter += 1
            if model_save_counter % 5 == 0:
                save_model_periodically()
    
    # Salva o modelo final
    save_model_periodically()
    
    execution_time = time.time() - start_time
    
    # Salva metadados da execução
    save_metadata(run_timestamp, len(all_symbols), total_signals, execution_time)
    
    print(f"Processamento concluído em {execution_time:.2f} segundos")
    print(f"Símbolos processados: {len(all_symbols)}")
    print(f"Sinais gerados: {total_signals}")
    
    return {
        "symbols_processed": len(all_symbols),
        "signals_generated": total_signals,
        "execution_time": execution_time
    }

# ===============================
# MAIN
# ===============================
if __name__ == '__main__':
    results = process_all_parallel()
    print(f"Processamento de sinais concluído com {results['signals_generated']} sinais gerados.")
