#!/usr/bin/env python3
"""
Script para configurar o sistema de IA Adaptativa do Monster V2
Execute: python scripts/setup_adaptive_ai.py
"""

import sys
import os
import logging

# Adiciona o diretório raiz ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s'
)

logger = logging.getLogger("SetupAdaptiveAI")

def check_dependencies():
    """Verifica se as dependências estão instaladas"""
    logger.info("🔍 Verificando dependências...")
    
    required_packages = [
        'stable_baselines3',
        'gym', 
        'torch',
        'numpy',
        'matplotlib'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            logger.info(f"   ✅ {package}")
        except ImportError:
            missing_packages.append(package)
            logger.warning(f"   ❌ {package}")
    
    if missing_packages:
        logger.error(f"❌ Pacotes faltando: {', '.join(missing_packages)}")
        logger.info("Execute: pip install stable-baselines3 gym torch matplotlib")
        return False
    
    logger.info("✅ Todas as dependências estão instaladas")
    return True

def setup_directories():
    """Cria diretórios necessários"""
    logger.info("📁 Configurando diretórios...")
    
    directories = [
        'models',
        'logs',
        'data',
        'adaptive_ai_tensorboard'
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            logger.info(f"   📁 Criado: {directory}")
        else:
            logger.info(f"   ✅ Existente: {directory}")

def test_environment():
    """Testa o ambiente de trading"""
    logger.info("🧪 Testando ambiente de trading...")
    
    try:
        from adaptive_ai.trading_env import TradingEnv
        from adaptive_ai.adaptive_agent import AdaptiveTradingAgent
        
        # Teste básico do ambiente
        env = TradingEnv()
        obs = env.reset()
        
        logger.info(f"   📊 Observation space: {env.observation_space}")
        logger.info(f"   🎮 Action space: {env.action_space}")
        logger.info(f"   🔢 Initial observation: {obs}")
        
        # Teste de um step
        action = env.action_space.sample()
        obs, reward, done, info = env.step(action)
        
        logger.info(f"   🎯 Sample action: {action}")
        logger.info(f"   💰 Reward: {reward}")
        logger.info(f"   📊 Info: {info}")
        
        logger.info("✅ Ambiente testado com sucesso")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erro no teste do ambiente: {e}")
        return False

def main():
    """Função principal de configuração"""
    logger.info("🚀 Configurando Sistema de IA Adaptativa Monster V2")
    logger.info("=" * 60)
    
    # 1. Verificar dependências
    if not check_dependencies():
        logger.error("❌ Configuração falhou devido a dependências faltando")
        return False
    
    # 2. Configurar diretórios
    setup_directories()
    
    # 3. Testar ambiente
    if not test_environment():
        logger.error("❌ Configuração falhou no teste do ambiente")
        return False
    
    logger.info("=" * 60)
    logger.info("✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!")
    logger.info("")
    logger.info("📋 PRÓXIMOS PASSOS:")
    logger.info("1. Execute: python adaptive_ai/train_agent.py")
    logger.info("2. Aguarde o treinamento (pode levar alguns minutos)")
    logger.info("3. Execute seu sistema Monster V2 normalmente")
    logger.info("4. O agente adaptativo irá otimizar automaticamente!")
    logger.info("")
    logger.info("🔧 COMANDOS ÚTEIS:")
    logger.info("   - Treinar novo modelo: python adaptive_ai/train_agent.py")
    logger.info("   - Ver logs TensorBoard: tensorboard --logdir adaptive_ai_tensorboard")
    logger.info("   - Configurar novamente: python scripts/setup_adaptive_ai.py")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)