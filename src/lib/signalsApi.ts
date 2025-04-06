
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
    console.log("Fetching hybrid signals from:", `${config.apiUrl || 'http://localhost:5000'}/api/signals/history/hybrid`);
    const response = await api.get('/api/signals/history/hybrid');
    return response.data as TradingSignal[];
  } catch (error) {
    console.error('Error fetching hybrid signals:', error);
    // If the error is 404, it means no signals were found, which is a valid state
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log('No hybrid signals found (404 response)');
      return []; // Return empty array instead of throwing
    }
    throw error; // Re-throw other errors
  }
};

export const fetchSignalsHistory = async (filters?: { symbol?: string; result?: string }) => {
  try {
    // Fix: Use correct API endpoint with properly formed URL
    const response = await api.get('/api/signals/history', { params: filters });
    return response.data as TradingSignal[];
  } catch (error) {
    console.error('Error fetching signals history:', error);
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
