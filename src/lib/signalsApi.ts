import axios from 'axios';
import { TradingSignal, PerformanceData, SignalDirection, SignalResult } from '@/lib/types';
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
        variant: "default"
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

// Updated function to evaluate a specific signal with improved ID handling
export const evaluateSingleSignal = async (signalId: string): Promise<TradingSignal | null> => {
  try {
    console.log(`Evaluating signal with ID: ${signalId}`);
    
    // Check if the ID is numeric or string format
    const isNumericId = /^\d+$/.test(signalId);
    let url;
    let payload;
    let response;
    
    if (isNumericId) {
      // If numeric ID, use the ID endpoint
      url = `/api/signals/evaluate/${signalId}`;
      console.log(`Using numeric ID endpoint: ${api.defaults.baseURL}${url}`);
      
      try {
        response = await api.get(url);
      } catch (error) {
        // If numeric ID endpoint fails, try the data-based endpoint as fallback
        console.log(`Numeric ID endpoint failed, trying data-based endpoint as fallback`);
        throw error; // Will be caught by the outer try/catch
      }
    } else {
      // For string IDs or as fallback, use the data-based endpoint
      // First find the signal data from local storage to get the details
      const localHistory = JSON.parse(localStorage.getItem('trade_signal_history') || '[]');
      const signalData = localHistory.find((s: TradingSignal) => s.id === signalId);
      
      if (!signalData) {
        throw new Error(`Signal with ID ${signalId} not found in local storage`);
      }
      
      url = `/api/signals/evaluate`;
      payload = {
        symbol: signalData.symbol,
        timestamp: signalData.createdAt || signalData.timestamp,
        direction: signalData.direction,
        entry: signalData.entryPrice || signalData.entry,
        tp1: signalData.tp1 || (signalData.targets && signalData.targets[0]?.price),
        tp2: signalData.tp2 || (signalData.targets && signalData.targets[1]?.price),
        tp3: signalData.tp3 || (signalData.targets && signalData.targets[2]?.price),
        stop_loss: signalData.stopLoss || signalData.sl
      };
      
      console.log(`Using data-based endpoint: ${api.defaults.baseURL}${url}`);
      console.log(`Payload:`, payload);
      
      response = await api.post(url, payload);
    }
    
    if (response.status === 200) {
      const evaluatedSignal = response.data;
      console.log(`Signal ${signalId} evaluation result:`, evaluatedSignal);
      
      // Map API result to frontend result format
      let result: SignalResult = 'FALSE';
      
      // Handle different result format variations
      if (typeof evaluatedSignal.resultado === 'string') {
        switch (evaluatedSignal.resultado.toLowerCase()) {
          case 'win': result = 'WINNER'; break;
          case 'loss': result = 'LOSER'; break;
          case 'partial': result = 'PARTIAL'; break;
          case 'false': 
          case 'missed': result = 'FALSE'; break;
          case 'winner': result = 'WINNER'; break;
          case 'loser': result = 'LOSER'; break;
          default: result = evaluatedSignal.resultado as SignalResult;
        }
      } else if (evaluatedSignal.resultado === 1) {
        result = 'WINNER';
      } else if (evaluatedSignal.resultado === 0) {
        result = 'LOSER';
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
        result: result,
        status: 'COMPLETED',
        createdAt: evaluatedSignal.timestamp || new Date().toISOString(),
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
    
    if (axios.isAxiosError(error)) {
      // Log detailed error information for debugging
      console.log('API Error Details:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
      console.log('Headers:', error.response?.headers);
      console.log('Request config:', error.config);
      
      let errorMessage = "Erro de conexão com a API";
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = "Endpoint de avaliação não encontrado. Verificando se há uma alternativa...";
          
          // Try local evaluation as a fallback
          try {
            // Local evaluation logic would go here
            // This is a stub for now since we don't have the candle data locally
            errorMessage = "Não foi possível avaliar o sinal localmente sem dados históricos.";
          } catch (localError) {
            console.error("Local evaluation also failed:", localError);
          }
        } else if (error.response.status === 400) {
          errorMessage = "Dados inválidos para avaliação: " + (error.response.data?.error || "formato incorreto");
        } else if (error.response.status === 500) {
          errorMessage = "Erro interno no servidor ao avaliar o sinal";
        }
      }
      
      toast({
        title: "Erro ao avaliar sinal",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Erro ao avaliar sinal",
        description: "Erro desconhecido ao conectar com a API",
        variant: "destructive"
      });
    }
    
    return null;
  }
};

// Updated function to evaluate multiple signals with improved error handling
export const evaluateMultipleSignals = async (signals: TradingSignal[]): Promise<TradingSignal[]> => {
  try {
    console.log(`Evaluating ${signals.length} signals`);
    
    const signalsToEvaluate = signals.filter(s => 
      !s.result || 
      !s.verifiedAt || 
      (s.status !== "COMPLETED" && s.createdAt)
    );
    
    if (signalsToEvaluate.length === 0) {
      console.log('No signals need evaluation - all already have results');
      return signals;
    }
    
    console.log(`Found ${signalsToEvaluate.length} signals that need evaluation`);
    
    // Create a copy to avoid mutation
    const updatedSignals = [...signals]; 
    
    // Process signals one by one to avoid overwhelming the API
    for (const signal of signalsToEvaluate) {
      try {
        console.log(`Evaluating signal: ${signal.id} (${signal.symbol})`);
        
        // Prepare payload for the data-based endpoint
        const payload = {
          symbol: signal.symbol,
          timestamp: signal.createdAt || signal.timestamp,
          direction: signal.direction,
          entry: signal.entryPrice || signal.entry,
          tp1: signal.tp1 || (signal.targets && signal.targets[0]?.price),
          tp2: signal.tp2 || (signal.targets && signal.targets[1]?.price),
          tp3: signal.tp3 || (signal.targets && signal.targets[2]?.price),
          stop_loss: signal.stopLoss || signal.sl
        };
        
        console.log(`Evaluation payload for signal ${signal.id}:`, payload);
        
        // Ensure we're using the correct base URL for this request
        const response = await api.post('/api/signals/evaluate', payload);
        
        if (response.status === 200) {
          const evaluatedData = response.data;
          console.log(`Evaluation result for signal ${signal.id}:`, evaluatedData);
          
          // Map the result to our frontend format
          let result: SignalResult;
          
          // Handle different result format variations
          if (typeof evaluatedData.resultado === 'string') {
            switch (evaluatedData.resultado.toLowerCase()) {
              case 'win': result = 'WINNER'; break;
              case 'loss': result = 'LOSER'; break;
              case 'partial': result = 'PARTIAL'; break;
              case 'false': 
              case 'missed': result = 'FALSE'; break;
              case 'winner': result = 'WINNER'; break;
              case 'loser': result = 'LOSER'; break;
              default: result = evaluatedData.resultado as SignalResult;
            }
          } else if (evaluatedData.resultado === 1) {
            result = 'WINNER';
          } else if (evaluatedData.resultado === 0) {
            result = 'LOSER';
          } else {
            result = 'FALSE'; // Default fallback
          }
          
          // Update the signal in our local array
          const index = updatedSignals.findIndex(s => s.id === signal.id);
          if (index !== -1) {
            updatedSignals[index] = {
              ...updatedSignals[index],
              result: result,
              status: 'COMPLETED',
              verifiedAt: new Date().toISOString()
            };
          }
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`Error evaluating signal ${signal.id}:`, error);
        
        // Continue with the next signal on error
        if (axios.isAxiosError(error)) {
          console.log(`API Error details for signal ${signal.id}:`);
          console.log('Status:', error.response?.status);
          console.log('Data:', error.response?.data);
        }
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
      description: "Não foi possível avaliar todos os sinais. Verifique a conexão com a API.",
      variant: "destructive"
    });
    
    return signals;
  }
};
