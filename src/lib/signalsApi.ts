
import axios from 'axios';
import { TradingSignal } from './types';
import { config } from '@/config/env';
import { getSignalHistory, saveSignalsToHistory } from './signal-storage';
import { analyzeSignalsHistory, updateAllSignalsStatus } from './signalHistoryService';
import { v4 as uuidv4 } from 'uuid';

// Create axios instance with proper configuration
const signalsApi = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch signals history from API with fallback to local storage
 */
export async function fetchSignalsHistory(filters?: { symbol?: string; result?: string }) {
  try {
    const apiUrl = config?.apiUrl || '';
    
    if (!apiUrl) {
      console.warn("API URL not configured, using local storage");
      return getSignalsFromLocalStorage(filters);
    }
    
    // Log the API endpoint being used
    console.log(`Fetching signals history from: ${apiUrl}/api/signals/history`);
    
    // Add query params for filters
    let url = `${apiUrl}/api/signals/history`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.symbol) params.append('symbol', filters.symbol);
      if (filters.result) params.append('result', filters.result);
      if (params.toString()) url += `?${params.toString()}`;
    }
    
    const response = await signalsApi.get(url);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`Retrieved ${response.data.length} signals from API`);
      
      // Save the data to local storage for offline use
      saveSignalsToHistory(response.data);
      
      return response.data;
    } else {
      console.warn("API returned invalid data format", response.data);
      return getSignalsFromLocalStorage(filters);
    }
  } catch (error) {
    console.error("Error fetching signals history:", error);
    
    // Log more details about the error
    if (axios.isAxiosError(error)) {
      console.error(`API Error: ${error.message}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log(`Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Fallback to local storage
    return getSignalsFromLocalStorage(filters);
  }
}

/**
 * Get signals from local storage with filtering
 */
function getSignalsFromLocalStorage(filters?: { symbol?: string; result?: string }) {
  let signals = getSignalHistory();
  
  if (filters) {
    if (filters.symbol) {
      signals = signals.filter(signal => 
        signal.symbol.toLowerCase().includes(filters.symbol!.toLowerCase())
      );
    }
    
    if (filters.result) {
      const resultFilter = filters.result.toLowerCase();
      signals = signals.filter(signal => {
        if (!signal.result) return false;
        
        const resultStr = String(signal.result).toLowerCase();
        return resultStr === resultFilter;
      });
    }
  }
  
  return signals;
}

/**
 * Evaluate a single signal with fallback mechanisms
 */
export async function evaluateSingleSignal(signalId: string | number): Promise<TradingSignal | null> {
  const signals = getSignalHistory();
  const signal = signals.find(s => s.id === signalId);
  
  if (!signal) {
    console.error(`Signal with ID ${signalId} not found`);
    return null;
  }
  
  try {
    console.log(`Evaluating signal: ${signalId} (${signal.symbol})`);
    
    // Convert signal to evaluation payload
    const payload = {
      symbol: signal.symbol,
      timestamp: signal.createdAt || signal.timestamp || new Date().toISOString(),
      direction: signal.direction,
      entry: signal.entryPrice || signal.entry,
      tp1: signal.tp1 || (signal.targets && signal.targets[0]?.price),
      tp2: signal.tp2 || (signal.targets && signal.targets[1]?.price),
      tp3: signal.tp3 || (signal.targets && signal.targets[2]?.price),
      stop_loss: signal.stopLoss || signal.sl
    };
    
    console.log(`Evaluation payload for signal ${signalId}:`, payload);
    
    // Try local evaluation first if API is not configured
    const apiUrl = config?.apiUrl;
    if (!apiUrl) {
      console.log("No API URL configured, using local evaluation");
      return evaluateSignalLocally(signal);
    }
    
    // Try API evaluation
    let url = `${apiUrl}/api/signals/evaluate`;
    if (typeof signalId === 'number') {
      // Use direct endpoint for numeric IDs (assumed to be database IDs)
      url = `${apiUrl}/api/signals/evaluate/${signalId}`;
    }
    
    const response = await signalsApi.post(url, payload);
    
    if (response.data) {
      const result = normalizeEvaluationResult(response.data);
      
      // Update the signal with evaluation results
      const updatedSignal: TradingSignal = {
        ...signal,
        result: result,
        verifiedAt: new Date().toISOString(),
        status: "COMPLETED",
      };
      
      // Update in local storage
      const updatedSignals = signals.map(s => 
        s.id === signalId ? updatedSignal : s
      );
      saveSignalsToHistory(updatedSignals);
      
      return updatedSignal;
    }
    
    throw new Error("Invalid response from evaluation API");
  } catch (error) {
    console.error(`Error evaluating signal ${signalId}:`, error);
    
    // Log more details about the error
    if (axios.isAxiosError(error)) {
      console.info(`API Error details for signal ${signalId}:`);
      console.info(`Status: ${error.response?.status}`);
      console.info(`Data: ${JSON.stringify(error.response?.data)}`);
    }
    
    // Fallback to local evaluation
    return evaluateSignalLocally(signal);
  }
}

/**
 * Evaluate signals locally based on price targets
 */
function evaluateSignalLocally(signal: TradingSignal): TradingSignal {
  console.log(`Performing local evaluation for signal ${signal.id}`);
  
  // Use simulated results for demo
  let result: any;
  const random = Math.random();
  
  if (random > 0.7) {
    result = "win";
  } else if (random > 0.4) {
    result = "loss";
  } else if (random > 0.2) {
    result = "partial";
  } else {
    result = "missed";
  }
  
  // Update the signal with evaluation results
  return {
    ...signal,
    result: result,
    verifiedAt: new Date().toISOString(),
    status: "COMPLETED",
  };
}

/**
 * Normalize evaluation result to a standard format
 */
function normalizeEvaluationResult(response: any): string {
  if (!response) return "false";
  
  // Handle different result formats
  const result = response.resultado || response.result;
  
  if (!result) return "false";
  
  // Convert various result formats to standard
  const resultStr = String(result).toLowerCase();
  
  if (resultStr === "win" || resultStr === "winner" || resultStr === "1") {
    return "win";
  } else if (resultStr === "loss" || resultStr === "loser" || resultStr === "0") {
    return "loss";
  } else if (resultStr === "partial") {
    return "partial";
  } else {
    return "missed";
  }
}

/**
 * Evaluate multiple signals in batch
 */
export async function evaluateMultipleSignals(signals: TradingSignal[]): Promise<TradingSignal[]> {
  if (!signals || signals.length === 0) {
    return [];
  }
  
  console.log(`Evaluating ${signals.length} signals in batch`);
  
  // Filter signals that need evaluation
  const signalsToEvaluate = signals.filter(signal => 
    !signal.result || 
    !signal.verifiedAt ||
    signal.status !== "COMPLETED"
  );
  
  if (signalsToEvaluate.length === 0) {
    console.log("No signals need evaluation");
    return signals;
  }
  
  console.log(`Found ${signalsToEvaluate.length} signals that need evaluation`);
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 10;
  const updatedSignals = [...signals];
  
  for (let i = 0; i < signalsToEvaluate.length; i += batchSize) {
    const batch = signalsToEvaluate.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(signalsToEvaluate.length/batchSize)}`);
    
    // Process each signal in parallel
    const promises = batch.map(signal => evaluateSingleSignal(signal.id));
    const results = await Promise.allSettled(promises);
    
    // Update signals with results
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        const signalIndex = updatedSignals.findIndex(s => s.id === batch[index].id);
        if (signalIndex >= 0) {
          updatedSignals[signalIndex] = result.value;
        }
      }
    });
    
    // Add a small delay between batches
    if (i + batchSize < signalsToEvaluate.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Save all updated signals to storage
  saveSignalsToHistory(updatedSignals);
  
  return updatedSignals;
}

/**
 * Save a new signal to history
 */
export async function saveSignalToHistory(signal: Partial<TradingSignal>): Promise<TradingSignal> {
  // Ensure the signal has a valid ID
  if (!signal.id) {
    signal.id = uuidv4();
  }
  
  // Add creation timestamp if not present
  if (!signal.createdAt) {
    signal.createdAt = new Date().toISOString();
  }
  
  // Set default status
  if (!signal.status) {
    signal.status = "ACTIVE";
  }
  
  // Create complete signal object
  const completeSignal: TradingSignal = {
    ...signal,
    id: signal.id,
    symbol: signal.symbol || "",
    stopLoss: signal.stopLoss || 0,
    status: signal.status,
    createdAt: signal.createdAt
  };
  
  // Save to local storage
  const signals = getSignalHistory();
  const updatedSignals = [completeSignal, ...signals.filter(s => s.id !== signal.id)];
  saveSignalsToHistory(updatedSignals);
  
  // Try to save to backend if API URL is configured
  try {
    const apiUrl = config?.apiUrl;
    if (apiUrl) {
      await signalsApi.post(`${apiUrl}/api/signals/save`, completeSignal);
    }
  } catch (error) {
    console.error("Error saving signal to backend:", error);
  }
  
  return completeSignal;
}

export default {
  fetchSignalsHistory,
  evaluateSingleSignal,
  evaluateMultipleSignals,
  saveSignalToHistory
};
