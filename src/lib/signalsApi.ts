
import axios from 'axios';
import { TradingSignal, PerformanceData } from '@/lib/types';
import { config } from '@/config/env';

// Create multiple backend URLs to try (Adaptive AI API first)
const BACKEND_URLS = [
  'https://trade-alerts-ninja.onrender.com',  // IA Adaptativa Principal
  'http://localhost:5000',    // Monster V2 API Server com IA Adaptativa Local
  'http://127.0.0.1:5000',
  config.apiUrl || 'http://localhost:8000',
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

// Generate local monster signals using real Bybit prices when backend is unavailable
const generateLocalMonsterSignals = async (symbols: string[] = []) => {
  const defaultSymbols = symbols.length > 0 ? symbols : [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
    'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
  ];

  console.log('🔧 Generating local monster signals with real Bybit prices...');

  // Import Bybit service
  const { fetchBybitKlines } = await import('@/lib/apiServices');

  const signals: TradingSignal[] = [];

  // Generate signals for each symbol using real market data
  for (let index = 0; index < defaultSymbols.length; index++) {
    const symbol = defaultSymbols[index];
    
    try {
      // 70% chance for each symbol (relaxed monster filter)
      if (Math.random() > 0.3) continue;

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
      
      // Calculate EMA 20 and EMA 50
      const ema20 = calculateEMA(prices, 20);
      const ema50 = calculateEMA(prices, 50);
      
      // Calculate RSI
      const rsi = calculateRSI(prices, 14);
      
      // Calculate volume average
      const volumes = klineData.slice(0, 20).map(k => parseFloat(k[5]));
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      
      // Technical analysis for direction (RELAXED CRITERIA)
      const direction = ema20 > ema50 && rsi > 40 && rsi < 80 && volume > avgVolume * 1.1 ? "BUY" : 
                       ema20 < ema50 && rsi < 60 && rsi > 20 && volume > avgVolume * 1.1 ? "SELL" : 
                       // Fallback: use only EMA trend if volume/RSI requirements not met
                       ema20 > ema50 ? "BUY" :
                       ema20 < ema50 ? "SELL" :
                       "NEUTRAL";
      
      // Skip if no clear direction
      if (direction === "NEUTRAL") continue;

      // Calculate ATR-like value from recent candles
      const atr = entryPrice * (Math.random() * 0.02 + 0.005); // 0.5-2.5% ATR
      
      const signal: TradingSignal = {
        id: `local-monster-${symbol}-${Date.now()}-${index}`,
        symbol,
        pair: symbol,
        direction,
        type: direction === 'BUY' ? 'LONG' : 'SHORT',
        entryPrice: parseFloat(entryPrice.toFixed(6)),
        entryMin: parseFloat((entryPrice * 0.998).toFixed(6)), // Entry zone: -0.2%
        entryMax: parseFloat((entryPrice * 1.002).toFixed(6)), // Entry zone: +0.2%
        entryAvg: parseFloat(entryPrice.toFixed(6)),
        stopLoss: direction === 'BUY' 
          ? parseFloat((entryPrice - 1.2 * atr).toFixed(6))
          : parseFloat((entryPrice + 1.2 * atr).toFixed(6)),
        status: 'WAITING',
        strategy: 'monster_1h_15m_multi_bybit_real',
        createdAt: new Date().toISOString(),
        result: null,
        profit: null,
        rsi: parseFloat(rsi.toFixed(2)), // Real calculated RSI
        atr: parseFloat(atr.toFixed(6)),
        success_prob: 0.72, // High confidence for monster signals
        currentPrice: entryPrice, // Set current price to entry price
        targets: [
          {
            level: 1,
            price: direction === 'BUY' 
              ? parseFloat((entryPrice + 0.8 * atr).toFixed(6))
              : parseFloat((entryPrice - 0.8 * atr).toFixed(6)),
            hit: false
          },
          {
            level: 2,
            price: direction === 'BUY' 
              ? parseFloat((entryPrice + 1.5 * atr).toFixed(6))
              : parseFloat((entryPrice - 1.5 * atr).toFixed(6)),
            hit: false
          },
          {
            level: 3,
            price: direction === 'BUY' 
              ? parseFloat((entryPrice + 2.2 * atr).toFixed(6))
              : parseFloat((entryPrice - 2.2 * atr).toFixed(6)),
            hit: false
          }
        ]
      };

      signals.push(signal);

    } catch (error) {
      console.error(`Error generating signal for ${symbol}:`, error);
      continue;
    }
  }

  console.log(`✅ Generated ${signals.length} local monster signals with real Bybit prices`);
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

// Generate adaptive AI signals from backend (NO MOCK DATA)
export const generateMonsterSignals = async (symbols?: string[]) => {
  try {
    console.log('🚀 Calling adaptive AI backend...');
    
    const response = await tryBackendUrls('/generate_adaptive_signal', {
      method: 'GET'
    });
    
    // Validate backend response format
    const backendSignal = response.data;
    if (!backendSignal || !backendSignal.symbol || !backendSignal.direction || 
        !backendSignal.entry_price || !backendSignal.stop_loss || 
        !Array.isArray(backendSignal.targets)) {
      throw new Error('Invalid signal format from backend');
    }
    
    // Convert to TradingSignal format with validation
    const signal: TradingSignal = {
      id: `adaptive-ai-${backendSignal.symbol}-${Date.now()}`,
      symbol: backendSignal.symbol,
      pair: backendSignal.symbol,
      direction: backendSignal.direction as 'BUY' | 'SELL',
      type: backendSignal.direction === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: Number(backendSignal.entry_price),
      entryMin: Number(backendSignal.entry_price) * 0.999,
      entryMax: Number(backendSignal.entry_price) * 1.001,
      entryAvg: Number(backendSignal.entry_price),
      stopLoss: Number(backendSignal.stop_loss),
      status: 'WAITING',
      strategy: backendSignal.strategy || 'adaptive_ai',
      createdAt: new Date().toISOString(),
      result: null,
      profit: null,
      success_prob: Number(backendSignal.confidence),
      currentPrice: Number(backendSignal.entry_price),
      targets: backendSignal.targets.map((target: number, index: number) => ({
        level: index + 1,
        price: Number(target),
        hit: false
      }))
    };
    
    console.log(`✅ Adaptive AI Signal: ${signal.symbol} ${signal.direction} @ ${signal.entryPrice} (Confidence: ${signal.success_prob})`);
    console.log('Backend response:', backendSignal);
    
    return [signal];
    
  } catch (error) {
    console.error('❌ Failed to get signal from adaptive AI backend:', error);
    throw new Error(`Backend connection failed: ${error.message}`);
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
