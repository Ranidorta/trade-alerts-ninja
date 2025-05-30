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

// Fetch signals history ONLY from backend - no localStorage fallback
export const fetchSignalsHistory = async (filters?: { symbol?: string; result?: string }) => {
  try {
    console.log('Fetching signals history from backend API...');
    
    const params: any = {};
    if (filters?.symbol) params.symbol = filters.symbol;
    if (filters?.result) params.result = filters.result;
    
    const response = await api.get('/api/signals/history', { params });
    
    console.log(`Successfully fetched ${response.data.length} signals from backend`);
    
    return response.data as TradingSignal[];
  } catch (error) {
    console.error('Error fetching signals history from backend:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.log('No signals found in backend database');
        return [];
      }
    }
    
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

// Trigger manual evaluation of all signals
export const triggerSignalEvaluation = async () => {
  try {
    const response = await api.post('/api/signals/evaluate');
    return response.data;
  } catch (error) {
    console.error('Error triggering signal evaluation:', error);
    throw error;
  }
};

// Get evaluation status
export const getEvaluationStatus = async () => {
  try {
    const response = await api.get('/api/signals/evaluation/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching evaluation status:', error);
    throw error;
  }
};

// Generate monster signals using backend
export const generateMonsterSignals = async (symbols?: string[]) => {
  try {
    console.log('Generating monster signals using backend generator...');
    
    const defaultSymbols = [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
      'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
    ];
    
    const response = await api.post('/api/signals/generate/monster', {
      symbols: symbols || defaultSymbols
    });
    
    console.log(`Successfully generated ${response.data.signals.length} monster signals`);
    
    return response.data.signals as TradingSignal[];
  } catch (error) {
    console.error('Error generating monster signals:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 500) {
        throw new Error('Backend signal generation failed. Please try again.');
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to backend. Using local fallback.');
      }
    }
    
    throw error;
  }
};

// Get monster signal generation status
export const getMonsterSignalStatus = async () => {
  try {
    const response = await api.get('/api/signals/generate/monster/status');
    return response.data;
  } catch (error) {
    console.error('Error getting monster signal status:', error);
    throw error;
  }
};
