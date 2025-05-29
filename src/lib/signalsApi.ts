import axios from 'axios';
import { TradingSignal, PerformanceData } from '@/lib/types';
import { config } from '@/config/env';

// Create an axios instance with the base URL pointing to Python backend
const api = axios.create({
  baseURL: config.apiUrl || 'http://localhost:5000',
  timeout: 10000,
});

// Auth token management
let authToken: string | null = null;

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

// Get signals from localStorage (from Sinais tab)
const getSignalsFromLocalStorage = (): TradingSignal[] => {
  try {
    const signals = localStorage.getItem('archived_trading_signals');
    return signals ? JSON.parse(signals) : [];
  } catch (error) {
    console.error('Error reading signals from localStorage:', error);
    return [];
  }
};

// Validate signal using Bybit API
const validateSignalWithBybit = async (signal: TradingSignal): Promise<TradingSignal> => {
  try {
    console.log(`Validating signal ${signal.id} with Bybit API...`);
    
    // Get current price from Bybit
    const response = await axios.get(`https://api.bybit.com/v5/market/tickers`, {
      params: {
        category: 'linear',
        symbol: signal.symbol
      }
    });
    
    if (response.data?.result?.list?.[0]) {
      const ticker = response.data.result.list[0];
      const currentPrice = parseFloat(ticker.lastPrice);
      
      // Update signal with current price and validation status
      const updatedSignal = { ...signal };
      updatedSignal.currentPrice = currentPrice;
      updatedSignal.verifiedAt = new Date().toISOString();
      
      // Check if targets were hit or stop loss was hit
      if (signal.direction === 'BUY') {
        // For BUY signals, check if price went above targets or below stop loss
        if (currentPrice <= signal.stopLoss) {
          updatedSignal.result = 'LOSER';
          updatedSignal.status = 'COMPLETED';
        } else if (signal.tp1 && currentPrice >= signal.tp1) {
          updatedSignal.result = 'WINNER';
          updatedSignal.status = 'COMPLETED';
        }
      } else {
        // For SELL signals, check if price went below targets or above stop loss
        if (currentPrice >= signal.stopLoss) {
          updatedSignal.result = 'LOSER';
          updatedSignal.status = 'COMPLETED';
        } else if (signal.tp1 && currentPrice <= signal.tp1) {
          updatedSignal.result = 'WINNER';
          updatedSignal.status = 'COMPLETED';
        }
      }
      
      return updatedSignal;
    }
    
    return signal;
  } catch (error) {
    console.error(`Error validating signal ${signal.id} with Bybit:`, error);
    return {
      ...signal,
      error: 'Failed to validate with Bybit API'
    };
  }
};

// Fetch signals history from localStorage and validate with Bybit
export const fetchSignalsHistory = async (filters?: { symbol?: string; result?: string }) => {
  try {
    console.log('Fetching signals from localStorage and validating with Bybit...');
    
    let signals = getSignalsFromLocalStorage();
    
    // Apply filters if provided
    if (filters?.symbol) {
      signals = signals.filter(signal => signal.symbol === filters.symbol);
    }
    if (filters?.result) {
      signals = signals.filter(signal => signal.result === filters.result);
    }
    
    // Validate a few recent signals with Bybit API (to avoid rate limits)
    const recentSignals = signals.slice(0, 10);
    const validatedSignals = await Promise.all(
      recentSignals.map(signal => validateSignalWithBybit(signal))
    );
    
    // Replace the first 10 signals with validated ones
    const finalSignals = [...validatedSignals, ...signals.slice(10)];
    
    console.log(`Successfully loaded ${finalSignals.length} signals from localStorage`);
    
    return finalSignals;
  } catch (error) {
    console.error('Error fetching signals history:', error);
    throw error;
  }
};

// Signal API functions
export const fetchSignals = async (params?: any) => {
  try {
    const response = await api.get('/api/signals', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching signals:', error);
    throw error;
  }
};

export const fetchHybridSignals = async () => {
  try {
    console.log(`Fetching hybrid signals from: ${api.defaults.baseURL}/api/signals/history/hybrid`);
    
    const url = '/api/signals/history/hybrid';
    
    const response = await api.get(url);
    
    if (response.status === 200) {
      console.log(`Successfully fetched ${response.data.length} hybrid signals`);
    }
    
    return response.data as TradingSignal[];
  } catch (error) {
    console.error('Error fetching hybrid signals:', error);
    if (axios.isAxiosError(error)) {
      console.log(`API responded with status: ${error.response?.status}`);
      console.log(`Error message: ${error.response?.data?.error || error.message}`);
      console.log(`Request URL: ${error.config?.url}`);
      console.log(`Base URL: ${api.defaults.baseURL}`);
      
      if (error.response?.status === 404) {
        console.log('No hybrid signals found (404 response)');
        return [];
      }
    }
    throw error;
  }
};

export const fetchPerformanceMetrics = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, daysParam] = queryKey;
  const days = daysParam ? parseInt(daysParam) : 30;
  
  try {
    const response = await api.get('/api/performance', {
      params: { days }
    });
    return response.data as PerformanceData;
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    throw error;
  }
};

export const prefetchCommonData = async () => {
  // This function can be used to prefetch data that's commonly needed
  try {
    // Example: Prefetch market overview, active signals, etc.
    return true;
  } catch (error) {
    console.error('Error prefetching common data:', error);
    return false;
  }
};
