#!/usr/bin/env python3
"""
Script para iniciar o servidor API Monster V2 com IA Adaptativa
Execute: python start_monster_api.py
"""

import subprocess
import sys
import os
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s'
)

logger = logging.getLogger("MonsterAPIStarter")

def check_dependencies():
    """Verifica se as dependências estão instaladas"""
    logger.info("🔍 Verificando dependências...")
    
    required_packages = [
        'flask',
        'flask_cors', 
        'stable_baselines3',
        'gym',
        'numpy',
        'pandas'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('_', '-'))
            logger.info(f"   ✅ {package}")
        except ImportError:
            missing.append(package)
            logger.warning(f"   ❌ {package}")
    
    if missing:
        logger.error(f"❌ Pacotes faltando: {', '.join(missing)}")
        logger.info("Execute: pip install flask flask-cors stable-baselines3 gym numpy pandas")
        return False
    
    return True

def setup_adaptive_ai():
    """Configura e treina IA adaptativa se necessário"""
    logger.info("🤖 Configurando IA Adaptativa...")
    
    try:
        # Executa setup se não foi feito antes
        if not os.path.exists("models/adaptive_trading_agent.zip"):
            logger.info("📁 Modelo não encontrado, executando setup...")
            subprocess.run([sys.executable, "scripts/setup_adaptive_ai.py"], check=True)
            
            logger.info("🎯 Treinando agente adaptativo...")
            subprocess.run([sys.executable, "adaptive_ai/train_agent.py"], check=True)
            
            logger.info("✅ IA Adaptativa configurada com sucesso!")
        else:
            logger.info("✅ Modelo adaptativo já existe")
            
    except Exception as e:
        logger.warning(f"⚠️ Erro na configuração da IA: {e}")
        logger.info("O sistema funcionará com parâmetros padrão")

def start_api_server():
    """Inicia o servidor API"""
    logger.info("🚀 Iniciando Monster V2 API Server...")
    
    try:
        # Executa o servidor API
        subprocess.run([sys.executable, "api_server.py"], check=True)
        
    except KeyboardInterrupt:
        logger.info("❌ Servidor interrompido pelo usuário")
    except Exception as e:
        logger.error(f"❌ Erro ao iniciar servidor: {e}")

def main():
    """Função principal"""
    logger.info("=" * 60)
    logger.info("🚀 MONSTER V2 API STARTER")
    logger.info("=" * 60)
    
    # 1. Verificar dependências
    if not check_dependencies():
        logger.error("❌ Falha na verificação de dependências")
        return
    
    # 2. Configurar IA Adaptativa
    setup_adaptive_ai()
    
    # 3. Iniciar servidor API
    start_api_server()

if __name__ == "__main__":
    main()