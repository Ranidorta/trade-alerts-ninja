
import { TradingSignal } from "@/lib/types";
import { config } from "@/config/env";

// Default API base URL with fallback
const API_BASE_URL = config.signalsApiUrl || "http://localhost:5000/api";

/**
 * Gets the current Firebase auth token if available
 * @returns The auth token or null
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    // Check if Firebase Auth is available
    if (window.firebase && window.firebase.auth) {
      const currentUser = window.firebase.auth().currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
    }
    
    // Try to get from localStorage if Firebase not initialized
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      return storedToken;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

/**
 * Creates fetch options with authorization header if token is available
 * @returns Fetch options object
 */
const createFetchOptions = async (): Promise<RequestInit> => {
  const token = await getAuthToken();
  const options: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (token) {
    (options.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  return options;
};

/**
 * Checks if the API is available
 * @returns Promise that resolves to true if the API is available
 */
export const checkApiAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Set a short timeout to quickly detect if the API is unreachable
      signal: AbortSignal.timeout(3000)
    });
    
    return response.ok;
  } catch (error) {
    console.error("API availability check failed:", error);
    return false;
  }
};

/**
 * Fetches trading signals from the API
 * @param params Optional query parameters
 * @returns Promise with trading signals
 */
export const fetchSignals = async (params?: {
  symbol?: string;
  type?: string;
  strategy?: string;
  days?: number;
}): Promise<TradingSignal[]> => {
  try {
    // Check if API is available first
    const isApiAvailable = await checkApiAvailability();
    if (!isApiAvailable) {
      throw new Error("API is not available. Please check backend connection.");
    }
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (params?.symbol) queryParams.append("symbol", params.symbol);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.strategy) queryParams.append("strategy", params.strategy);
    if (params?.days) queryParams.append("days", params.days.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    
    // Get fetch options with auth token if available
    const options = await createFetchOptions();
    
    // Make API request
    console.log(`Fetching signals from: ${API_BASE_URL}/signals${queryString}`);
    const response = await fetch(`${API_BASE_URL}/signals${queryString}`, options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate that data is an array
    if (!Array.isArray(data)) {
      console.warn("API returned non-array data:", data);
      return [];
    }
    
    // Map the API response to match our TradingSignal interface
    const mappedData = data.map((signal: any) => ({
      ...signal,
      // If signal doesn't have a result property but has a profit,
      // we can determine result from profit
      result: signal.result !== undefined ? signal.result : 
              (signal.profit !== undefined ? (signal.profit > 0 ? 1 : 0) : undefined),
      // Make sure strategy is included in the mapped data
      strategy: signal.strategy || signal.strategy_name || signal.signal_type,
      // Ensure id is a string
      id: signal.id?.toString() || Math.random().toString(36).substr(2, 9)
    }));
    
    console.log("Signals fetched:", mappedData.length);
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
    console.log(`Fetching performance data for ${days} days from: ${API_BASE_URL}/performance?days=${days}`);
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
    // Get fetch options with auth token if available
    const options = await createFetchOptions();
    
    console.log(`Fetching symbols from: ${API_BASE_URL}/symbols`);
    const response = await fetch(`${API_BASE_URL}/symbols`, options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Symbols fetched:", data.length);
    return data;
  } catch (error) {
    console.error("Error fetching symbols:", error);
    throw error;
  }
};

/**
 * Fetches available strategies
 * @returns Promise with list of strategies
 */
export const fetchStrategies = async (): Promise<string[]> => {
  try {
    // Get fetch options with auth token if available
    const options = await createFetchOptions();
    
    console.log(`Fetching strategies from: ${API_BASE_URL}/strategies`);
    const response = await fetch(`${API_BASE_URL}/strategies`, options);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Strategies fetched:", data.length);
    return data;
  } catch (error) {
    console.error("Error fetching strategies:", error);
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

/**
 * Fetches the user profile if authenticated
 * @returns User profile data or null if not authenticated
 */
export const fetchUserProfile = async () => {
  try {
    // Get fetch options with auth token if available
    const options = await createFetchOptions();
    const token = await getAuthToken();
    
    // If no token, user is not authenticated
    if (!token) {
      return null;
    }
    
    console.log(`Fetching user profile from: ${API_BASE_URL}/user/profile`);
    const response = await fetch(`${API_BASE_URL}/user/profile`, options);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

/**
 * Sets the auth token in localStorage
 * @param token The Firebase auth token
 */
export const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
};

/**
 * Clears the auth token from localStorage
 */
export const clearAuthToken = () => {
  localStorage.removeItem('authToken');
};
