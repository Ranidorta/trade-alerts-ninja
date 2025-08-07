
import axios from 'axios';
import { TradingSignal, PerformanceData } from '@/lib/types';
import { config } from '@/config/env';

// Create multiple backend URLs to try
const BACKEND_URLS = [
  config.apiUrl || 'http://localhost:5000',
  'https://trade-alerts-backend.onrender.com',
  'https://trading-signals-api.herokuapp.com'
];

// Create an axios instance with the base URL pointing to Python backend
const api = axios.create({
  timeout: 10000, // Reduced timeout
});

// Auth token management
let authToken: string | null = null;
let currentBackendUrl = BACKEND_URLS[0];

export const setAuthToken = (token: string) => {
  authToken = token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  localStorage.setItem('auth_token', token);
};

export const clearAuthToken = () => {
  authToken = null;
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('auth_token');
};

// Initialize auth token from localStorage if available
const initializeAuth = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    setAuthToken(token);
  }
};

initializeAuth();

// Function to try different backend URLs
const tryBackendUrls = async (endpoint: string, options: any = {}) => {
  for (const baseUrl of BACKEND_URLS) {
    try {
      console.log(`Trying backend URL: ${baseUrl}${endpoint}`);
      
      const response = await axios({
        ...options,
        url: `${baseUrl}${endpoint}`,
        timeout: 8000,
        headers: {
          ...options.headers,
          ...api.defaults.headers.common
        }
      });
      
      currentBackendUrl = baseUrl;
      console.log(`✅ Success with backend: ${baseUrl}`);
      return response;
    } catch (error) {
      console.warn(`❌ Failed with ${baseUrl}:`, error.message);
      continue;
    }
  }
  throw new Error('All backend URLs failed');
};

// Check backend health with multiple URLs
export const checkBackendHealth = async () => {
  try {
    const response = await tryBackendUrls('/api/health');
    console.log('Backend health check result:', response.data);
    return response.data;
  } catch (error) {
    console.error('All backends unavailable:', error);
    throw new Error('No backend servers are available');
  }
};

// Enhanced 1H directional filter for Monster signals
const check1HDirectionalFilter = async (symbol: string): Promise<{ allowed: boolean; direction?: 'BUY' | 'SELL' }> => {
  try {
    // Fetch 1H timeframe data
    const response = await fetch(
      `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=60&limit=50`
    );
    
    if (!response.ok) return { allowed: false };
    
    const data = await response.json();
    if (!data.result?.list || data.result.list.length < 50) return { allowed: false };
    
    const candles = data.result.list.reverse().map((candle: any[]) => ({
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4])
    }));
    
    const prices = candles.map(c => c.close);
    const currentCandle = candles[candles.length - 1];
    
    // Calculate EMAs for 1H
    const ema20 = calculateEMA(prices.slice(-20), 20);
    const ema50 = calculateEMA(prices.slice(-50), 50);
    
    // Check directional conditions
    const isGreenCandle = currentCandle.close > currentCandle.open;
    const isRedCandle = currentCandle.close < currentCandle.open;
    
    // Bullish 1H condition: EMA20 > EMA50 and green candle
    if (ema20 > ema50 && isGreenCandle) {
      return { allowed: true, direction: 'BUY' };
    }
    
    // Bearish 1H condition: EMA20 < EMA50 and red candle
    if (ema20 < ema50 && isRedCandle) {
      return { allowed: true, direction: 'SELL' };
    }
    
    // Undefined scenario - no signal allowed
    return { allowed: false };
    
  } catch (error) {
    console.error(`Error in 1H directional filter for ${symbol}:`, error);
    return { allowed: false };
  }
};

// Get Bybit futures symbols
const getBybitFuturesSymbols = async (): Promise<string[]> => {
  try {
    const response = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear');
    const data = await response.json();
    
    if (data.result?.list) {
      return data.result.list
        .filter((instrument: any) => 
          instrument.symbol.endsWith('USDT') && 
          instrument.status === 'Trading'
        )
        .map((instrument: any) => instrument.symbol)
        .slice(0, 20); // Top 20 most liquid
    }
    
    return [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
      'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
    ];
  } catch (error) {
    console.error('Error fetching Bybit futures symbols:', error);
    return [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
      'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
    ];
  }
};

