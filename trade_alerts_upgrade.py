
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
import sys

# Adiciona diretórios ao PYTHONPATH para importação
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import estratégias e utilidades
from strategies.bollinger_bands import strategy_bollinger_bands
from utils.caching import cached_indicator, memoize
from utils.validation import validate_ohlcv_data
from backtesting.performance import calculate_sharpe_ratio, calculate_max_drawdown, calculate_win_rate

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
    """Inicializa o banco de dados SQLite com as tabelas necessárias."""
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
            strategy_name TEXT,
            user_id TEXT,
            sharpe_ratio REAL,
            max_drawdown REAL,
            UNIQUE(symbol, strategy_name, timestamp)
        )
    ''')
    
    # Tabela para estatísticas de performance por estratégia
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS strategy_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            strategy_name TEXT,
            total_signals INTEGER DEFAULT 0,
            winning_signals INTEGER DEFAULT 0,
            losing_signals INTEGER DEFAULT 0,
            win_rate REAL DEFAULT 0,
            avg_profit REAL DEFAULT 0,
            sharpe_ratio REAL DEFAULT 0,
            max_drawdown REAL DEFAULT 0,
            last_updated TEXT,
            UNIQUE(strategy_name)
        )
    ''')
    
    # Índices para melhorar performance de queries
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_signal_symbol ON signals (symbol)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_signal_type ON signals (signal_type)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_signal_timestamp ON signals (timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_strategy_name ON signals (strategy_name)')
    
    conn.commit()
    conn.close()


def save_signal_to_db(symbol, strategy_name, signal, result, position_size, entry_price, user_id=None, sharpe_ratio=None, max_drawdown=None):
    """
    Salva um sinal no banco de dados com nome da estratégia e métricas de performance.
    
    Args:
        symbol: Símbolo do ativo
        strategy_name: Nome da estratégia
        signal: Valor do sinal (-1, 0, 1)
        result: Resultado (1=ganho, 0=perda, None=pendente)
        position_size: Tamanho da posição
        entry_price: Preço de entrada
        user_id: ID do usuário (opcional)
        sharpe_ratio: Sharpe Ratio da estratégia (opcional)
        max_drawdown: Drawdown máximo (opcional)
    
    Returns:
        bool: True se salvo com sucesso, False caso contrário
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        timestamp = datetime.utcnow().isoformat()
        
        # Verificar e criar a coluna user_id se não existir
        cursor.execute("PRAGMA table_info(signals)")
        columns = [column[1] for column in cursor.fetchall()]
        if "user_id" not in columns:
            cursor.execute("ALTER TABLE signals ADD COLUMN user_id TEXT")
        
        # Usa INSERT OR IGNORE com UNIQUE constraint para evitar duplicatas
        cursor.execute('''
            INSERT OR IGNORE INTO signals 
            (symbol, signal_type, signal, result, position_size, entry_price, timestamp, strategy_name, user_id, sharpe_ratio, max_drawdown)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (symbol, "BUY" if signal == 1 else "SELL", signal, result, position_size, entry_price, timestamp, strategy_name, user_id, sharpe_ratio, max_drawdown))
        
        # Atualiza tabela de performance da estratégia
        update_strategy_performance(cursor, strategy_name, result, sharpe_ratio, max_drawdown)
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Erro ao salvar sinal no banco: {str(e)}")
        return False


def update_strategy_performance(cursor, strategy_name, result, sharpe_ratio=None, max_drawdown=None):
    """
    Atualiza estatísticas de performance de uma estratégia.
    
    Args:
        cursor: Cursor do banco de dados
        strategy_name: Nome da estratégia
        result: Resultado do sinal (1=ganho, 0=perda, None=pendente)
        sharpe_ratio: Sharpe Ratio da estratégia (opcional)
        max_drawdown: Drawdown máximo (opcional)
    """
    try:
        # Verifica se a estratégia já existe na tabela
        cursor.execute('SELECT * FROM strategy_performance WHERE strategy_name = ?', (strategy_name,))
        exists = cursor.fetchone()
        
        if exists:
            # Atualiza estatísticas existentes
            if result == 1:  # Sinal vencedor
                cursor.execute('''
                    UPDATE strategy_performance SET 
                    total_signals = total_signals + 1,
                    winning_signals = winning_signals + 1,
                    last_updated = ?
                    WHERE strategy_name = ?
                ''', (datetime.utcnow().isoformat(), strategy_name))
            elif result == 0:  # Sinal perdedor
                cursor.execute('''
                    UPDATE strategy_performance SET 
                    total_signals = total_signals + 1,
                    losing_signals = losing_signals + 1,
                    last_updated = ?
                    WHERE strategy_name = ?
                ''', (datetime.utcnow().isoformat(), strategy_name))
        else:
            # Insere nova estratégia
            winning = 1 if result == 1 else 0
            losing = 1 if result == 0 else 0
            cursor.execute('''
                INSERT INTO strategy_performance 
                (strategy_name, total_signals, winning_signals, losing_signals, last_updated)
                VALUES (?, 1, ?, ?, ?)
            ''', (strategy_name, winning, losing, datetime.utcnow().isoformat()))
        
        # Atualiza a taxa de vitória e lucro médio
        cursor.execute('''
            UPDATE strategy_performance SET
            win_rate = CASE WHEN total_signals > 0 THEN (winning_signals * 100.0 / total_signals) ELSE 0 END
            WHERE strategy_name = ?
        ''', (strategy_name,))
        
        # Atualiza Sharpe Ratio e Max Drawdown se fornecidos
        if sharpe_ratio is not None:
            cursor.execute('''
                UPDATE strategy_performance SET
                sharpe_ratio = ?
                WHERE strategy_name = ?
            ''', (sharpe_ratio, strategy_name))
            
        if max_drawdown is not None:
            cursor.execute('''
                UPDATE strategy_performance SET
                max_drawdown = ?
                WHERE strategy_name = ?
            ''', (max_drawdown, strategy_name))
        
    except Exception as e:
        print(f"Erro ao atualizar performance da estratégia {strategy_name}: {str(e)}")


def get_strategy_performance(strategy_name=None):
    """
    Retorna estatísticas de performance por estratégia.
    Se strategy_name for None, retorna todas as estratégias.
    
    Args:
        strategy_name: Nome da estratégia (opcional)
    
    Returns:
        list: Lista de dicionários com estatísticas
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if strategy_name:
        cursor.execute('SELECT * FROM strategy_performance WHERE strategy_name = ?', (strategy_name,))
    else:
        cursor.execute('SELECT * FROM strategy_performance ORDER BY win_rate DESC')
    
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return results


def calculate_strategy_profit(strategy_name):
    """
    Calcula o lucro/prejuízo total para uma estratégia específica.
    
    Args:
        strategy_name: Nome da estratégia
    
    Returns:
        float: Lucro/prejuízo da estratégia
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Suponha que resultado 1 = 3% de lucro, 0 = -1.5% de prejuízo
    cursor.execute('''
        SELECT 
            COUNT(CASE WHEN result = 1 THEN 1 END) * 3 -
            COUNT(CASE WHEN result = 0 THEN 1 END) * 1.5 as total_profit
        FROM signals
        WHERE strategy_name = ? AND result IS NOT NULL
    ''', (strategy_name,))
    
    result = cursor.fetchone()
    profit = result[0] if result[0] is not None else 0
    
    # Atualizar a tabela de performance com o lucro médio
    cursor.execute('''
        UPDATE strategy_performance SET
        avg_profit = ?
        WHERE strategy_name = ?
    ''', (profit, strategy_name))
    
    conn.commit()
    conn.close()
    
    return profit

# ===============================
# OBTÉM TODOS OS SÍMBOLOS FUTUROS COM PAGINAÇÃO
# ===============================
def get_all_symbols():
    """
    Obtém todos os símbolos disponíveis com paginação.
    
    Returns:
        list: Lista de símbolos
    """
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
@memoize
def get_candles(symbol, interval="1h", limit=200):
    """
    Obtém candles de um símbolo específico.
    
    Args:
        symbol: Símbolo do ativo
        interval: Intervalo de tempo (1m, 5m, 1h, 1d, etc)
        limit: Número máximo de candles
    
    Returns:
        DataFrame: DataFrame com dados OHLCV
    """
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
            
            # Valida dados
            if not validate_ohlcv_data(df):
                print(f"Dados inválidos para {symbol}")
                return pd.DataFrame()
            
            # Salva dados brutos em JSON para reprocessamento posterior
            save_raw_data(symbol, data["result"]["list"])
            
            return df
    except Exception as e:
        print(f"Erro ao buscar velas para {symbol}: {str(e)}")
    
    return pd.DataFrame()

def save_raw_data(symbol, candles_data):
    """
    Salva dados brutos em formato JSON para reprocessamento posterior.
    
    Args:
        symbol: Símbolo do ativo
        candles_data: Dados de candles em formato JSON
    """
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
@cached_indicator
def extract_features(df):
    """
    Extrai indicadores técnicos de dados OHLCV.
    
    Args:
        df: DataFrame com dados OHLCV
    
    Returns:
        DataFrame: DataFrame com indicadores adicionados
    """
    # Indicadores básicos
    df['rsi'] = talib.RSI(df['close'], timeperiod=14)
    df['ma_short'] = talib.SMA(df['close'], timeperiod=5)
    df['ma_long'] = talib.SMA(df['close'], timeperiod=20)
    df['atr'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=14)
    df['macd'], df['macd_signal'], df['macd_hist'] = talib.MACD(df['close'], 12, 26, 9)
    
    # Indicadores adicionais para novas estratégias
    df['ma9'] = talib.SMA(df['close'], timeperiod=9)
    df['ma21'] = talib.SMA(df['close'], timeperiod=21)
    df['adx'] = talib.ADX(df['high'], df['low'], df['close'], timeperiod=14)
    df['upper_band'], df['middle_band'], df['lower_band'] = talib.BBANDS(df['close'], timeperiod=20)
    
    # Calcula high/low anterior para estratégia de breakout
    df['prev_high'] = df['high'].shift(1)
    df['prev_low'] = df['low'].shift(1)
    df['atr_avg'] = df['atr'].rolling(window=10).mean()
    
    # Volume indicators
    df['volume_sma'] = talib.SMA(df['volume'], timeperiod=20)
    
    return df.dropna()

# ===============================
# SINAIS - IMPLEMENTAÇÃO DE TODAS AS ESTRATÉGIAS
# ===============================
def generate_classic_signal(row):
    """
    Estratégia original baseada em RSI, Médias e MACD
    
    Args:
        row: Linha do DataFrame com indicadores
    
    Returns:
        int: Sinal (1=compra, -1=venda, 0=neutro)
    """
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
    """
    Sinais rápidos com lógica mais simples (RSI e MACD)
    
    Args:
        row: Linha do DataFrame com indicadores
    
    Returns:
        int: Sinal (1=compra, -1=venda, 0=neutro)
    """
    if row['rsi'] < 40 and row['macd'] > row['macd_signal']:
        return 1
    elif row['rsi'] > 60 and row['macd'] < row['macd_signal']:
        return -1
    return 0

def strategy_rsi_macd(row):
    """
    RSI_MACD: Reversão baseada em RSI < 30 e MACD cruzando para cima
    
    Args:
        row: Linha do DataFrame com indicadores
    
    Returns:
        int: Sinal (1=compra, -1=venda, 0=neutro)
    """
    if row['rsi'] < 30 and row['macd_hist'] > 0 and row['macd_hist'] > row['macd_hist'].shift(1):
        return 1
    elif row['rsi'] > 70 and row['macd_hist'] < 0 and row['macd_hist'] < row['macd_hist'].shift(1):
        return -1
    return 0

def strategy_breakout_atr(row):
    """
    BREAKOUT_ATR: Rompimento com confirmação por ATR acima da média e candle rompendo high/low anterior
    
    Args:
        row: Linha do DataFrame com indicadores
    
    Returns:
        int: Sinal (1=compra, -1=venda, 0=neutro)
    """
    if row['atr'] > row['atr_avg'] * 1.1:  # ATR 10% acima da média
        if row['close'] > row['prev_high'] and row['close'] > row['open']:  # Rompimento de alta
            return 1
        elif row['close'] < row['prev_low'] and row['close'] < row['open']:  # Rompimento de baixa
            return -1
    return 0

def strategy_trend_adx(row):
    """
    TREND_ADX: Seguimento de tendência com MA9 vs MA21 e ADX > 20
    
    Args:
        row: Linha do DataFrame com indicadores
    
    Returns:
        int: Sinal (1=compra, -1=venda, 0=neutro)
    """
    if row['adx'] > 20:  # Filtro de força de tendência
        if row['ma9'] > row['ma21'] and row['ma9'] > row['ma9'].shift(1):  # Tendência de alta
            return 1
        elif row['ma9'] < row['ma21'] and row['ma9'] < row['ma9'].shift(1):  # Tendência de baixa
            return -1
    return 0

# ===============================
# SIMULAÇÃO + APRENDIZADO
# ===============================
def simulate_trade(row):
    """
    Simula um trade com base no sinal gerado.
    
    Args:
        row: Linha do DataFrame com sinal e preços
    
    Returns:
        int: 1 para sucesso, 0 para perda, None para indefinido
    """
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
    """
    Atualiza o modelo online com novos dados.
    
    Args:
        row: Linha do DataFrame com indicadores
        outcome: Resultado do trade (1=sucesso, 0=perda)
    """
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
    """
    Calcula o tamanho da posição com base no risco.
    
    Args:
        capital: Capital disponível
        atr: Average True Range
        risk_pct: Percentual de risco por trade
    
    Returns:
        float: Tamanho da posição
    """
    risk = capital * risk_pct
    return round(risk / atr, 2) if atr > 0 else 0

# ===============================
# PROCESSAMENTO DO ATIVO
# ===============================
def process_strategy(df, symbol, strategy_name, strategy_function):
    """
    Aplica uma estratégia de geração de sinais ao DataFrame fornecido,
    salva os sinais no banco e atualiza o modelo online.

    Parâmetros:
    - df: DataFrame com os dados de candles e indicadores
    - symbol: símbolo do ativo (ex: BTCUSDT)
    - strategy_name: nome da estratégia (ex: "RSI_MACD")
    - strategy_function: função que retorna -1, 0 ou 1 para cada linha
    
    Returns:
        int: Número de sinais gerados
    """
    df['signal'] = df.apply(strategy_function, axis=1)
    df['result'] = df.apply(simulate_trade, axis=1)
    df['position_size'] = df.apply(lambda r: calculate_position_size(
        ACCOUNT_BALANCE, r['atr'], RISK_PER_TRADE), axis=1)

    # Calcular métricas de performance para essa estratégia nesse ativo
    signals = df[df['signal'] != 0].copy()
    
    # Se não houver sinais, não há o que processar
    if len(signals) == 0:
        return 0
        
    # Calcular retornos para métricas
    signals['returns'] = np.nan
    signals.loc[signals['result'] == 1, 'returns'] = 0.03  # 3% de lucro para vitórias
    signals.loc[signals['result'] == 0, 'returns'] = -0.015  # -1.5% para perdas
    
    # Calcular Sharpe ratio só se tiver pelo menos 5 trades com resultado
    sharpe_ratio = None
    max_drawdown = None
    
    if len(signals.dropna(subset=['returns'])) >= 5:
        sharpe_ratio = calculate_sharpe_ratio(signals['returns'].dropna())
        max_dd, _, _ = calculate_max_drawdown(signals['returns'].dropna())
        max_drawdown = max_dd

    signals_count = 0
    for _, row in df[df['signal'] != 0].dropna().iterrows():
        if row['result'] is not None:  # Apenas processa sinais com resultado
            update_model(row, row['result'])
            saved = save_signal_to_db(
                symbol, strategy_name, row['signal'], row['result'], 
                row['position_size'], row['close'], 
                sharpe_ratio=sharpe_ratio, max_drawdown=max_drawdown
            )
            if saved:
                signals_count += 1
                print(f"[{strategy_name}] {symbol}: sinal={row['signal']} resultado={row['result']} pos={row['position_size']}")
    
    return signals_count

def process_symbol(symbol):
    """
    Processa um único símbolo e retorna número de sinais gerados.
    
    Args:
        symbol: Símbolo do ativo
    
    Returns:
        int: Número de sinais gerados
    """
    df = get_candles(symbol, interval=INTERVAL, limit=CANDLE_LIMIT)
    if df.empty:
        print(f"Sem dados para: {symbol}")
        return 0

    df = extract_features(df)
    df['future'] = df['close'].shift(-5)
    df['high_prev'] = df['high'].shift(1)
    df['low_prev'] = df['low'].shift(1)
    df['atr_mean'] = df['atr'].rolling(14).mean()
    df['ma_fast'] = talib.SMA(df['close'], timeperiod=9)
    df['ma_slow'] = talib.SMA(df['close'], timeperiod=21)
    df['adx'] = talib.ADX(df['high'], df['low'], df['close'], timeperiod=14)

    signals_generated = 0
    signals_generated += process_strategy(df, symbol, "CLASSIC", generate_classic_signal)
    signals_generated += process_strategy(df, symbol, "FAST", generate_fast_signal)
    signals_generated += process_strategy(df, symbol, "RSI_MACD", strategy_rsi_macd)
    signals_generated += process_strategy(df, symbol, "BREAKOUT_ATR", strategy_breakout_atr)
    signals_generated += process_strategy(df, symbol, "TREND_ADX", strategy_trend_adx)
    signals_generated += process_strategy(df, symbol, "BOLLINGER_BANDS", strategy_bollinger_bands)
    
    return signals_generated

# ===============================
# PROCESSAMENTO PARALELO
# ===============================
def process_symbols_batch(symbols_batch):
    """
    Processa um lote de símbolos e retorna o número total de sinais gerados.
    
    Args:
        symbols_batch: Lista de símbolos para processar
    
    Returns:
        int: Número de sinais gerados
    """
    signals_count = 0
    for symbol in symbols_batch:
        try:
            symbol_signals = process_symbol(symbol)
            signals_count += symbol_signals
            # Respeita o rate limit
            time.sleep(1/MAX_REQUESTS_PER_SECOND)
        except Exception as e:
            print(f"Erro ao processar {symbol}: {str(e)}")
    return signals_count

def process_all_parallel():
    """
    Processa todos os símbolos em paralelo com rate limiting inteligente.
    
    Returns:
        dict: Estatísticas de processamento
    """
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
            try:
                batch_signals = future.result()
                total_signals += batch_signals
                
                # Salva o modelo periodicamente
                model_save_counter += 1
                if model_save_counter % 5 == 0:
                    save_model_periodically()
            except Exception as e:
                print(f"Erro ao processar lote: {str(e)}")
    
    # Salva o modelo final
    save_model_periodically()
    
    execution_time = time.time() - start_time
    
    # Salva metadados da execução
    print(f"Processamento concluído em {execution_time:.2f} segundos")
    print(f"Símbolos processados: {len(all_symbols)}")
    print(f"Sinais gerados: {total_signals}")
    
    return {
        "symbols_processed": len(all_symbols),
        "signals_generated": total_signals,
        "execution_time": execution_time
    }

# Adicionar função para testar estratégias individuais
def test_strategy(strategy_name, symbols=None, days=30):
    """
    Testa uma estratégia específica em um conjunto de símbolos
    e retorna estatísticas de performance.
    
    Args:
        strategy_name: Nome da estratégia para testar
        symbols: Lista de símbolos para testar (se None, usa todos disponíveis)
        days: Número de dias para analisar performance
    
    Returns:
        dict: Estatísticas de performance
    """
    strategy_functions = {
        "CLASSIC": generate_classic_signal,
        "FAST": generate_fast_signal,
        "RSI_MACD": strategy_rsi_macd,
        "BREAKOUT_ATR": strategy_breakout_atr,
        "TREND_ADX": strategy_trend_adx,
        "BOLLINGER_BANDS": strategy_bollinger_bands
    }
    
    if strategy_name not in strategy_functions:
        print(f"Estratégia '{strategy_name}' não encontrada!")
        return None
    
    # Se não foi especificado símbolos, usa uma amostra dos disponíveis
    if symbols is None:
        all_symbols = get_all_symbols()
        symbols = all_symbols[:5]  # Testa 5 símbolos para amostragem
    
    print(f"Testando estratégia {strategy_name} em {len(symbols)} símbolos...")
    
    total_signals = 0
    for symbol in symbols:
        df = get_candles(symbol, interval=INTERVAL, limit=CANDLE_LIMIT)
        if df.empty:
            continue
            
        df = extract_features(df)
        df['future'] = df['close'].shift(-5)
        df['high_prev'] = df['high'].shift(1)
        df['low_prev'] = df['low'].shift(1)
        df['atr_mean'] = df['atr'].rolling(14).mean()
        df['ma_fast'] = talib.SMA(df['close'], timeperiod=9)
        df['ma_slow'] = talib.SMA(df['close'], timeperiod=21)
        df['adx'] = talib.ADX(df['high'], df['low'], df['close'], timeperiod=14)
        df['volume_sma'] = talib.SMA(df['volume'], timeperiod=20)
        
        signals = process_strategy(df, symbol, strategy_name, strategy_functions[strategy_name])
        total_signals += signals
        
    # Calcula lucro para esta estratégia
    calculate_strategy_profit(strategy_name)
    
    # Retorna estatísticas atualizadas
    stats = get_strategy_performance(strategy_name)
    print(f"Estratégia {strategy_name} testada com {total_signals} sinais gerados.")
    
    return stats[0] if stats else None

# Adicionar função para comparar todas as estratégias
def compare_all_strategies():
    """
    Compara o desempenho de todas as estratégias implementadas.
    
    Returns:
        list: Lista de estatísticas de performance por estratégia
    """
    performance = get_strategy_performance()
    
    print("\n===== COMPARATIVO DE ESTRATÉGIAS =====")
    print(f"{'Estratégia':<15} {'Sinais':<8} {'Win Rate':<10} {'Lucro Médio':<12} {'Sharpe':<8} {'MaxDD':<8}")
    print("-" * 70)
    
    for strat in performance:
        print(f"{strat['strategy_name']:<15} {strat['total_signals']:<8} {strat['win_rate']:.2f}%    {strat['avg_profit']:.2f}%     {strat.get('sharpe_ratio', 0):.2f}    {strat.get('max_drawdown', 0):.2f}")
    
    return performance

def save_metadata(run_timestamp, symbols_count, signals_count, execution_time):
    """
    Salva metadados de execução no banco de dados.
    
    Args:
        run_timestamp: Timestamp da execução
        symbols_count: Número de símbolos processados
        signals_count: Número de sinais gerados
        execution_time: Tempo de execução em segundos
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Cria a tabela de metadados se não existir
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS execution_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            symbols_processed INTEGER,
            signals_generated INTEGER,
            execution_time REAL
        )
    ''')
    
    # Insere os metadados
    cursor.execute('''
        INSERT INTO execution_metadata
        (timestamp, symbols_processed, signals_generated, execution_time)
        VALUES (?, ?, ?, ?)
    ''', (run_timestamp, symbols_count, signals_count, execution_time))
    
    conn.commit()
    conn.close()

# ===============================
# MAIN
# ===============================
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Processa sinais de trading com várias estratégias.')
    parser.add_argument('--strategy', type=str, help='Nome da estratégia para testar (CLASSIC, FAST, RSI_MACD, BREAKOUT_ATR, TREND_ADX, BOLLINGER_BANDS)')
    parser.add_argument('--compare', action='store_true', help='Compara todas as estratégias')
    parser.add_argument('--process-all', action='store_true', help='Processa todos os símbolos com todas as estratégias')
    parser.add_argument('--test', action='store_true', help='Executa os testes automatizados')
    
    args = parser.parse_args()
    
    if args.test:
        import pytest
        pytest.main(['tests/', '--verbose'])
    elif args.strategy:
        stats = test_strategy(args.strategy)
        if stats:
            print(f"\nResultados para estratégia {args.strategy}:")
            print(f"Total de sinais: {stats['total_signals']}")
            print(f"Sinais vencedores: {stats['winning_signals']}")
            print(f"Taxa de acerto: {stats['win_rate']:.2f}%")
            print(f"Lucro médio: {stats['avg_profit']:.2f}%")
            if 'sharpe_ratio' in stats:
                print(f"Sharpe Ratio: {stats['sharpe_ratio']:.2f}")
            if 'max_drawdown' in stats:
                print(f"Maximum Drawdown: {stats['max_drawdown']:.2f}%")
    elif args.compare:
        compare_all_strategies()
    elif args.process_all:
        process_all_parallel()
    else:
        print("Nenhuma ação especificada. Use --strategy, --compare, --process-all ou --test")
        process_all_parallel()  # Comportamento padrão
