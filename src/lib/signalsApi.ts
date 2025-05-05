
import axios from 'axios';
import { TradingSignal, PerformanceData } from '@/lib/types';
import { config } from '@/config/env';
import { toast } from '@/components/ui/use-toast';

// Create an axios instance with the base URL
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
    
    // Add absolute URL as a fallback to debug potential cross-origin issues
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
    console.log(`Fetching signals history with filters:`, filters);
    console.log(`API URL: ${api.defaults.baseURL}/api/signals/history`);
    
    // Usar o endpoint atualizado que agora busca do banco de dados
    const response = await api.get('/api/signals/history', { params: filters });
    
    if (Array.isArray(response.data)) {
      console.log(`Fetched ${response.data.length} signals from database`);
      
      // Transform data for frontend compatibility if needed
      const transformedSignals = response.data.map((signal: any) => {
        return {
          ...signal,
          // Ensure these properties are present for frontend components
          id: signal.id || `${signal.symbol}-${signal.timestamp}`,
          pair: signal.pair || signal.symbol,
          type: signal.type || (signal.direction === 'BUY' ? 'LONG' : 'SHORT'),
          entryPrice: signal.entryPrice || signal.entry,
          createdAt: signal.createdAt || signal.timestamp,
          status: signal.status || (signal.result ? 'COMPLETED' : 'ACTIVE'),
          stopLoss: signal.stopLoss || signal.stop_loss || signal.sl,
          targets: signal.targets || [
            { level: 1, price: signal.tp1, hit: signal.result === 'win' || signal.result === 'partial' },
            { level: 2, price: signal.tp2, hit: signal.result === 'win' },
            { level: 3, price: signal.tp3, hit: signal.result === 'win' }
          ],
          strategy: signal.strategy || 'CLASSIC'
        };
      });
      
      return transformedSignals as TradingSignal[];
    } else {
      console.log('API returned non-array response:', response.data);
      return [] as TradingSignal[];
    }
  } catch (error) {
    console.error('Error fetching signals history:', error);
    // Se ocorrer um erro 404, retornar um array vazio em vez de lançar o erro
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log('No signals found in database (404 response)');
      return [] as TradingSignal[];
    }
    throw error;
  }
};

// New function to save a signal to history
export const saveSignalToHistory = async (signal: TradingSignal) => {
  try {
    console.log(`Saving signal to history:`, signal);
    
    const response = await api.post('/api/signals/save', signal);
    
    if (response.status === 200) {
      console.log('Signal saved to history successfully');
      return true;
    } else {
      console.error('Error saving signal to history:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error saving signal to history:', error);
    
    // Try to save locally if API fails
    try {
      const localHistory = JSON.parse(localStorage.getItem('trade_signal_history') || '[]');
      
      // Add or update signal in local history
      const existingIndex = localHistory.findIndex((s: TradingSignal) => s.id === signal.id);
      if (existingIndex >= 0) {
        localHistory[existingIndex] = signal;
      } else {
        localHistory.unshift(signal);
      }
      
      localStorage.setItem('trade_signal_history', JSON.stringify(localHistory.slice(0, 100)));
      console.log('Signal saved to local history');
      return true;
    } catch (e) {
      console.error('Error saving signal to local history:', e);
      return false;
    }
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
