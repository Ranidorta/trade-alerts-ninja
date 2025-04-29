
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta
import os
import requests
from dotenv import load_dotenv
from services.signal_validation import validate_signal

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///signals.db")  # Default to SQLite if no DB URL
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
Base = declarative_base()

class Signal(Base):
    __tablename__ = 'signals'

    id = Column(Integer, primary_key=True)
    symbol = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    direction = Column(String)
    entry = Column(Float)
    tp1 = Column(Float)
    tp2 = Column(Float)
    tp3 = Column(Float)
    stop_loss = Column(Float)
    resultado = Column(String)

    def __repr__(self):
        return f"<Signal(symbol='{self.symbol}', direction='{self.direction}', entry={self.entry})>"

# Make sure the database tables exist
Base.metadata.create_all(engine)

BYBIT_ENDPOINT = "https://api.bybit.com/v5/market/kline"
INTERVAL = "15"
LOOKAHEAD_HOURS = 24

def get_candles(symbol, start_ms, end_ms):
    """
    Busca dados de candles da API Bybit.
    
    Args:
        symbol (str): Símbolo do par de trading
        start_ms (int): Timestamp inicial em milissegundos
        end_ms (int): Timestamp final em milissegundos
        
    Returns:
        list: Lista de candles
    """
    params = {
        "category": "linear",
        "symbol": symbol,
        "interval": INTERVAL,
        "start": start_ms,
        "end": end_ms,
        "limit": 200
    }
    try:
        resp = requests.get(BYBIT_ENDPOINT, params=params)
        return resp.json().get("result", {}).get("list", [])
    except Exception as e:
        print(f"Erro ao buscar candles: {e}")
        return []

def evaluate_signal(entry, tp1, tp2, tp3, sl, direction, candles):
    """
    Avalia um sinal baseado em dados históricos de candles.
    Esta função continua sendo usada para avaliações retrospectivas.
    
    Args:
        entry (float): Preço de entrada
        tp1 (float): Take profit 1
        tp2 (float): Take profit 2
        tp3 (float): Take profit 3
        sl (float): Stop loss
        direction (str): Direção do trade (long/short)
        candles (list): Lista de candles
        
    Returns:
        str: Resultado da avaliação (win, loss, partial, missed)
    """
    hit_tp1 = hit_tp2 = hit_tp3 = hit_sl = False

    for candle in candles:
        high = float(candle[2])
        low = float(candle[3])

        if direction.lower() == "long" or direction.lower() == "buy":
            if not hit_tp1 and high >= tp1: hit_tp1 = True
            if not hit_tp2 and high >= tp2: hit_tp2 = True
            if not hit_tp3 and high >= tp3: hit_tp3 = True
            if low <= sl: hit_sl = True; break
        elif direction.lower() == "short" or direction.lower() == "sell":
            if not hit_tp1 and low <= tp1: hit_tp1 = True
            if not hit_tp2 and low <= tp2: hit_tp2 = True
            if not hit_tp3 and low <= tp3: hit_tp3 = True
            if high >= sl: hit_sl = True; break

    if hit_sl:
        return "loss"
    elif hit_tp3:
        return "win"
    elif hit_tp1:
        return "partial"
    else:
        return "missed"

def evaluate_signal_with_candles(*args, **kwargs):
    """Alias for evaluate_signal for backward compatibility"""
    return evaluate_signal(*args, **kwargs)

def insert_test_data():
    """
    Insert test data into the database if it's empty.
    This is just for development purposes.
    """
    session = Session()
    # Check if database is empty
    count = session.query(Signal).count()
    if count == 0:
        print("Database is empty. Inserting test data...")
        
        # Sample data
        test_signals = [
            Signal(
                symbol="BTCUSDT",
                timestamp=datetime.utcnow() - timedelta(hours=24),
                direction="BUY",
                entry=93500.0,
                tp1=94000.0,
                tp2=94500.0,
                tp3=95000.0,
                stop_loss=93000.0,
                resultado="win"
            ),
            Signal(
                symbol="ETHUSDT",
                timestamp=datetime.utcnow() - timedelta(hours=12),
                direction="SELL",
                entry=1800.0,
                tp1=1750.0,
                tp2=1700.0,
                tp3=1650.0,
                stop_loss=1850.0,
                resultado="loss"
            ),
            Signal(
                symbol="ADAUSDT",
                timestamp=datetime.utcnow() - timedelta(hours=6),
                direction="BUY",
                entry=0.70,
                tp1=0.71,
                tp2=0.72,
                tp3=0.73,
                stop_loss=0.69,
                resultado="partial"
            )
        ]
        
        session.add_all(test_signals)
        session.commit()
        print(f"Added {len(test_signals)} test signals to database")
    
    session.close()

def main():
    """
    Função principal para avaliar sinais não avaliados ainda.
    Usa o novo sistema de validação quando possível, e o método antigo quando necessário.
    """
    # Create tables if they don't exist
    Base.metadata.create_all(engine)
    
    # Insert test data if database is empty
    insert_test_data()
    
    session = Session()
    try:
        # Buscar sinais sem resultado
        sinais = session.query(Signal).filter(Signal.resultado == None).all()

        for s in sinais:
            print(f"📊 Avaliando {s.symbol} - ID {s.id}")
            
            # Preparar sinal para avaliação
            signal_dict = {
                'id': s.id,
                'symbol': s.symbol,
                'direction': s.direction.upper() if s.direction else 'BUY',
                'entry': s.entry,
                'tp1': s.tp1,
                'tp2': s.tp2,
                'tp3': s.tp3,
                'sl': s.stop_loss,
                'stop_loss': s.stop_loss,
                'timestamp': s.timestamp.isoformat() if s.timestamp else None
            }
            
            # Tentar usar o sistema de validação em tempo real
            result = validate_signal(signal_dict)
            
            # Se não conseguir determinar o resultado, usar o método histórico
            if result is None:
                start = s.timestamp
                end = start + timedelta(hours=LOOKAHEAD_HOURS)
                start_ms = int(start.timestamp() * 1000)
                end_ms = int(end.timestamp() * 1000)

                candles = get_candles(s.symbol, start_ms, end_ms)
                if not candles:
                    continue

                result = evaluate_signal(
                    s.entry, s.tp1, s.tp2, s.tp3, s.stop_loss, 
                    s.direction.lower() if s.direction else 'long', 
                    candles
                )
            
            # Atualizar resultado no banco
            s.resultado = result
            print(f"✅ Sinal {s.id}: {result}")

        # Salvar todas as mudanças
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Erro na avaliação de sinais: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    main()
