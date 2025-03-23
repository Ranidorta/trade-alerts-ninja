
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
    return data as TradingSignal[];
  } catch (error) {
    console.error("Error fetching signals:", error);
    // Return mock data as fallback if API is unavailable
    return [];
  }
};

/**
 * Fetches performance metrics from the API
 * @returns Promise with performance data
 */
export const fetchPerformanceMetrics = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/performance`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    // Return basic structure as fallback
    return {
      totalSignals: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      symbolsData: [],
      signalTypesData: []
    };
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
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching symbols:", error);
    return [];
  }
};
