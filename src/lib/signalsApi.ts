
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
 * Check if a signal can be evaluated
 * @param signal Signal to check
 * @returns Object with canEvaluate flag and reason message
 */
export const canEvaluateSignal = (signal: TradingSignal): {canEvaluate: boolean, reason: string} => {
  // Check if signal has already been evaluated
  if (signal.verifiedAt) {
    return {canEvaluate: false, reason: "Sinal já foi avaliado anteriormente"};
  }
  
  // Check if signal has result set
  if (signal.result && signal.result !== 'pending') {
    return {canEvaluate: false, reason: "Sinal já possui um resultado definido"};
  }
  
  // Check if signal is older than 15 minutes
  if (signal.createdAt) {
    const createdAt = new Date(signal.createdAt);
    const now = new Date();
    const fifteenMinutesInMs = 15 * 60 * 1000;
    
    if (now.getTime() - createdAt.getTime() < fifteenMinutesInMs) {
      const minutesRemaining = Math.ceil((fifteenMinutesInMs - (now.getTime() - createdAt.getTime())) / 60000);
      return {
        canEvaluate: false, 
        reason: `Aguarde ${minutesRemaining} minutos antes de avaliar este sinal`
      };
    }
  }
  
  return {canEvaluate: true, reason: ""};
};

/**
 * Evaluate a single signal
 */
export const evaluateSingleSignal = async (signalId: string): Promise<TradingSignal | null> => {
  try {
    // Get signal from storage first
    const signals = getSignalHistory();
    const signalIndex = signals.findIndex(s => s.id === signalId);
    
    if (signalIndex === -1) {
      console.error('Signal not found in storage:', signalId);
      return null;
    }
    
    const signal = signals[signalIndex];
    
    // Check if signal can be evaluated
    const { canEvaluate, reason } = canEvaluateSignal(signal);
    if (!canEvaluate) {
      console.error('Cannot evaluate signal:', reason);
      return {...signal, error: reason};
    }
    
    // Try API evaluation first
    try {
      const response = await api.post(`/signals/evaluate/${signalId}`);
      
      if (response.status === 200 && response.data) {
        // Add verification timestamp
        const updatedSignal = {
          ...response.data,
          verifiedAt: new Date().toISOString()
        };
        
        // Update signal in local storage
        signals[signalIndex] = updatedSignal;
        saveSignalsToHistory(signals);
        return updatedSignal;
      }
    } catch (apiError) {
      console.error('API evaluation failed, falling back to local evaluation:', apiError);
    }
    
    // Fall back to local evaluation
    const evaluatedSignal = determineSignalResult(signal);
    
    // Add verification timestamp
    evaluatedSignal.verifiedAt = new Date().toISOString();
    
    // Save back to storage
    signals[signalIndex] = evaluatedSignal;
    saveSignalsToHistory(signals);
    
    return evaluatedSignal;
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
    // Filter signals that can be evaluated
    const signalsToEvaluate = signals.filter(signal => {
      const { canEvaluate } = canEvaluateSignal(signal);
      return canEvaluate;
    });
    
    if (signalsToEvaluate.length === 0) {
      console.log('No signals can be evaluated');
      return signals;
    }
    
    // Try API evaluation first
    try {
      const response = await api.post('/signals/evaluate/batch', { signals: signalsToEvaluate });
      
      if (response.status === 200 && Array.isArray(response.data)) {
        // Add verification timestamp to evaluated signals
        const evaluatedSignals = response.data.map(s => ({
          ...s,
          verifiedAt: new Date().toISOString()
        }));
        
        // Update signals in local storage with evaluated ones
        const allSignals = getSignalHistory();
        const updatedSignals = allSignals.map(signal => {
          const evaluatedSignal = evaluatedSignals.find(s => s.id === signal.id);
          return evaluatedSignal || signal;
        });
        
        saveSignalsToHistory(updatedSignals);
        return updatedSignals;
      }
    } catch (apiError) {
      console.error('API batch evaluation failed, falling back to local evaluation:', apiError);
    }
    
    // Fall back to local evaluation
    const allSignals = getSignalHistory();
    const updatedSignals = allSignals.map(signal => {
      // Only evaluate signals that can be evaluated
      const { canEvaluate } = canEvaluateSignal(signal);
      
      if (canEvaluate) {
        const evaluatedSignal = determineSignalResult(signal);
        evaluatedSignal.verifiedAt = new Date().toISOString();
        return evaluatedSignal;
      }
      
      return signal;
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
  prefetchCommonData,
  canEvaluateSignal
};
