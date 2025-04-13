
import axios from 'axios';
import { TradingSignal, PerformanceData } from '@/lib/types';
import { config } from '@/config/env';

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
    // Tentar buscar do backend primeiro
    console.log("Fetching signals history with filters:", filters);
    
    // Transformar o resultado para o formato reconhecido pelo backend
    let apiFilters = { ...filters };
    if (filters?.result) {
      // Normaliza o valor do resultado para maiúsculas
      apiFilters.result = String(filters.result).toUpperCase();
    }
    
    const response = await api.get('/api/signals/history', { params: apiFilters });
    
    // Normalizar os resultados para garantir que sejam consistentes
    const signals = response.data.map((signal: any) => {
      // Se o resultado não estiver em um formato padrão, normalizá-lo
      if (signal.result) {
        // Verificar se é número e converter para string padrão
        if (typeof signal.result === 'number') {
          signal.result = signal.result === 1 ? "WINNER" : "LOSER";
        } else {
          // Normalizar strings para o formato padrão
          const resultLower = String(signal.result).toLowerCase();
          if (resultLower === "win" || resultLower === "winner") {
            signal.result = "WINNER";
          } else if (resultLower === "loss" || resultLower === "loser") {
            signal.result = "LOSER";
          } else if (resultLower === "partial") {
            signal.result = "PARTIAL";
          } else if (resultLower === "missed" || resultLower === "false") {
            signal.result = "FALSE";
          }
        }
      }
      
      return signal;
    });
    
    return signals as TradingSignal[];
  } catch (error) {
    console.error('Error fetching signals history from API:', error);
    
    // Em caso de erro, tentar buscar do banco de dados local
    try {
      console.log("Falling back to local database");
      const localResponse = await api.get('/api/revalidate/signals', { params: filters });
      
      // Normalizar resultados da mesma forma
      const signals = localResponse.data.map((signal: any) => {
        if (signal.result) {
          if (typeof signal.result === 'number') {
            signal.result = signal.result === 1 ? "WINNER" : "LOSER";
          } else {
            const resultLower = String(signal.result).toLowerCase();
            if (resultLower === "win" || resultLower === "winner") {
              signal.result = "WINNER";
            } else if (resultLower === "loss" || resultLower === "loser") {
              signal.result = "LOSER";
            } else if (resultLower === "partial") {
              signal.result = "PARTIAL";
            } else if (resultLower === "missed" || resultLower === "false") {
              signal.result = "FALSE";
            }
          }
        }
        
        return signal;
      });
      
      return signals as TradingSignal[];
    } catch (localError) {
      console.error('Error fetching signals from local database:', localError);
      throw localError; // Re-throw para tratamento de erro no componente
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
