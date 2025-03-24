
import { TradingSignal } from "@/lib/types";
import { config } from "@/config/env";

// Default API base URL with fallback
const API_BASE_URL = config.signalsApiUrl || "http://localhost:5000/api";

/**
 * Fetches trading signals from the API
 * @param params Optional query parameters
 * @returns Promise with trading signals
 */
export const fetchSignals = async (params?: {
  symbol?: string;
  type?: string;
  days?: number;
}): Promise<TradingSignal[]> => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params?.symbol) queryParams.append("symbol", params.symbol);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.days) queryParams.append("days", params.days.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    
    // Make API request
    const response = await fetch(`${API_BASE_URL}/signals${queryString}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map the API response to match our TradingSignal interface
    // This ensures we have proper values for 'result' if it's missing
    const mappedData = data.map((signal: any) => ({
      ...signal,
      // If signal doesn't have a result property but has a profit,
      // we can determine result from profit
      result: signal.result !== undefined ? signal.result : 
              (signal.profit !== undefined ? (signal.profit > 0 ? 1 : 0) : undefined)
    }));
    
    console.log("Signals fetched:", mappedData);
    return mappedData as TradingSignal[];
  } catch (error) {
    console.error("Error fetching signals:", error);
    throw error;
  }
};

/**
 * Fetches performance metrics from the API
 * This has been refactored to work properly with React Query
 * @returns Promise with performance data
 */
export const fetchPerformanceMetrics = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, daysString = "30"] = queryKey;
  // Convert the string back to a number
  const days = parseInt(daysString, 10);
  
  try {
    const response = await fetch(`${API_BASE_URL}/performance?days=${days}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Performance metrics fetched:", data);
    return data;
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    throw error;
  }
};

/**
 * Fetches available trading symbols
 * @returns Promise with list of symbols
 */
export const fetchSymbols = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/symbols`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Symbols fetched:", data);
    return data;
  } catch (error) {
    console.error("Error fetching symbols:", error);
    throw error;
  }
};

/**
 * Fetches raw candle data for a specific symbol
 * @param symbol The trading symbol
 * @returns Promise with raw candle data
 */
export const fetchRawData = async (symbol: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/raw_data/${symbol}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // No data found for this symbol
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Raw data fetched for ${symbol}:`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching raw data for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Fetches all available symbols from Bybit
 * Handles pagination automatically
 * @returns Promise with complete list of symbols
 */
export const fetchAvailableSymbols = async (): Promise<string[]> => {
  try {
    let allSymbols: string[] = [];
    let nextCursor: string | null = null;
    
    do {
      const url = nextCursor 
        ? `${API_BASE_URL}/available_symbols?cursor=${nextCursor}` 
        : `${API_BASE_URL}/available_symbols`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      allSymbols = [...allSymbols, ...data.symbols];
      nextCursor = data.nextCursor;
      
    } while (nextCursor);
    
    console.log(`Total available symbols: ${allSymbols.length}`);
    return allSymbols;
  } catch (error) {
    console.error("Error fetching available symbols:", error);
    throw error;
  }
};
