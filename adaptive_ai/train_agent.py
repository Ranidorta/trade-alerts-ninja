#!/usr/bin/env python3
"""
Script para treinar o agente adaptativo do Monster V2
Execute: python adaptive_ai/train_agent.py
"""

import sys
import os
import logging

# Adiciona o diretório raiz ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from adaptive_ai.adaptive_agent import AdaptiveTradingAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s'
)

logger = logging.getLogger("TrainAgent")

def main():
    """
    Função principal para treinar o agente adaptativo
    """
    logger.info("🚀 Iniciando treinamento do Agente Adaptativo Monster V2")
    
    try:
        # Inicializa agente
        agent = AdaptiveTradingAgent()
        
        # Verifica se já existe modelo treinado
        status = agent.get_model_status()
        
        if status['model_exists']:
            logger.info("📁 Modelo existente encontrado")
            response = input("Deseja retreinar o modelo? (y/N): ").lower().strip()
            
            if response not in ['y', 'yes', 's', 'sim']:
                logger.info("✅ Mantendo modelo existente")
                
                # Testa modelo existente
                if agent.load_model():
                    logger.info("🧪 Testando modelo existente...")
                    agent._evaluate_performance(num_episodes=5)
                
                return
        
        # Parâmetros de treinamento
        timesteps = 75000  # Aumentado para melhor aprendizado
        
        logger.info(f"🎯 Configuração do treinamento:")
        logger.info(f"   📊 Timesteps: {timesteps}")
        logger.info(f"   🎮 Ambiente: TradingEnv")
        logger.info(f"   🤖 Algoritmo: PPO")
        logger.info(f"   💾 Modelo será salvo em: models/adaptive_trading_agent.zip")
        
        # Confirma início do treinamento
        input("Pressione ENTER para iniciar o treinamento...")
        
        # Treina o agente
        agent.train(timesteps=timesteps)
        
        logger.info("🎉 Treinamento concluído com sucesso!")
        logger.info("🔧 O agente adaptativo está pronto para uso no Monster V2")
        
        # Instruções finais
        logger.info("\n📋 PRÓXIMOS PASSOS:")
        logger.info("1. O modelo foi salvo automaticamente")
        logger.info("2. O sistema irá carregar o modelo automaticamente")
        logger.info("3. Execute seu sistema Monster V2 normalmente")
        logger.info("4. O agente irá adaptar parâmetros automaticamente")
        
    except KeyboardInterrupt:
        logger.info("❌ Treinamento interrompido pelo usuário")
    except Exception as e:
        logger.error(f"❌ Erro durante treinamento: {e}")
        raise

if __name__ == "__main__":
    main()