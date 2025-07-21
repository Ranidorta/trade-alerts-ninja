import axios from 'axios';
import { TradingSignal } from '@/lib/types';

// Classic signals endpoint
const CLASSIC_SIGNALS_ENDPOINT = 'https://trade-alerts-ninja.onrender.com/generate_classic_signal';

// Create axios instance for classic signals
const classicApi = axios.create({
  timeout: 15000,
});

// Transform classic signal response to TradingSignal interface
const transformClassicSignal = (classicData: any): TradingSignal => {
  const entryPrice = classicData.entry_price || classicData.entryPrice;
  const stopLoss = classicData.stop_loss || classicData.stopLoss;
  const targets = classicData.targets || [];
  
  return {
    id: `classic-${classicData.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    symbol: classicData.symbol,
    pair: classicData.symbol,
    direction: classicData.direction,
    type: classicData.direction === 'BUY' ? 'LONG' : 'SHORT',
    entryPrice: entryPrice,
    entry_price: entryPrice,
    entryAvg: entryPrice,
    stopLoss: stopLoss,
    status: 'WAITING',
    strategy: classicData.strategy || 'classic_ai',
    createdAt: new Date().toISOString(),
    confidence: classicData.confidence || 0,
    tp1: targets[0] || null,
    tp2: targets[1] || null,
    tp3: targets[2] || null,
    targets: targets.map((price: number, index: number) => ({
      level: index + 1,
      price: price,
      hit: false
    })),
    result: null,
    profit: null,
    analysis: `Sinal Classic AI para ${classicData.symbol} com confiança de ${((classicData.confidence || 0) * 100).toFixed(1)}%. Estratégia: ${classicData.strategy || 'classic_ai'}.`
  };
};

// Fetch classic signals from the endpoint
export const fetchClassicSignals = async (): Promise<TradingSignal[]> => {
  try {
    console.log('🔥 Fetching classic signals from:', CLASSIC_SIGNALS_ENDPOINT);
    
    // Generate multiple signals by calling the endpoint multiple times
    const signalPromises = [];
    const symbolsToTry = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT', 'BNBUSDT', 'XRPUSDT', 'MATICUSDT'];
    
    // Call the endpoint for multiple symbols to get diverse signals
    for (let i = 0; i < 5; i++) { // Generate up to 5 signals
      signalPromises.push(
        classicApi.get(CLASSIC_SIGNALS_ENDPOINT)
          .then(response => {
            console.log(`✅ Classic signal ${i + 1} response:`, response.data);
            return transformClassicSignal(response.data);
          })
          .catch(error => {
            console.warn(`⚠️ Failed to get classic signal ${i + 1}:`, error.message);
            return null;
          })
      );
    }
    
    // Wait for all promises to resolve
    const results = await Promise.allSettled(signalPromises);
    
    // Filter out failed requests and null results
    const validSignals = results
      .filter((result): result is PromiseFulfilledResult<TradingSignal> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
    
    console.log(`✅ Successfully fetched ${validSignals.length} classic signals`);
    
    // Remove duplicates by symbol (keep the one with highest confidence)
    const uniqueSignals = validSignals.reduce((acc, signal) => {
      const existing = acc.find(s => s.symbol === signal.symbol);
      if (!existing || (signal.confidence || 0) > (existing.confidence || 0)) {
        return [...acc.filter(s => s.symbol !== signal.symbol), signal];
      }
      return acc;
    }, [] as TradingSignal[]);
    
    console.log(`📊 Returning ${uniqueSignals.length} unique classic signals`);
    return uniqueSignals;
    
  } catch (error) {
    console.error('❌ Error fetching classic signals:', error);
    
    // Return mock classic signals if the endpoint fails
    console.log('🔄 Generating mock classic signals as fallback...');
    return generateMockClassicSignals();
  }
};

// Generate mock classic signals for testing/fallback
const generateMockClassicSignals = (): TradingSignal[] => {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT'];
  const mockSignals: TradingSignal[] = [];
  
  symbols.forEach((symbol, index) => {
    // Skip some signals randomly to simulate realistic results
    if (Math.random() > 0.7) return;
    
    const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const entryPrice = Math.random() * 100 + 20; // Random price between 20-120
    const confidence = Math.random() * 0.4 + 0.5; // Random confidence between 0.5-0.9
    
    const stopLoss = direction === 'BUY' 
      ? entryPrice * 0.95  // 5% below entry for BUY
      : entryPrice * 1.05; // 5% above entry for SELL
    
    const tp1 = direction === 'BUY' 
      ? entryPrice * 1.02  // 2% above entry for BUY
      : entryPrice * 0.98; // 2% below entry for SELL
    
    const tp2 = direction === 'BUY' 
      ? entryPrice * 1.04  // 4% above entry for BUY
      : entryPrice * 0.96; // 4% below entry for SELL
      
    const tp3 = direction === 'BUY' 
      ? entryPrice * 1.06  // 6% above entry for BUY
      : entryPrice * 0.94; // 6% below entry for SELL
    
    const signal: TradingSignal = {
      id: `mock-classic-${symbol}-${Date.now()}-${index}`,
      symbol,
      pair: symbol,
      direction: direction as 'BUY' | 'SELL',
      type: direction === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: parseFloat(entryPrice.toFixed(6)),
      entry_price: parseFloat(entryPrice.toFixed(6)),
      entryAvg: parseFloat(entryPrice.toFixed(6)),
      stopLoss: parseFloat(stopLoss.toFixed(6)),
      status: 'WAITING',
      strategy: 'classic_ai_mock',
      createdAt: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Random time within last hour
      confidence: parseFloat(confidence.toFixed(3)),
      tp1: parseFloat(tp1.toFixed(6)),
      tp2: parseFloat(tp2.toFixed(6)),
      tp3: parseFloat(tp3.toFixed(6)),
      targets: [
        { level: 1, price: parseFloat(tp1.toFixed(6)), hit: false },
        { level: 2, price: parseFloat(tp2.toFixed(6)), hit: false },
        { level: 3, price: parseFloat(tp3.toFixed(6)), hit: false }
      ],
      result: null,
      profit: null,
      analysis: `Sinal Classic AI simulado para ${symbol} com confiança de ${(confidence * 100).toFixed(1)}%. Este é um sinal de teste gerado localmente.`
    };
    
    mockSignals.push(signal);
  });
  
  console.log(`🧪 Generated ${mockSignals.length} mock classic signals`);
  return mockSignals;
};