// Enhanced local monster signal generation with 1H filter
const generateLocalMonsterSignals = async (symbols: string[] = []) => {
  console.log('🔥 Generating enhanced monster signals with 1H directional filter...');
  
  // Get Bybit futures symbols if none provided
  const targetSymbols = symbols.length > 0 ? symbols : await getBybitFuturesSymbols();
  const signals: TradingSignal[] = [];
  let consecutiveLosses = 0; // Track consecutive losses for market quality filter

  // Generate signals for each symbol using enhanced validation
  for (let index = 0; index < targetSymbols.length; index++) {
    const symbol = targetSymbols[index];
    
    try {
      console.log(`📊 Analyzing ${symbol} with 1H directional filter...`);
      
      // MANDATORY 1H directional filter - check first
      const directionalFilter = await check1HDirectionalFilter(symbol);
      if (!directionalFilter.allowed) {
        console.log(`❌ ${symbol}: 1H directional filter blocked signal`);
        continue;
      }
      
      console.log(`✅ ${symbol}: 1H filter allows ${directionalFilter.direction} signals`);
      
      // Market quality filter - block after 3 consecutive losses
      if (consecutiveLosses >= 3) {
        console.log(`🚫 Market quality filter active - trading paused after ${consecutiveLosses} losses`);
        break;
      }
      
      // Fetch multi-timeframe data (1m, 5m, 15m)
      const [data1m, data5m, data15m] = await Promise.all([
        fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=1&limit=100`),
        fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=5&limit=100`),
        fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=15&limit=100`)
      ]);
      
      if (!data1m.ok || !data5m.ok || !data15m.ok) {
        console.warn(`Failed to fetch multi-timeframe data for ${symbol}`);
        continue;
      }
      
      const [kline1m, kline5m, kline15m] = await Promise.all([
        data1m.json(),
        data5m.json(),
        data15m.json()
      ]);
      
      // Parse 15m timeframe data
      const candles15m = kline15m.result.list.reverse().map((candle: any[]) => ({
        timestamp: parseInt(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
      
      if (candles15m.length < 50) {
        console.warn(`Insufficient 15m data for ${symbol}`);
        continue;
      }
      
      const currentPrice = candles15m[candles15m.length - 1].close;
      const prices = candles15m.map(c => c.close);
      const volumes = candles15m.map(c => c.volume);
      
      // 6 Module Validation System
      let validationScore = 0;
      let validationsPassedCount = 0;
      const validationResults: any = {};
      
      // 1. EMA Cross Validation (Weight: 0.2)
      const ema20 = calculateEMA(prices.slice(-20), 20);
      const ema50 = calculateEMA(prices.slice(-50), 50);
      const emaCrossValid = (directionalFilter.direction === 'BUY' && currentPrice > ema20 && ema20 > ema50) ||
                           (directionalFilter.direction === 'SELL' && currentPrice < ema20 && ema20 < ema50);
      if (emaCrossValid) {
        validationScore += 0.2;
        validationsPassedCount++;
        validationResults.emaCross = true;
      }
      
      // 2. Volume Spike + Anomaly (Weight: 0.15)
      const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const currentVolume = volumes[volumes.length - 1];
      const volumeRatio = currentVolume / avgVolume;
      const volumeValid = volumeRatio > 1.5; // Volume spike threshold
      if (volumeValid) {
        validationScore += 0.15;
        validationsPassedCount++;
        validationResults.volumeSpike = true;
      }
      
      // 3. Candle Reversal Validation (Weight: 0.15)
      const lastCandle = candles15m[candles15m.length - 1];
      const candleBodyRatio = Math.abs(lastCandle.close - lastCandle.open) / (lastCandle.high - lastCandle.low);
      const candleValid = candleBodyRatio > 0.6; // Strong candle body
      if (candleValid) {
        validationScore += 0.15;
        validationsPassedCount++;
        validationResults.candleReversal = true;
      }
      
      // 4. RSI + Momentum (Weight: 0.2)
      const rsi = calculateRSI(prices, 14);
      const rsiValid = (directionalFilter.direction === 'BUY' && rsi > 30 && rsi < 70) ||
                      (directionalFilter.direction === 'SELL' && rsi > 30 && rsi < 70);
      if (rsiValid) {
        validationScore += 0.2;
        validationsPassedCount++;
        validationResults.rsiMomentum = true;
      }
      
      // 5. Order Book Analysis (Simplified - Weight: 0.15)
      const priceMovement = prices[prices.length - 1] / prices[prices.length - 2] - 1;
      const orderBookValid = Math.abs(priceMovement) > 0.001; // Minimum price movement
      if (orderBookValid) {
        validationScore += 0.15;
        validationsPassedCount++;
        validationResults.orderBook = true;
      }
      
      // 6. ML Validator (Weight: 0.15) - Simplified confidence calculation
      const mlFeatures = {
        ema_ratio: ema20 / ema50,
        rsi: rsi / 100,
        volume: volumeRatio,
        book_ratio: Math.abs(priceMovement),
        candle_score: candleBodyRatio
      };
      const mlConfidence = (mlFeatures.ema_ratio - 1) * 0.5 + 
                         (mlFeatures.rsi - 0.5) * 0.3 + 
                         Math.min(mlFeatures.volume / 2, 0.5) * 0.2;
      const mlValid = Math.abs(mlConfidence) > 0.65;
      if (mlValid) {
        validationScore += 0.15;
        validationsPassedCount++;
        validationResults.mlValidator = true;
      }
      
      console.log(`${symbol}: Score=${validationScore.toFixed(2)}, Passed=${validationsPassedCount}/6`);
      
      // Check minimum requirements: Score >= 0.70 AND at least 5/6 validations
      if (validationScore >= 0.70 && validationsPassedCount >= 5) {
        // Calculate ATR for risk management
        let atr = 0;
        for (let i = 1; i < candles15m.length; i++) {
          const tr = Math.max(
            candles15m[i].high - candles15m[i].low,
            Math.abs(candles15m[i].high - candles15m[i - 1].close),
            Math.abs(candles15m[i].low - candles15m[i - 1].close)
          );
          atr += tr;
        }
        atr = atr / (candles15m.length - 1);
        
        // Risk management: SL = 1.5x ATR, TP1 = 1x ATR, TP2 = 1.8x, TP3 = 2.4x
        const stopLoss = directionalFilter.direction === 'BUY' 
          ? currentPrice - (atr * 1.5)
          : currentPrice + (atr * 1.5);
          
        const target1 = directionalFilter.direction === 'BUY'
          ? currentPrice + (atr * 1.0)
          : currentPrice - (atr * 1.0);
          
        const target2 = directionalFilter.direction === 'BUY'
          ? currentPrice + (atr * 1.8)
          : currentPrice - (atr * 1.8);
          
        const target3 = directionalFilter.direction === 'BUY'
          ? currentPrice + (atr * 2.4)
          : currentPrice - (atr * 2.4);
        
        // Calculate R/R ratio
        const riskReward = Math.abs(target1 - currentPrice) / Math.abs(stopLoss - currentPrice);
        
        // Check minimum R/R of 1.3
        if (riskReward >= 1.3) {
          const signal: TradingSignal = {
            id: `monster_pro_${symbol}_${Date.now()}`,
            symbol,
            direction: directionalFilter.direction,
            type: directionalFilter.direction === 'BUY' ? 'LONG' : 'SHORT',
            entryPrice: currentPrice,
            stopLoss,
            targets: [{ level: 1, price: target1 }, { level: 2, price: target2 }, { level: 3, price: target3 }],
            confidence: validationScore,
            timeframe: '1m,5m,15m',
            strategy: 'classic_crypto_pro',
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'ACTIVE',
            rsi: Math.round(rsi * 100) / 100,
            atr: Math.round(atr * 10000) / 10000
          };
          
          signals.push(signal);
          console.log(`✅ Generated ${directionalFilter.direction} signal for ${symbol} (Score: ${(validationScore * 100).toFixed(1)}%, R/R: ${riskReward.toFixed(2)})`);
        } else {
          console.log(`❌ ${symbol}: R/R ratio ${riskReward.toFixed(2)} below minimum 1.3`);
        }
      } else {
        console.log(`❌ ${symbol}: Insufficient validation (Score: ${validationScore.toFixed(2)}, Passed: ${validationsPassedCount}/6)`);
      }
      
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      consecutiveLosses++; // Count as potential loss for market quality filter
      continue;
    }
  }

  console.log(`🔥 Enhanced monster generation complete. Generated ${signals.length} signals with 1H directional filter.`);
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

// Fetch signals history with localStorage fallback
export const fetchSignalsHistory = async (filters?: { symbol?: string; result?: string }) => {
  try {
    console.log('Fetching signals history from backend API...');
    
    const params: any = {};
    if (filters?.symbol) params.symbol = filters.symbol;
    if (filters?.result) params.result = filters.result;
    
    const response = await tryBackendUrls('/api/signals/history', {
      method: 'GET',
      params
    });
    
    console.log(`Successfully fetched ${response.data.length} signals from backend`);
    return response.data as TradingSignal[];
  } catch (error) {
    console.error('Error fetching signals history from backend:', error);
    console.log('Trying localStorage fallback for signals history...');
    
    // Try to get signals from localStorage as fallback
    try {
      const { getSignalHistory } = await import('@/lib/signal-storage');
      const localSignals = getSignalHistory();
      
      if (localSignals && localSignals.length > 0) {
        console.log(`Found ${localSignals.length} signals in localStorage`);
        
        // Apply filters if provided
        let filteredSignals = localSignals;
        if (filters?.symbol) {
          filteredSignals = filteredSignals.filter(s => 
            s.symbol?.toLowerCase().includes(filters.symbol!.toLowerCase())
          );
        }
        if (filters?.result) {
          filteredSignals = filteredSignals.filter(s => s.result === filters.result);
        }
        
        return filteredSignals;
      }
    } catch (localError) {
      console.error('Error accessing localStorage signals:', localError);
    }
    
    console.log('No signals found in localStorage, returning empty array');
    return [];
  }
};

// Signal API functions
export const fetchSignals = async (params?: any) => {
  try {
    const response = await tryBackendUrls('/api/signals', {
      method: 'GET',
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching signals:', error);
    throw error;
  }
};

export const fetchHybridSignals = async () => {
  try {
    console.log('Fetching hybrid signals...');
    
    const response = await tryBackendUrls('/api/signals/history/hybrid');
    
    console.log(`Successfully fetched ${response.data.length} hybrid signals`);
    return response.data as TradingSignal[];
  } catch (error) {
    console.error('Error fetching hybrid signals:', error);
    console.log('Returning empty array for hybrid signals');
    return [];
  }
};

export const fetchPerformanceMetrics = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, daysParam] = queryKey;
  const days = daysParam ? parseInt(daysParam) : 30;
  
  try {
    const response = await tryBackendUrls('/api/performance', {
      method: 'GET',
      params: { days }
    });
    return response.data as PerformanceData;
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    throw error;
  }
};

export const prefetchCommonData = async () => {
  try {
    return true;
  } catch (error) {
    console.error('Error prefetching common data:', error);
    return false;
  }
};

// Trigger manual evaluation of all signals
export const triggerSignalEvaluation = async () => {
  try {
    const response = await tryBackendUrls('/api/signals/evaluate', {
      method: 'POST'
    });
    return response.data;
  } catch (error) {
    console.error('Error triggering signal evaluation:', error);
    throw error;
  }
};

// Get evaluation status
export const getEvaluationStatus = async () => {
  try {
    const response = await tryBackendUrls('/api/signals/evaluation/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching evaluation status:', error);
    throw error;
  }
};

// Generate monster signals using backend with local fallback
export const generateMonsterSignals = async (symbols?: string[]) => {
  try {
    console.log('🚀 Starting monster signal generation...');
    
    // Try backend first
    try {
      console.log('Attempting backend monster signal generation...');
      
      const response = await tryBackendUrls('/api/signals/generate/monster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          symbols: symbols || [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
            'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
          ]
        }
      });
      
      console.log(`✅ Backend generated ${response.data.signals.length} monster signals`);
      return response.data.signals as TradingSignal[];
      
    } catch (backendError) {
      console.warn('Backend monster generation failed, using local generation...');
      
      // Use local generation as fallback
      const localSignals = generateLocalMonsterSignals(symbols);
      
      return localSignals;
    }
    
  } catch (error) {
    console.error('❌ Error in monster signal generation:', error);
    
    // Final fallback to local generation
    console.log('Using final fallback: local monster signal generation');
    return generateLocalMonsterSignals(symbols);
  }
};

// Get monster signal generation status
export const getMonsterSignalStatus = async () => {
  try {
    console.log('📊 Checking monster signal generation status...');
    
    const response = await tryBackendUrls('/api/signals/generate/monster/status');
    
    console.log('Monster status response:', response.data);
    return response.data;
  } catch (error) {
    console.warn('Error getting monster signal status, returning local status:', error);
    
    // Return local status if backend is unavailable
    return {
      status: 'ready_local',
      available_symbols: [
        'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
        'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
      ],
      strategy: 'monster_1h_15m_multi_local',
      description: 'Local monster signal generation (backend unavailable)',
      mode: 'local_fallback'
    };
  }
};
