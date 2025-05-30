import axios from 'axios';
import { TradingSignal, PerformanceData } from '@/lib/types';
import { config } from '@/config/env';

// Create an axios instance with the base URL pointing to Python backend
const api = axios.create({
  baseURL: config.apiUrl || 'http://localhost:5000',
  timeout: 15000, // Increased timeout
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

// Check backend health
export const checkBackendHealth = async () => {
  try {
    console.log(`Checking backend health at: ${api.defaults.baseURL}/api/health`);
    
    const response = await api.get('/api/health', { timeout: 5000 });
    
    console.log('Backend health check result:', response.data);
    return response.data;
  } catch (error) {
    console.error('Backend health check failed:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend server is not running');
      }
      if (error.code === 'ENOTFOUND') {
        throw new Error('Cannot resolve backend hostname');
      }
      if (error.response?.status === 404) {
        throw new Error('Health endpoint not found');
      }
    }
    
    throw error;
  }
};

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
    console.log('🚀 Starting monster signal generation...');
    
    // First check backend health
    try {
      const healthStatus = await checkBackendHealth();
      console.log('✅ Backend is healthy:', healthStatus);
    } catch (healthError) {
      console.warn('⚠️ Backend health check failed:', healthError.message);
      throw new Error(`Backend unavailable: ${healthError.message}`);
    }
    
    const defaultSymbols = [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
      'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
    ];
    
    console.log(`🔍 Generating monster signals for ${(symbols || defaultSymbols).length} symbols...`);
    
    const response = await api.post('/api/signals/generate/monster', {
      symbols: symbols || defaultSymbols
    });
    
    console.log(`✅ Successfully generated ${response.data.signals.length} monster signals`);
    console.log('Monster signals response:', response.data);
    
    return response.data.signals as TradingSignal[];
  } catch (error) {
    console.error('❌ Error generating monster signals:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout
        }
      });
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to backend server. Please ensure the Flask API is running on http://localhost:5000');
      }
      
      if (error.code === 'ENOTFOUND') {
        throw new Error('Cannot resolve backend hostname. Check your network connection.');
      }
      
      if (error.response?.status === 500) {
        const errorData = error.response.data;
        throw new Error(`Backend error: ${errorData?.message || 'Internal server error'}`);
      }
      
      if (error.response?.status === 404) {
        throw new Error('Monster signals endpoint not found. Check if the API route is properly configured.');
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. The backend is taking too long to respond.');
      }
    }
    
    throw error;
  }
};

// Get monster signal generation status
export const getMonsterSignalStatus = async () => {
  try {
    console.log('📊 Checking monster signal generation status...');
    
    const response = await api.get('/api/signals/generate/monster/status');
    
    console.log('Monster status response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting monster signal status:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to backend server');
      }
    }
    
    throw error;
  }
};
