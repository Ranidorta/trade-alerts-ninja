
"""
API endpoint for monster signal generation
"""

from flask import Blueprint, jsonify, request
import sys
import os

# Add the project root to the path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from signals.generator_v2 import TradeAgent
import logging

# Create blueprint for monster signals
monster_signals_api = Blueprint('monster_signals', __name__)

logger = logging.getLogger("MonsterSignalsAPI")

@monster_signals_api.route('/api/signals/generate/monster', methods=['POST'])
def generate_monster_signals():
    """
    Generate monster signals using the advanced TradeAgent from generator_v2.py
    """
    try:
        # Get symbols from request or use default list
        data = request.get_json() or {}
        symbols = data.get('symbols', [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT', 
            'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
        ])
        
        # Initialize TradeAgent with default config
        config = {
            "db_path": "signals.db",
            "enable_learning": True,
            "feature_window": 50,
            "min_success_prob": 0.6,
            "min_context_score": 0.6,
            "llm_config": {},
            "alert_config": {}
        }
        
        agent = TradeAgent(config)
        
        # Generate signals for each symbol
        generated_signals = []
        
        for symbol in symbols:
            try:
                signal = agent.generate_signal_monster(symbol)
                if signal:
                    # Convert to frontend format
                    frontend_signal = {
                        'id': f"monster_{signal['symbol']}_{signal['timestamp']}",
                        'symbol': signal['symbol'],
                        'pair': signal['symbol'],
                        'direction': signal['direction'],
                        'type': 'LONG' if signal['direction'] == 'BUY' else 'SHORT',
                        'entryPrice': signal['entry_price'],
                        'stopLoss': signal['sl'],
                        'status': 'WAITING',
                        'strategy': signal.get('strategy', 'monster_1h_15m_multi'),
                        'createdAt': signal['timestamp'],
                        'result': None,
                        'profit': None,
                        'rsi': signal.get('rsi'),
                        'atr': signal.get('atr'),
                        'success_prob': signal.get('success_prob', 0.75),
                        'targets': [
                            {
                                'level': 1,
                                'price': signal.get('tp1', signal['tp']),
                                'hit': False
                            },
                            {
                                'level': 2, 
                                'price': signal.get('tp2', signal['tp'] * 1.02),
                                'hit': False
                            },
                            {
                                'level': 3,
                                'price': signal.get('tp3', signal['tp']),
                                'hit': False
                            }
                        ]
                    }
                    generated_signals.append(frontend_signal)
                    
            except Exception as e:
                logger.error(f"Error generating signal for {symbol}: {str(e)}")
                continue
        
        logger.info(f"Generated {len(generated_signals)} monster signals from {len(symbols)} symbols")
        
        return jsonify({
            'signals': generated_signals,
            'total': len(generated_signals),
            'strategy': 'monster_1h_15m_multi',
            'timestamp': agent.lastUpdated if hasattr(agent, 'lastUpdated') else None
        })
        
    except Exception as e:
        logger.error(f"Error in generate_monster_signals: {str(e)}")
        return jsonify({
            'error': 'Failed to generate monster signals',
            'message': str(e),
            'signals': [],
            'total': 0
        }), 500

@monster_signals_api.route('/api/signals/generate/monster/status', methods=['GET'])
def get_monster_generation_status():
    """
    Get the status of monster signal generation
    """
    try:
        return jsonify({
            'status': 'ready',
            'available_symbols': [
                'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
                'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
            ],
            'strategy': 'monster_1h_15m_multi',
            'description': 'Advanced multi-timeframe signal generation with strict filtering'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
