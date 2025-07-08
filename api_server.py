#!/usr/bin/env python3
"""
API Server para conectar frontend React com backend Monster V2 + IA Adaptativa
Execute: python api_server.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import logging
from datetime import datetime
import json

# Adiciona diretório raiz ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Imports do sistema Monster V2
from signals.generator_v2 import generate_signal
from adaptive_ai.adaptive_agent import AdaptiveTradingAgent
from utils.signal_storage import get_all_signals, insert_signal
from api.bybit import get_candles
from utils.risk_manager import manage_risk
from signals.validator import validate_signal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s'
)

logger = logging.getLogger("MonsterAPI")

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Permite requisições do frontend React

# Initialize adaptive agent
adaptive_agent = None
try:
    adaptive_agent = AdaptiveTradingAgent()
    if adaptive_agent.load_model():
        logger.info("✅ Agente adaptativo carregado com sucesso")
    else:
        logger.warning("⚠️ Modelo adaptativo não encontrado - usando parâmetros padrão")
except Exception as e:
    logger.error(f"❌ Erro ao inicializar agente adaptativo: {e}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Monster V2 API",
        "adaptive_ai": adaptive_agent is not None and adaptive_agent.is_trained,
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/signals/generate/monster', methods=['POST'])
def generate_monster_signals():
    """
    Gera sinais Monster V2 com IA adaptativa
    """
    try:
        data = request.json or {}
        symbols = data.get('symbols', [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
            'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
        ])
        
        logger.info(f"🚀 Gerando sinais Monster V2 para {len(symbols)} símbolos")
        
        generated_signals = []
        
        for symbol in symbols[:5]:  # Limita a 5 símbolos para performance
            try:
                logger.info(f"📊 Analisando {symbol}...")
                
                # Gera sinal usando sistema adaptativo
                raw_signal = generate_signal(symbol)
                
                if raw_signal:
                    # Valida sinal
                    valid_signal = validate_signal(raw_signal)
                    
                    if valid_signal:
                        # Aplica gestão de risco
                        final_signal = manage_risk(valid_signal)
                        
                        if final_signal:
                            # Converte para formato do frontend
                            frontend_signal = convert_to_frontend_format(final_signal)
                            generated_signals.append(frontend_signal)
                            
                            # Salva no banco
                            insert_signal(final_signal)
                            
                            logger.info(f"✅ Sinal gerado: {symbol} {final_signal['signal']}")
                        else:
                            logger.info(f"🛑 Sinal bloqueado por gestão de risco: {symbol}")
                    else:
                        logger.info(f"❌ Sinal inválido: {symbol}")
                
            except Exception as e:
                logger.error(f"❌ Erro processando {symbol}: {e}")
                continue
        
        logger.info(f"🏁 Geração concluída: {len(generated_signals)} sinais válidos")
        
        return jsonify({
            "success": True,
            "signals": generated_signals,
            "total_generated": len(generated_signals),
            "symbols_processed": len(symbols),
            "adaptive_ai_active": adaptive_agent is not None and adaptive_agent.is_trained,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Erro na geração de sinais: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "signals": []
        }), 500

@app.route('/api/signals/generate/monster/status', methods=['GET'])
def get_monster_status():
    """
    Retorna status do sistema Monster V2
    """
    try:
        # Status do agente adaptativo
        adaptive_status = {
            "loaded": adaptive_agent is not None,
            "trained": adaptive_agent.is_trained if adaptive_agent else False,
            "model_path": adaptive_agent.model_path if adaptive_agent else None
        }
        
        # Últimos sinais
        recent_signals = get_all_signals(10)
        
        return jsonify({
            "status": "active",
            "adaptive_ai": adaptive_status,
            "recent_signals_count": len(recent_signals),
            "last_signal_time": recent_signals[0].get('timestamp') if recent_signals else None,
            "version": "Monster V2 + Adaptive AI",
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Erro ao obter status: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/api/signals/history', methods=['GET'])
def get_signals_history():
    """
    Retorna histórico de sinais do backend
    """
    try:
        limit = int(request.args.get('limit', 100))
        symbol = request.args.get('symbol')
        
        signals = get_all_signals(limit)
        
        # Filtra por símbolo se especificado
        if symbol:
            signals = [s for s in signals if s.get('symbol', '').upper() == symbol.upper()]
        
        # Converte para formato frontend
        frontend_signals = [convert_to_frontend_format(s) for s in signals]
        
        return jsonify(frontend_signals)
        
    except Exception as e:
        logger.error(f"❌ Erro ao obter histórico: {e}")
        return jsonify([]), 500

@app.route('/api/adaptive/status', methods=['GET'])
def get_adaptive_status():
    """
    Status detalhado da IA adaptativa
    """
    try:
        if not adaptive_agent:
            return jsonify({
                "active": False,
                "error": "Agente adaptativo não inicializado"
            })
        
        status = adaptive_agent.get_model_status()
        
        return jsonify({
            "active": True,
            "model_status": status,
            "performance": adaptive_agent._evaluate_performance(num_episodes=3) if status['is_trained'] else None,
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Erro ao obter status adaptativo: {e}")
        return jsonify({
            "active": False,
            "error": str(e)
        }), 500

def convert_to_frontend_format(backend_signal):
    """
    Converte sinal do backend para formato esperado pelo frontend
    """
    return {
        "id": f"monster-{backend_signal.get('symbol', 'UNKNOWN')}-{int(datetime.now().timestamp() * 1000)}",
        "symbol": backend_signal.get('symbol', 'UNKNOWN'),
        "direction": backend_signal.get('signal', 'BUY').upper(),
        "entryPrice": float(backend_signal.get('entry_price', 0)),
        "stopLoss": float(backend_signal.get('sl', 0)),
        "tp1": float(backend_signal.get('tp1', 0)),
        "tp2": float(backend_signal.get('tp2', 0)),
        "tp3": float(backend_signal.get('tp3', 0)),
        "leverage": int(backend_signal.get('leverage', 1)),
        "status": "ACTIVE",
        "createdAt": datetime.utcnow().isoformat(),
        "strategy": "Monster V2 + Adaptive AI",
        "rsi": backend_signal.get('rsi'),
        "atr": backend_signal.get('atr'),
        "confidence": backend_signal.get('ml_prediction', 'MODERATE'),
        "adaptiveParams": backend_signal.get('adaptive_adjustments', {}),
        "risk": backend_signal.get('risk', 0.02)
    }

if __name__ == "__main__":
    logger.info("🚀 Iniciando Monster V2 API Server...")
    logger.info("📡 Frontend pode acessar via: http://localhost:5000")
    logger.info("🤖 IA Adaptativa: " + ("ATIVA" if adaptive_agent and adaptive_agent.is_trained else "PADRÃO"))
    
    # Executa servidor
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True
    )