
"""
Agente de Trade Automatizado com suporte a Sinais Clássicos e Rápidos, aprendizado contínuo e vetorização.
Esta versão foi restaurada após rollback, com foco em reconstrução limpa e progressiva.
"""

import pandas as pd
import numpy as np
import talib
import os
import joblib
from river import linear_model, preprocessing
from flask import Flask, jsonify, request
from flask_cors import CORS
import uuid
import json
from datetime import datetime, timedelta
import ccxt

# Flask app setup
app = Flask(__name__)
CORS(app)

# Configurações básicas
MODEL_PATH = "model.pkl"
DATA_FOLDER = "data/"
SUPPORTED_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

# Parâmetros da estratégia
RSI_THRESHOLD_BUY = 30
RSI_THRESHOLD_SELL = 70
RISK_REWARD_RATIO = 1.5
RISK_PER_TRADE = 0.02
ACCOUNT_BALANCE = 10000

# Inicialização do modelo de aprendizado
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
else:
    model = preprocessing.StandardScaler() | linear_model.LogisticRegression()

# Inicializar a exchange Bybit para dados de mercado
try:
    bybit = ccxt.bybit()
except Exception as e:
    print(f"Erro ao inicializar Bybit: {str(e)}")
    bybit = None


def extract_features(df):
    df['rsi'] = talib.RSI(df['close'], timeperiod=14)
    df['ma_short'] = talib.SMA(df['close'], timeperiod=5)
    df['ma_long'] = talib.SMA(df['close'], timeperiod=20)
    df['atr'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=14)
    df['macd'], df['macd_signal'], _ = talib.MACD(df['close'], 12, 26, 9)
    return df.dropna()


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


def simulate_trade(row):
    tp = row['atr'] * RISK_REWARD_RATIO
    sl = row['atr']
    entry = row['close']
    future = row['future']
    signal = row['signal']
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
    x = {
        'rsi': row['rsi'],
        'ma_diff': row['ma_short'] - row['ma_long'],
        'macd': row['macd'],
        'atr': row['atr']
    }
    model.learn_one(x, outcome)
    joblib.dump(model, MODEL_PATH)


def calculate_position_size(capital, atr, risk_pct):
    risk = capital * risk_pct
    return round(risk / atr, 2) if atr > 0 else 0


def fetch_market_data(symbol, timeframe='1h', limit=100):
    if bybit:
        try:
            ohlcv = bybit.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except Exception as e:
            print(f"Erro ao buscar dados de {symbol}: {str(e)}")
    
    # Fallback para dados salvos localmente
    path = os.path.join(DATA_FOLDER, f"{symbol}.csv")
    if os.path.exists(path):
        return pd.read_csv(path)
    
    # Criar dados aleatórios como último recurso
    print(f"Gerando dados aleatórios para {symbol}")
    base_price = 100 if symbol == "ETHUSDT" else 20000 if symbol == "BTCUSDT" else 50
    timestamps = [datetime.now() - timedelta(hours=i) for i in range(limit, 0, -1)]
    
    data = {
        'timestamp': timestamps,
        'open': [base_price * (1 + 0.01 * np.random.randn()) for _ in range(limit)],
        'high': [],
        'low': [],
        'close': [],
        'volume': [1000000 * np.random.random() for _ in range(limit)]
    }
    
    for i in range(limit):
        open_price = data['open'][i]
        close_price = open_price * (1 + 0.02 * np.random.randn())
        high_price = max(open_price, close_price) * (1 + 0.01 * abs(np.random.randn()))
        low_price = min(open_price, close_price) * (1 - 0.01 * abs(np.random.randn()))
        
        data['close'].append(close_price)
        data['high'].append(high_price)
        data['low'].append(low_price)
    
    return pd.DataFrame(data)


def get_current_price(symbol):
    if bybit:
        try:
            ticker = bybit.fetch_ticker(symbol)
            return ticker['last']
        except Exception as e:
            print(f"Erro ao buscar preço atual de {symbol}: {str(e)}")
    
    # Fallback: retornar último preço dos dados OHLCV
    df = fetch_market_data(symbol, limit=1)
    if not df.empty:
        return df['close'].iloc[-1]
    
    # Valores de fallback razoáveis
    fallback_prices = {
        "BTCUSDT": 45000,
        "ETHUSDT": 2200,
        "SOLUSDT": 120
    }
    return fallback_prices.get(symbol, 100)


