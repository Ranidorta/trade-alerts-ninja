CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    symbol TEXT,
    direction TEXT,
    entry_price REAL,
    sl REAL,
    tp REAL,
    atr REAL,
    timestamp TEXT,
    expires TEXT,
    timeframe TEXT,
    score REAL,
    context TEXT,
    success_prob REAL,
    result REAL,
    features BLOB,
    closed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS market_states (
    timestamp TEXT,
    symbol TEXT,
    rsi REAL,
    atr REAL,
    ema_diff REAL,
    volume_ratio REAL,
    PRIMARY KEY (timestamp, symbol)
);

CREATE TABLE IF NOT EXISTS model_performance (
    timestamp TEXT PRIMARY KEY,
    accuracy REAL,
    precision REAL,
    recall REAL,
    f1_score REAL,
    model_version TEXT
);
