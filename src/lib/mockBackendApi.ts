/**
 * Mock Backend API que simula o comportamento do Monster V2 + IA Adaptativa
 * Usado quando o backend Python não está disponível
 */

import { TradingSignal } from './types';

// Simulação do estado da IA Adaptativa
class MockAdaptiveAI {
  private model_trained = true;
  private performance_history: { win_rate: number; timestamp: number }[] = [];
  
  constructor() {
    // Inicializa com histórico simulado
    this.performance_history = [
      { win_rate: 0.62, timestamp: Date.now() - 86400000 },
      { win_rate: 0.65, timestamp: Date.now() - 43200000 },
      { win_rate: 0.68, timestamp: Date.now() - 21600000 },
    ];
  }

  /**
   * Simula adaptação de parâmetros baseada no histórico
   */
  adaptParameters(marketData: any) {
    // Calcula win rate médio
    const avgWinRate = this.performance_history.reduce((sum, h) => sum + h.win_rate, 0) / this.performance_history.length;
    
    // Ajustes baseados na performance (simulação da IA)
    const adaptationFactor = (avgWinRate - 0.5) * 2; // -1 to 1
    
    return {
      ema_adj: (Math.random() - 0.5) * adaptationFactor * 10,
      rsi_adj: (Math.random() - 0.5) * adaptationFactor * 15, 
      vol_adj: (Math.random() - 0.5) * adaptationFactor * 0.3,
      atr_adj: (Math.random() - 0.5) * adaptationFactor * 0.02,
      confidence: avgWinRate > 0.6 ? 'HIGH' : avgWinRate > 0.55 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Atualiza performance com novo resultado
   */
  updatePerformance(signalResult: 'WIN' | 'LOSS') {
    const lastWinRate = this.performance_history[this.performance_history.length - 1]?.win_rate || 0.6;
    const adjustment = signalResult === 'WIN' ? 0.02 : -0.02;
    const newWinRate = Math.max(0.3, Math.min(0.8, lastWinRate + adjustment));
    
    this.performance_history.push({
      win_rate: newWinRate,
      timestamp: Date.now()
    });

    // Mantém apenas últimos 10 registros
    if (this.performance_history.length > 10) {
      this.performance_history.shift();
    }
  }

  getStatus() {
    const latest = this.performance_history[this.performance_history.length - 1];
    return {
      active: true,
      model_trained: this.model_trained,
      current_win_rate: latest?.win_rate || 0.6,
      total_trades: this.performance_history.length * 20, // Simula mais trades
      performance_trend: this.performance_history.slice(-3)
    };
  }
}

// Instância global da IA adaptativa mock
const mockAI = new MockAdaptiveAI();

/**
 * Simula geração de sinais Monster V2 com IA Adaptativa
 */
export const generateMockMonsterSignals = async (symbols: string[] = []): Promise<TradingSignal[]> => {
  console.log('🤖 Generating Mock Monster V2 signals with Adaptive AI...');
  
  const defaultSymbols = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
    'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
  ];
  
  const targetSymbols = symbols.length > 0 ? symbols : defaultSymbols;
  const signals: TradingSignal[] = [];
  
  // Simula análise de cada símbolo
  for (const symbol of targetSymbols.slice(0, 5)) {
    try {
      // Simula dados de mercado
      const mockMarketData = {
        current_price: 100 + Math.random() * 1000,
        ema_fast: 50 + Math.random() * 100,
        ema_slow: 45 + Math.random() * 110,
        rsi: 30 + Math.random() * 40,
        volume_ratio: 0.8 + Math.random() * 1.5,
        atr_ratio: 0.01 + Math.random() * 0.04
      };

      // Obtém parâmetros adaptados da IA
      const adaptiveParams = mockAI.adaptParameters(mockMarketData);
      
      // Critérios de entrada ajustados pela IA
      const emaCondition = mockMarketData.ema_fast > (mockMarketData.ema_slow + adaptiveParams.ema_adj);
      const rsiCondition = mockMarketData.rsi > (30 + adaptiveParams.rsi_adj) && mockMarketData.rsi < (70 - adaptiveParams.rsi_adj);
      const volumeCondition = mockMarketData.volume_ratio > (1.2 + adaptiveParams.vol_adj);
      
      // Só gera sinal se critérios adaptados forem atendidos
      const shouldGenerateSignal = emaCondition && rsiCondition && volumeCondition && Math.random() > 0.3;
      
      if (shouldGenerateSignal) {
        const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const entryPrice = mockMarketData.current_price;
        const stopLoss = direction === 'BUY' 
          ? entryPrice * (1 - (0.02 + adaptiveParams.atr_adj))
          : entryPrice * (1 + (0.02 + adaptiveParams.atr_adj));
        
        const signal: TradingSignal = {
          id: `monster-ai-${symbol}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          symbol,
          direction: direction as 'BUY' | 'SELL',
          entryPrice,
          stopLoss,
          tp1: direction === 'BUY' ? entryPrice * 1.015 : entryPrice * 0.985,
          tp2: direction === 'BUY' ? entryPrice * 1.03 : entryPrice * 0.97,
          tp3: direction === 'BUY' ? entryPrice * 1.05 : entryPrice * 0.95,
          leverage: Math.floor(Math.random() * 3) + 1,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          strategy: 'Monster V2 + Adaptive AI (Mock)',
          notes: `AI Confidence: ${adaptiveParams.confidence} | EMA±${adaptiveParams.ema_adj.toFixed(1)} RSI±${adaptiveParams.rsi_adj.toFixed(1)}`,
          rsi: mockMarketData.rsi,
          atr: mockMarketData.atr_ratio
        };
        
        signals.push(signal);
        console.log(`✅ Mock AI Signal: ${symbol} ${direction} @ ${entryPrice.toFixed(4)} (Confidence: ${adaptiveParams.confidence})`);
      }
      
    } catch (error) {
      console.error(`❌ Error generating mock signal for ${symbol}:`, error);
    }
  }
  
  console.log(`🎯 Generated ${signals.length} Mock Monster V2 + AI signals`);
  
  // Simula atraso de processamento
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  return signals;
};

/**
 * Retorna status do sistema Mock Backend
 */
export const getMockBackendStatus = () => {
  const aiStatus = mockAI.getStatus();
  
  return {
    status: 'active',
    service: 'Mock Monster V2 + Adaptive AI',
    adaptive_ai: aiStatus,
    backend_type: 'mock_simulation',
    timestamp: new Date().toISOString(),
    message: 'Running simulated backend with AI adaptation'
  };
};

/**
 * Simula endpoint de health check
 */
export const mockHealthCheck = () => {
  return {
    status: 'healthy',
    service: 'Mock Monster V2 API',
    adaptive_ai: true,
    uptime: Math.floor(Math.random() * 86400), // segundos
    timestamp: new Date().toISOString()
  };
};

// Exporta instância da IA para uso externo
export { mockAI };