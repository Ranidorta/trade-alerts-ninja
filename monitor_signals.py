
#!/usr/bin/env python3
"""
Script para iniciar o monitoramento de sinais de trading.
Este script pode ser executado como um processo separado para validar continuamente
os sinais de trading abertos.
"""

import logging
import sys
import time
from services.signal_validation import start_monitoring, stop_monitoring

# Configuração do logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('signal_monitor.log')
    ]
)

logger = logging.getLogger("SignalMonitor")

def main():
    """Função principal para iniciar o monitoramento"""
    try:
        logger.info("Iniciando monitoramento de sinais...")
        start_monitoring()
        
        # Mantém o script rodando
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Monitoramento interrompido pelo usuário.")
    except Exception as e:
        logger.error(f"Erro no monitoramento de sinais: {e}")
    finally:
        stop_monitoring()
        logger.info("Monitoramento de sinais finalizado.")

if __name__ == "__main__":
    main()
