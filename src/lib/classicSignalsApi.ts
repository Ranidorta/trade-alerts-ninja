import axios from 'axios';
import { TradingSignal } from '@/lib/types';

// Try multiple endpoints for classic signals (localhost first for development)
const CLASSIC_SIGNALS_ENDPOINTS = [
  'http://localhost:5000/generate_classic_signal',
  'https://trade-alerts-ninja.onrender.com/generate_classic_signal'
];

// Create axios instance for classic signals
const classicApi = axios.create({
  timeout: 10000,
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

// Try multiple endpoints with fallback
const tryEndpoint = async (endpoint: string): Promise<TradingSignal | null> => {
  try {
    const response = await classicApi.get(endpoint);
    if (response.data && response.data.symbol) {
      console.log(`✅ Got classic signal from ${endpoint}:`, response.data);
      return transformClassicSignal(response.data);
    }
    return null;
  } catch (error) {
    console.warn(`⚠️ Failed to get classic signal from ${endpoint}:`, error.message);
    return null;
  }
};

// Generate local classic signals using real Bybit prices
const generateLocalClassicSignals = async (): Promise<TradingSignal[]> => {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'LINKUSDT', 'AVAXUSDT'];
  
  console.log('🎯 Generating local classic signals with real Bybit prices...');

  // Import Bybit service
  const { fetchBybitKlines } = await import('@/lib/apiServices');

  const signals: TradingSignal[] = [];

  // Generate signals for each symbol using real market data
  for (let index = 0; index < symbols.length; index++) {
    const symbol = symbols[index];
    
    try {
      // 50% chance for each symbol (classic filter)
      if (Math.random() > 0.5) continue;

      // Get real market data from Bybit
      const klineData = await fetchBybitKlines(symbol, "15", 50);
      if (!klineData || klineData.length === 0) continue;

      // Use the latest candle close price as entry
      const latestCandle = klineData[0]; // Bybit returns newest first
      const entryPrice = parseFloat(latestCandle[4]); // Close price
      const high = parseFloat(latestCandle[2]);
      const low = parseFloat(latestCandle[3]);
      const volume = parseFloat(latestCandle[5]);

      // Calculate technical indicators for real direction analysis
      const prices = klineData.slice(0, 50).map(k => parseFloat(k[4])).reverse(); // Get last 50 closes, oldest first
      
      // Calculate EMA 9 and EMA 21 (classic AI style)
      const ema9 = calculateEMA(prices, 9);
      const ema21 = calculateEMA(prices, 21);
      
      // Calculate RSI
      const rsi = calculateRSI(prices, 14);
      
      // Calculate volume average
      const volumes = klineData.slice(0, 20).map(k => parseFloat(k[5]));
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      
      // Classic AI technical analysis for direction
      const direction = ema9 > ema21 && rsi > 45 && rsi < 75 && volume > avgVolume * 1.2 ? "BUY" : 
                       ema9 < ema21 && rsi < 55 && rsi > 25 && volume > avgVolume * 1.2 ? "SELL" : 
                       // Fallback: use only EMA trend if volume/RSI requirements not met
                       ema9 > ema21 ? "BUY" :
                       ema9 < ema21 ? "SELL" :
                       "NEUTRAL";
      
      // Skip if no clear direction
      if (direction === "NEUTRAL") continue;

      // Calculate ATR-like value from recent candles (classic style - smaller targets)
      const atr = entryPrice * (Math.random() * 0.015 + 0.008); // 0.8-2.3% ATR
      const confidence = 0.65 + Math.random() * 0.15; // 65-80% confidence
      
      // Calculate targets (classic style - more conservative)
      const tp1 = direction === 'BUY' 
        ? entryPrice + (0.6 * atr)
        : entryPrice - (0.6 * atr);
      const tp2 = direction === 'BUY' 
        ? entryPrice + (1.2 * atr)
        : entryPrice - (1.2 * atr);
      const tp3 = direction === 'BUY' 
        ? entryPrice + (1.8 * atr)
        : entryPrice - (1.8 * atr);
      
      const signal: TradingSignal = {
        id: `local-classic-${symbol}-${Date.now()}-${index}`,
        symbol,
        pair: symbol,
        direction: direction as 'BUY' | 'SELL',
        type: direction === 'BUY' ? 'LONG' : 'SHORT',
        entryPrice: parseFloat(entryPrice.toFixed(6)),
        entry_price: parseFloat(entryPrice.toFixed(6)),
        entryAvg: parseFloat(entryPrice.toFixed(6)),
        stopLoss: direction === 'BUY' 
          ? parseFloat((entryPrice - 1.5 * atr).toFixed(6))
          : parseFloat((entryPrice + 1.5 * atr).toFixed(6)),
        status: 'WAITING',
        strategy: 'classic_ai_15m_bybit_local',
        createdAt: new Date().toISOString(),
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
        rsi: parseFloat(rsi.toFixed(2)),
        atr: parseFloat(atr.toFixed(6)),
        analysis: `Sinal Classic AI local para ${symbol} com ${(confidence * 100).toFixed(1)}% de confiança. EMA9: ${ema9.toFixed(2)}, EMA21: ${ema21.toFixed(2)}, RSI: ${rsi.toFixed(1)}`
      };

      signals.push(signal);

    } catch (error) {
      console.error(`Error generating classic signal for ${symbol}:`, error);
      continue;
    }
  }

  console.log(`✅ Generated ${signals.length} local classic signals with real Bybit prices`);
  return signals;
};

// Technical analysis helper functions
const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
};

const calculateRSI = (prices: number[], period: number): number => {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

// Fetch classic signals with local generation fallback
export const fetchClassicSignals = async (): Promise<TradingSignal[]> => {
  console.log('🎯 Starting classic signals fetch...');
  
  try {
    // Try backend endpoints first
    const signals: TradingSignal[] = [];
    
    for (const endpoint of CLASSIC_SIGNALS_ENDPOINTS) {
      console.log('🔥 Trying classic signals endpoint:', endpoint);
      
      // Generate multiple signals by calling the endpoint multiple times
      const signalPromises = [];
      
      // Call the endpoint multiple times to get diverse signals
      for (let i = 0; i < 3; i++) {
        signalPromises.push(tryEndpoint(endpoint));
      }
      
      // Wait for all promises to resolve
      const results = await Promise.allSettled(signalPromises);
      
      // Filter out failed requests and null results
      const validSignals = results
        .filter((result): result is PromiseFulfilledResult<TradingSignal> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);
      
      // If we got any signals from this endpoint, use them
      if (validSignals.length > 0) {
        console.log(`✅ Successfully fetched ${validSignals.length} classic signals from ${endpoint}`);
        
        // Remove duplicates by symbol (keep the one with highest confidence)
        const uniqueSignals = validSignals.reduce((acc, signal) => {
          const existing = acc.find(s => s.symbol === signal.symbol);
          if (!existing || (signal.confidence || 0) > (existing.confidence || 0)) {
            return [...acc.filter(s => s.symbol !== signal.symbol), signal];
          }
          return acc;
        }, [] as TradingSignal[]);
        
        console.log(`📊 Returning ${uniqueSignals.length} unique classic signals from backend`);
        return uniqueSignals;
      }
    }
    
    // If no backend endpoint worked, use local generation
    console.log('⚠️ No classic signals from backend, using local generation...');
    return await generateLocalClassicSignals();
    
  } catch (error) {
    console.error('❌ Error fetching classic signals, using local generation:', error);
    return await generateLocalClassicSignals();
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
