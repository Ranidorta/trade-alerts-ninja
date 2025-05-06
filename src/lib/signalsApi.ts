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
    
    // Use the updated endpoint that fetches from the database
    const response = await api.get('/api/signals/history', { params: filters });
    
    if (Array.isArray(response.data)) {
      console.log(`Fetched ${response.data.length} signals from database`);
      
      // Transform data for frontend compatibility if needed
      const transformedSignals = response.data.map((signal: any) => {
        // Ensure these properties are present for frontend components
        return {
          ...signal,
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
    // If a 404 error occurs, return an empty array instead of throwing the error
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
      toast({
        title: "Sinal salvo",
        description: "O sinal foi salvo com sucesso no histórico.",
      });
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
      
      toast({
        title: "Sinal salvo localmente",
        description: "O sinal foi salvo localmente pois não foi possível conectar ao servidor.",
        variant: "warning"
      });
      return true;
    } catch (e) {
      console.error('Error saving signal to local history:', e);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o sinal no histórico.",
        variant: "destructive"
      });
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

// New function to evaluate a specific signal
export const evaluateSingleSignal = async (signalId: string): Promise<TradingSignal | null> => {
  try {
    console.log(`Evaluating signal ${signalId}`);
    const response = await api.get(`/api/signals/evaluate/${signalId}`);
    
    if (response.status === 200) {
      const evaluatedSignal = response.data;
      console.log(`Signal ${signalId} evaluation result: ${evaluatedSignal.resultado}`);
      
      // Map API result to frontend result format
      let result: string;
      switch (evaluatedSignal.resultado) {
        case 'win': result = 'WINNER'; break;
        case 'loss': result = 'LOSER'; break;
        case 'partial': result = 'PARTIAL'; break;
        case 'false': result = 'FALSE'; break;
        default: result = evaluatedSignal.resultado;
      }
      
      // Create a proper TradingSignal object
      const updatedSignal: TradingSignal = {
        id: signalId,
        symbol: evaluatedSignal.symbol,
        direction: evaluatedSignal.direction as SignalDirection,
        entryPrice: evaluatedSignal.entry,
        entry: evaluatedSignal.entry,
        stopLoss: evaluatedSignal.stop_loss,
        tp1: evaluatedSignal.tp1,
        tp2: evaluatedSignal.tp2,
        tp3: evaluatedSignal.tp3,
        result: result as SignalResult,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString()
      };
      
      toast({
        title: "Sinal avaliado",
        description: `Resultado: ${result}`,
      });
      
      return updatedSignal;
    }
    
    return null;
  } catch (error) {
    console.error('Error evaluating signal:', error);
    
    toast({
      title: "Erro ao avaliar sinal",
      description: axios.isAxiosError(error) 
        ? error.response?.data?.error || "Erro de conexão com a API" 
        : "Erro desconhecido",
      variant: "destructive"
    });
    
    return null;
  }
};

// New function to evaluate multiple signals
export const evaluateMultipleSignals = async (signals: TradingSignal[]): Promise<TradingSignal[]> => {
  try {
    console.log(`Evaluating ${signals.length} signals`);
    
    const signalsToEvaluate = signals.filter(s => !s.result || !s.verifiedAt);
    
    if (signalsToEvaluate.length === 0) {
      console.log('No signals need evaluation - all already have results');
      return signals;
    }
    
    console.log(`Found ${signalsToEvaluate.length} signals that need evaluation`);
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    const updatedSignals = [...signals]; // Create a copy to avoid mutation
    
    for (let i = 0; i < signalsToEvaluate.length; i += batchSize) {
      const batch = signalsToEvaluate.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(signalsToEvaluate.length/batchSize)}`);
      
      // Evaluate each signal in the batch
      const results = await Promise.all(
        batch.map(signal => evaluateSingleSignal(signal.id))
      );
      
      // Update the signals with the evaluation results
      results.forEach(result => {
        if (result) {
          const index = updatedSignals.findIndex(s => s.id === result.id);
          if (index !== -1) {
            updatedSignals[index] = {
              ...updatedSignals[index],
              result: result.result,
              status: 'COMPLETED',
              verifiedAt: new Date().toISOString()
            };
          }
        }
      });
      
      // Add a small delay between batches
      if (i + batchSize < signalsToEvaluate.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    toast({
      title: "Avaliação concluída",
      description: `${signalsToEvaluate.length} sinais foram avaliados.`,
    });
    
    return updatedSignals;
  } catch (error) {
    console.error('Error evaluating multiple signals:', error);
    
    toast({
      title: "Erro na avaliação em lote",
      description: "Não foi possível avaliar todos os sinais",
      variant: "destructive"
    });
    
    return signals;
  }
};
