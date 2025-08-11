#!/usr/bin/env python3
# run_with_continuous_learning.py

"""
Script principal que executa o sistema de trading com aprendizado contínuo.
Este script combina:
- Geração de sinais
- Avaliação de sinais
- Aprendizado contínuo do modelo ML
"""

import threading
import time
import signal
import sys
from datetime import datetime

def signal_handler(sig, frame):
    """Handler para interrupção do script."""
    print('\n🛑 Parando todos os sistemas...')
    sys.exit(0)

def start_signal_generator():
    """Inicia o gerador de sinais em thread separada."""
    try:
        from main_signal_generator import run_signal_generator
        print("🚀 Iniciando gerador de sinais...")
        run_signal_generator()
    except Exception as e:
        print(f"❌ Erro no gerador de sinais: {e}")

def start_signal_evaluator():
    """Inicia o avaliador de sinais em thread separada."""
    try:
        from utils.signal_evaluator import start_evaluator
        print("📊 Iniciando avaliador de sinais...")
        start_evaluator(interval=300)  # Avaliar a cada 5 minutos
    except Exception as e:
        print(f"❌ Erro no avaliador de sinais: {e}")

def start_continuous_learning_system():
    """Inicia o sistema de aprendizado contínuo."""
    try:
        from ml.continuous_learning import start_continuous_learning
        print("🧠 Iniciando sistema de aprendizado contínuo...")
        start_continuous_learning()
    except Exception as e:
        print(f"❌ Erro no sistema de aprendizado: {e}")

def main():
    """Função principal que coordena todos os sistemas."""
    print("🤖 SISTEMA COMPLETO DE TRADING COM IA")
    print("=" * 50)
    print(f"⏰ Iniciado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Configurar handler para CTRL+C
    signal.signal(signal.SIGINT, signal_handler)
    
    # Iniciar todos os sistemas em threads separadas
    threads = []
    
    # Thread 1: Sistema de aprendizado contínuo
    learning_thread = threading.Thread(target=start_continuous_learning_system, daemon=True)
    learning_thread.start()
    threads.append(learning_thread)
    time.sleep(2)  # Dar tempo para inicializar
    
    # Thread 2: Avaliador de sinais
    evaluator_thread = threading.Thread(target=start_signal_evaluator, daemon=True)
    evaluator_thread.start()
    threads.append(evaluator_thread)
    time.sleep(2)  # Dar tempo para inicializar
    
    # Thread 3: Gerador de sinais (principal)
    generator_thread = threading.Thread(target=start_signal_generator, daemon=True)
    generator_thread.start()
    threads.append(generator_thread)
    
    print("✅ Todos os sistemas iniciados com sucesso!")
    print()
    print("🔄 Sistema rodando... Componentes ativos:")
    print("   🧠 Aprendizado Contínuo - Retreina modelo automaticamente")
    print("   📊 Avaliador de Sinais - Avalia resultados em tempo real")
    print("   🚀 Gerador de Sinais - Gera novos sinais de trading")
    print()
    print("Pressione CTRL+C para parar todos os sistemas")
    
    # Manter o script principal rodando
    try:
        while True:
            time.sleep(60)
            
            # Status a cada hora
            current_time = datetime.now()
            if current_time.minute == 0:
                print(f"💓 [{current_time.strftime('%H:%M')}] Sistema funcionando normalmente")
                
                # Mostrar estatísticas do aprendizado
                try:
                    from ml.continuous_learning import get_learning_stats
                    stats = get_learning_stats()
                    print(f"   📈 Sinais processados: {stats['signals_processed']}")
                    print(f"   🤖 Modelo ativo: {stats['model_exists']}")
                    if stats['last_training']:
                        print(f"   🔄 Último treino: {stats['last_training']}")
                except:
                    pass
                    
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()