def create_trading_signal(symbol, signal_type="CLASSIC"):
    df = fetch_market_data(symbol)
    if df.empty:
        return None
    
    # Preparar dados
    df = extract_features(df)
    
    # Gerar sinal
    if signal_type == "CLASSIC":
        df['signal'] = df.apply(generate_classic_signal, axis=1)
    else:  # FAST
        df['signal'] = df.apply(generate_fast_signal, axis=1)
    
    # Obter último sinal
    last_row = df.iloc[-1]
    signal_value = last_row['signal']
    
    if signal_value == 0:
        return None  # Sem sinal
    
    # Calcular entry, stop loss e take profit
    current_price = get_current_price(symbol)
    atr = last_row['atr']
    
    entry_min = current_price * 0.995
    entry_max = current_price * 1.005
    
    # Determinar tipo e direção
    signal_type_str = "LONG" if signal_value == 1 else "SHORT"
    direction = "BUY" if signal_value == 1 else "SELL"
    
    # Calcular stop loss e targets
    stop_loss = current_price * (1 - 0.02) if signal_value == 1 else current_price * (1 + 0.02)
    
    targets = []
    for i in range(3):
        target_price = current_price * (1 + (i+1) * 0.02) if signal_value == 1 else current_price * (1 - (i+1) * 0.02)
        targets.append({
            "level": i + 1,
            "price": target_price,
            "hit": False
        })
    
    # Calcular tamanho da posição
    position_size = calculate_position_size(ACCOUNT_BALANCE, atr, RISK_PER_TRADE)
    
    # Criar resposta
    signal_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    # Extracto de par
    pair = "USDT"
    if "USDT" in symbol:
        coin = symbol.replace("USDT", "")
        pair = f"{coin}/USDT"
    
    response = {
        "id": signal_id,
        "symbol": symbol,
        "pair": pair,
        "direction": direction,
        "entryMin": entry_min,
        "entryMax": entry_max,
        "entryAvg": current_price,
        "stopLoss": stop_loss,
        "targets": targets,
        "leverage": 5,  # Leverage padrão
        "status": "ACTIVE",
        "createdAt": timestamp,
        "updatedAt": timestamp,
        "currentPrice": current_price,
        "timeframe": "1h",
        "type": signal_type_str,
        "signalGenerator": signal_type,
        "technicalIndicators": {
            "rsi": last_row['rsi'],
            "macd": last_row['macd'],
            "macdSignal": last_row['macd_signal'],
            "shortMa": last_row['ma_short'],
            "longMa": last_row['ma_long'],
            "signal": signal_value,
            "atr": atr,
            "positionSize": position_size
        }
    }
    
    return response


def process_symbol(symbol):
    path = os.path.join(DATA_FOLDER, f"{symbol}.csv")
    if not os.path.exists(path):
        print(f"Arquivo não encontrado: {symbol}")
        return

    df = pd.read_csv(path)
    df = extract_features(df)
    df['future'] = df['close'].shift(-5)

    for tipo, generator in [('CLASSIC', generate_classic_signal), ('FAST', generate_fast_signal)]:
        df['signal'] = df.apply(generator, axis=1)
        df['result'] = df.apply(simulate_trade, axis=1)
        df['position_size'] = df.apply(lambda r: calculate_position_size(ACCOUNT_BALANCE, r['atr'], RISK_PER_TRADE), axis=1)

        for _, row in df[df['signal'] != 0].dropna().iterrows():
            update_model(row, row['result'])
            print(f"[{tipo}] {symbol}: sinal={row['signal']} resultado={row['result']} pos={row['position_size']}")


def process_all():
    for symbol in SUPPORTED_SYMBOLS:
        process_symbol(symbol)


# API Routes
@app.route('/api/signals', methods=['GET'])
def get_all_signals():
    signals = []
    for symbol in SUPPORTED_SYMBOLS:
        classic_signal = create_trading_signal(symbol, "CLASSIC")
        if classic_signal:
            signals.append(classic_signal)
        
        fast_signal = create_trading_signal(symbol, "FAST")
        if fast_signal:
            signals.append(fast_signal)
    
    return jsonify(signals)


@app.route('/api/signals/<symbol>', methods=['GET'])
def get_symbol_signal(symbol):
    signal_type = request.args.get('type', 'CLASSIC')
    if signal_type not in ['CLASSIC', 'FAST']:
        return jsonify({"error": "Invalid signal type. Use 'CLASSIC' or 'FAST'"}), 400
    
    if symbol not in SUPPORTED_SYMBOLS:
        return jsonify({"error": f"Symbol {symbol} not supported. Use one of {SUPPORTED_SYMBOLS}"}), 400
    
    signal = create_trading_signal(symbol, signal_type)
    if signal:
        return jsonify(signal)
    else:
        return jsonify({"message": f"No {signal_type} signals for {symbol} at this time"}), 404


@app.route('/api/market-data/<symbol>', methods=['GET'])
def get_market_data(symbol):
    timeframe = request.args.get('timeframe', '1h')
    limit = int(request.args.get('limit', 100))
    
    df = fetch_market_data(symbol, timeframe, limit)
    if df.empty:
        return jsonify({"error": f"No data available for {symbol}"}), 404
    
    # Converter para o formato esperado pelo frontend
    result = []
    for _, row in df.iterrows():
        timestamp = int(pd.Timestamp(row['timestamp']).timestamp() * 1000)
        result.append({
            "time": timestamp,
            "price": row['close']
        })
    
    return jsonify(result)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "supported_symbols": SUPPORTED_SYMBOLS
    })


if __name__ == '__main__':
    # Processar os dados históricos
    process_all()
    print("Processamento de sinais concluído.")
    
    # Iniciar API
    app.run(host='0.0.0.0', port=5000, debug=True)
