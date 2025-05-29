
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

// Initialize auth token from localStorage if available
const initializeAuth = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    setAuthToken(token);
  }
};

initializeAuth();

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
      
      // If the error is 404, it means no signals were found, which is a valid state
      if (error.response?.status === 404) {
        console.log('No hybrid signals found (404 response)');
        return []; // Return empty array instead of throwing
      }
    }
    throw error; // Re-throw other errors
  }
};

export const fetchSignalsHistory = async (filters?: { symbol?: string; result?: string }) => {
  try {
    console.log(`Fetching signals history from Python backend: ${api.defaults.baseURL}/api/signals/history`);
    
    // Use the SQLite-based endpoint from Python backend
    const response = await api.get('/api/signals/history', { params: filters });
    
    console.log(`Successfully fetched ${response.data.length} signals from Python backend SQLite database`);
    
    // Convert backend format to TradingSignal format
    const signals: TradingSignal[] = response.data.map((signal: any) => ({
      id: signal.id?.toString() || `${signal.symbol}_${signal.timestamp}`,
      symbol: signal.symbol,
      direction: signal.signal?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
      entryPrice: signal.price || 0,
      stopLoss: signal.sl || 0,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      leverage: signal.leverage,
      status: signal.result ? "COMPLETED" : "ACTIVE",
      createdAt: signal.timestamp,
      timestamp: signal.timestamp,
      rsi: signal.rsi,
      atr: signal.atr,
      size: signal.size,
      result: signal.result === 'WINNER' ? 'WINNER' : 
              signal.result === 'LOSER' ? 'LOSER' : 
              signal.result === 'PARTIAL' ? 'PARTIAL' : 
              signal.result === 'FALSE' ? 'FALSE' : 
              signal.result,
      strategy: signal.strategy,
      entry_price: signal.price || 0,
      sl: signal.sl || 0
    }));
    
    return signals;
  } catch (error) {
    console.error('Error fetching signals history from Python backend:', error);
    if (axios.isAxiosError(error)) {
      console.log(`API responded with status: ${error.response?.status}`);
      console.log(`Error message: ${error.response?.data?.error || error.message}`);
      console.log(`Request URL: ${error.config?.url}`);
      console.log(`Base URL: ${api.defaults.baseURL}`);
      
      // If the error is 404, it means no signals were found
      if (error.response?.status === 404) {
        console.log('No signals found in Python backend SQLite database (404 response)');
        return []; // Return empty array instead of throwing
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
