
import axios from 'axios';
import { TradingSignal, SignalResult, PerformanceData } from './types';
import { getSignalHistory, saveSignalsToHistory } from './signal-storage';
import { determineSignalResult, calculateSignalProfit } from './signalHistoryService';
import { config } from '@/config/env';

const API_BASE_URL = config.apiUrl || 'http://localhost:3000/api';

/**
 * Base axios instance with common configuration
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Auth token management
let authToken: string | null = null;

/**
 * Set auth token for API requests
 */
export const setAuthToken = (token: string) => {
  authToken = token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

/**
 * Clear auth token
 */
export const clearAuthToken = () => {
  authToken = null;
  delete api.defaults.headers.common['Authorization'];
};

/**
 * Prefetch common data to speed up application
 */
export const prefetchCommonData = async () => {
  try {
    // Prefetch signals history
    await fetchSignalsHistory();
    return true;
  } catch (error) {
    console.error('Error prefetching common data:', error);
    return false;
  }
};

/**
 * Fetch signals with parameters
 */
export const fetchSignals = async (params?: any): Promise<TradingSignal[]> => {
  try {
    const response = await api.get('/signals', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching signals:', error);
    return [];
  }
};

/**
 * Fetch hybrid signals
 */
export const fetchHybridSignals = async (): Promise<TradingSignal[]> => {
  try {
    const response = await api.get('/signals/history/hybrid');
    return response.data;
  } catch (error) {
    console.error('Error fetching hybrid signals:', error);
    return [];
  }
};

/**
 * Fetch performance metrics
 */
export const fetchPerformanceMetrics = async ({ queryKey }: any): Promise<PerformanceData> => {
  const [_, days] = queryKey;
  
  try {
    const response = await api.get(`/metrics/performance?days=${days || 30}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    // Return default empty data
    return {
      total: 0,
      vencedor: { quantidade: 0, percentual: 0 },
      parcial: { quantidade: 0, percentual: 0 },
      perdedor: { quantidade: 0, percentual: 0 },
      falso: { quantidade: 0, percentual: 0 }
    };
  }
};

/**
 * Fetch signals history
 */
export const fetchSignalsHistory = async (filters?: { symbol?: string; result?: string }): Promise<TradingSignal[]> => {
  try {
    // Attempt to get from API
    const url = '/signals/history';
    const params = new URLSearchParams();
    
    if (filters?.symbol) {
      params.append('symbol', filters.symbol);
    }
    
    if (filters?.result) {
      params.append('result', filters.result);
    }
    
    const response = await api.get(`${url}?${params.toString()}`);
    
    if (response.status === 200 && Array.isArray(response.data)) {
      // Save to local storage for offline use
      saveSignalsToHistory(response.data);
      return response.data;
    }
    
    throw new Error('Invalid response from API');
  } catch (error) {
    console.error('Error fetching signals history from API, using local storage:', error);
    
    // Use local storage as fallback
    let signals = getSignalHistory();
    
    // Apply filters if provided
    if (filters) {
      if (filters.symbol) {
        signals = signals.filter(s => s.symbol === filters.symbol);
      }
      
      if (filters.result) {
        signals = signals.filter(s => {
          const resultValue = filters.result;
          
          if (resultValue === 'win') {
            return s.result === 'win' || s.result === 1 || s.result === 'WINNER';
          }
          
          if (resultValue === 'loss') {
            return s.result === 'loss' || s.result === 0 || s.result === 'LOSER';
          }
          
          if (resultValue === 'partial') {
            return s.result === 'partial' || s.result === 'PARTIAL';
          }
          
          return s.result === resultValue;
        });
      }
    }
    
    return signals;
  }
};

/**
 * Normalize signal result to a common format
 */
const normalizeSignalResult = (result: any): SignalResult => {
  if (result === 1 || result === 'win' || result === 'WINNER') {
    return 'win';
  } else if (result === 0 || result === 'loss' || result === 'LOSER') {
    return 'loss';
  } else if (result === 'partial' || result === 'PARTIAL') {
    return 'partial';
  } else if (result === 'missed' || result === 'FALSE' || result === 'false') {
    return 'missed';
  }
  
  // Default to 'missed' instead of 'pending' to match the SignalResult type
  return 'missed';
};

/**
 * Evaluate a single signal
 */
export const evaluateSingleSignal = async (signalId: string): Promise<TradingSignal | null> => {
  try {
    // Try API evaluation first
    try {
      const response = await api.post(`/signals/evaluate/${signalId}`);
      
      if (response.status === 200 && response.data) {
        // Update signal in local storage
        const signals = getSignalHistory();
        const updatedSignals = signals.map(s => 
          s.id === signalId ? { ...s, ...response.data, verifiedAt: new Date().toISOString() } : s
        );
        
        saveSignalsToHistory(updatedSignals);
        return response.data;
      }
    } catch (apiError) {
      console.error('API evaluation failed, falling back to local evaluation:', apiError);
    }
    
    // Fall back to local evaluation
    const signals = getSignalHistory();
    const signalIndex = signals.findIndex(s => s.id === signalId);
    
    if (signalIndex === -1) {
      return null;
    }
    
    const signal = signals[signalIndex];
    
    // Evaluate the signal
    const evaluatedSignal = determineSignalResult(signal);
    
    if (evaluatedSignal.result !== signal.result) {
      // Update signal with new result
      evaluatedSignal.verifiedAt = new Date().toISOString();
      
      // Save back to storage
      signals[signalIndex] = evaluatedSignal;
      saveSignalsToHistory(signals);
      
      return evaluatedSignal;
    }
    
    return signal;
  } catch (error) {
    console.error('Error evaluating signal:', error);
    return null;
  }
};

/**
 * Evaluate multiple signals at once
 */
export const evaluateMultipleSignals = async (signals: TradingSignal[]): Promise<TradingSignal[]> => {
  try {
    // Try API evaluation first
    try {
      const response = await api.post('/signals/evaluate/batch', { signals });
      
      if (response.status === 200 && Array.isArray(response.data)) {
        // Update signals in local storage
        saveSignalsToHistory(response.data);
        return response.data;
      }
    } catch (apiError) {
      console.error('API batch evaluation failed, falling back to local evaluation:', apiError);
    }
    
    // Fall back to local evaluation
    const updatedSignals = signals.map(signal => {
      const evaluatedSignal = determineSignalResult(signal);
      
      if (evaluatedSignal.result !== signal.result) {
        // Update verification timestamp
        evaluatedSignal.verifiedAt = new Date().toISOString();
      }
      
      return evaluatedSignal;
    });
    
    // Save updated signals to storage
    saveSignalsToHistory(updatedSignals);
    
    return updatedSignals;
  } catch (error) {
    console.error('Error evaluating multiple signals:', error);
    return signals; // Return original signals on error
  }
};

// Default export for backward compatibility
export default {
  fetchSignalsHistory,
  evaluateSingleSignal,
  evaluateMultipleSignals,
  fetchSignals,
  fetchHybridSignals,
  fetchPerformanceMetrics,
  setAuthToken,
  clearAuthToken,
  prefetchCommonData
};
