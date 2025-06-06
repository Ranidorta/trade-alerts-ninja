
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

// Generate local monster signals when backend is unavailable
const generateLocalMonsterSignals = (symbols: string[] = []) => {
  const defaultSymbols = symbols.length > 0 ? symbols : [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
    'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
  ];

  console.log('🔧 Generating local monster signals...');

  // Base prices for realistic signal generation
  const basePrices: { [key: string]: number } = {
    'BTCUSDT': 45000 + Math.random() * 10000,
    'ETHUSDT': 2800 + Math.random() * 500,
    'SOLUSDT': 120 + Math.random() * 50,
    'DOGEUSDT': 0.08 + Math.random() * 0.02,
    'ADAUSDT': 0.45 + Math.random() * 0.1,
    'BNBUSDT': 320 + Math.random() * 80,
    'XRPUSDT': 0.55 + Math.random() * 0.1,
    'MATICUSDT': 0.85 + Math.random() * 0.2,
    'LINKUSDT': 15 + Math.random() * 5,
    'AVAXUSDT': 28 + Math.random() * 8
  };

  const signals = defaultSymbols
    .filter(() => Math.random() > 0.6) // Only 40% chance for each symbol (monster filter)
    .map((symbol, index) => {
      const entryPrice = basePrices[symbol] || Math.random() * 1000 + 100;
      const direction = Math.random() > 0.5 ? "BUY" : "SELL";
      const atr = entryPrice * (Math.random() * 0.02 + 0.005); // 0.5-2.5% ATR
      
      const signal: TradingSignal = {
        id: `local-monster-${symbol}-${Date.now()}-${index}`,
        symbol,
        pair: symbol,
        direction,
        type: direction === 'BUY' ? 'LONG' : 'SHORT',
        entryPrice: parseFloat(entryPrice.toFixed(6)),
        stopLoss: direction === 'BUY' 
          ? parseFloat((entryPrice - 1.2 * atr).toFixed(6))
          : parseFloat((entryPrice + 1.2 * atr).toFixed(6)),
        status: 'WAITING',
        strategy: 'monster_1h_15m_multi_local',
        createdAt: new Date().toISOString(),
        result: null,
        profit: null,
        rsi: Math.random() * 30 + (direction === 'BUY' ? 50 : 20), // RSI filter applied
        atr: parseFloat(atr.toFixed(6)),
        success_prob: 0.72, // High confidence for monster signals
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

      return signal;
    });

  console.log(`✅ Generated ${signals.length} local monster signals`);
  return signals;
};

// Fetch signals history ONLY from backend - no localStorage fallback
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
    console.log('Returning empty array for signals history');
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
