
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
    timestamp = Column(DateTime)
    direction = Column(String)
    entry = Column(Float)
    tp1 = Column(Float)
    tp2 = Column(Float)
    tp3 = Column(Float)
    stop_loss = Column(Float)
    resultado = Column(String)

BYBIT_ENDPOINT = "https://api.bybit.com/v5/market/kline"
INTERVAL = "15"
LOOKAHEAD_HOURS = 24

def get_candles(symbol, start_ms, end_ms):
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

def evaluate_signal_with_candles(entry, tp1, tp2, tp3, sl, direction, candles):
    """
    Avalia um sinal baseado em dados históricos de candles.
    Esta função continua sendo usada para avaliações retrospectivas.
    """
    hit_tp1 = hit_tp2 = hit_tp3 = hit_sl = False

    for candle in candles:
        high = float(candle[2])
        low = float(candle[3])

        if direction == "long":
            if not hit_tp1 and high >= tp1: hit_tp1 = True
            if not hit_tp2 and high >= tp2: hit_tp2 = True
            if not hit_tp3 and high >= tp3: hit_tp3 = True
            if low <= sl: hit_sl = True; break
        elif direction == "short":
            if not hit_tp1 and low <= tp1: hit_tp1 = True
            if not hit_tp2 and low <= tp2: hit_tp2 = True
            if not hit_tp3 and low <= tp3: hit_tp3 = True
            if high >= sl: hit_sl = True; break

    if hit_sl:
        return "loss"    # Changed from "perdedor" to "loss"
    elif hit_tp3:
        return "win"     # Changed from "vencedor" to "win"
    elif hit_tp1:
        return "partial" # Changed from "parcial" to "partial"
    else:
        return "missed"  # Changed from "falso" to "missed"

def main():
    """
    Função principal modificada para usar o novo sistema de validação
    quando disponível, e cair de volta para o método antigo se necessário.
    """
    # Create tables if they don't exist
    Base.metadata.create_all(engine)
    
    session = Session()
    sinais = session.query(Signal).filter(Signal.resultado == None).all()

    for s in sinais:
        print(f"📊 Avaliando {s.symbol} - ID {s.id}")
        
        # Primeiro tentamos usar o novo sistema de validação
        signal_dict = {
            'id': s.id,
            'symbol': s.symbol,
            'direction': s.direction.upper() if s.direction else 'BUY',
            'tp1': s.tp1,
            'tp2': s.tp2,
            'tp3': s.tp3,
            'sl': s.stop_loss,
            'timestamp': s.timestamp.isoformat() if s.timestamp else None
        }
        
        result = validate_signal(signal_dict)
        
        # Se o novo sistema não conseguir determinar um resultado, usamos o método anterior
        if result is None:
            start = s.timestamp
            end = start + timedelta(hours=LOOKAHEAD_HOURS)
            start_ms = int(start.timestamp() * 1000)
            end_ms = int(end.timestamp() * 1000)

            candles = get_candles(s.symbol, start_ms, end_ms)
            if not candles:
                continue

            result = evaluate_signal_with_candles(
                s.entry, s.tp1, s.tp2, s.tp3, s.stop_loss, 
                s.direction.lower() if s.direction else 'long', 
                candles
            )
        
        s.resultado = result
        print(f"✅ Sinal {s.id}: {result}")

    session.commit()
    session.close()

if __name__ == "__main__":
    main()
