#!/usr/bin/env python3
# start_continuous_learning.py

"""
Script para iniciar o sistema de aprendizado contínuo do agente de trading.
Este script garante que o modelo ML seja retreinado automaticamente conforme
novos resultados de sinais são avaliados.
"""

import sys
import signal
from ml.continuous_learning import start_continuous_learning, stop_continuous_learning, get_learning_stats

def signal_handler(sig, frame):
    """Handler para interrupção do script."""
    print('\n🛑 Parando o agente de aprendizado contínuo...')
    stop_continuous_learning()
    sys.exit(0)

def main():
    """Função principal para iniciar o aprendizado contínuo."""
    print("🧠 SISTEMA DE APRENDIZADO CONTÍNUO DO AGENTE DE TRADING")
    print("=" * 60)
    
    # Configurar handler para CTRL+C
    signal.signal(signal.SIGINT, signal_handler)
    
    # Mostrar estatísticas iniciais
    stats = get_learning_stats()
    print("📊 Estatísticas iniciais:")
    print(f"   - Modelo existe: {stats['model_exists']}")
    print(f"   - Sinais processados: {stats['signals_processed']}")
    print(f"   - Último treinamento: {stats['last_training'] or 'Nunca'}")
    print()
    
    # Iniciar o sistema de aprendizado contínuo
    start_continuous_learning()
    
    # Manter o script rodando
    print("🔄 Sistema rodando... Pressione CTRL+C para parar")
    try:
        while True:
            import time
            time.sleep(10)
            
            # Mostrar estatísticas a cada 10 minutos
            import datetime
            current_time = datetime.datetime.now()
            if current_time.minute % 10 == 0 and current_time.second < 10:
                stats = get_learning_stats()
                print(f"📈 [{current_time.strftime('%H:%M')}] Sinais processados: {stats['signals_processed']} | "
                      f"Novos desde último treino: {stats.get('new_signals_since_training', 0)}")
                
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()