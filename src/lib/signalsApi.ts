import { TradingSignal } from "@/lib/types";
import { config } from "@/config/env";

// Default API base URL with fallback
const API_BASE_URL = config.signalsApiUrl || "http://localhost:5000/api";

// Cache durations in milliseconds
const CACHE_DURATIONS = {
  signals: 5 * 60 * 1000, // 5 minutes
  strategies: 30 * 60 * 1000, // 30 minutes
  symbols: 30 * 60 * 1000, // 30 minutes
  performance: 15 * 60 * 1000, // 15 minutes
};

// Cache objects
const cache = {
  signals: { data: null, timestamp: 0 },
  strategies: { data: null, timestamp: 0 },
  symbols: { data: null, timestamp: 0 },
  performance: { data: null, timestamp: 0 },
};

/**
 * Gets the current Firebase auth token if available
 * @returns The auth token or null
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    // First try to get from localStorage for immediate return
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      return storedToken;
    }
    
    // Check if Firebase Auth is available using safer type checking
    const firebaseObj = (window as any).firebase;
    if (firebaseObj && firebaseObj.auth) {
      const currentUser = firebaseObj.auth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken(true); // Force token refresh
        // Cache the token
        localStorage.setItem('authToken', token);
        return token;
      }
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
 * Handles API responses and checks for authentication/subscription errors
 * @param response The fetch response object
 * @returns The parsed JSON response or throws appropriate error
 */
const handleApiResponse = async (response: Response) => {
  if (response.ok) {
    return await response.json();
  }
  
  // Handle different error cases
  if (response.status === 401) {
    throw new Error("Unauthorized: Please log in to access this content");
  } else if (response.status === 403) {
    // This is specifically for premium access denied
    const errorData = await response.json();
    throw new Error(errorData.message || "Premium access required for this content");
  } else {
    throw new Error(`API error: ${response.status}`);
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
  forceRefresh?: boolean;
}): Promise<TradingSignal[]> => {
  try {
    // Generate cache key based on params
    const cacheKey = JSON.stringify(params || {});
    const forceRefresh = params?.forceRefresh || false;
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && 
        cache.signals.data && 
        cache.signals.timestamp > Date.now() - CACHE_DURATIONS.signals) {
      console.log("Using cached signals data");
      return cache.signals.data as TradingSignal[];
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
    
    const data = await handleApiResponse(response);
    
    // Map the API response to match our TradingSignal interface
    const mappedData = data.map((signal: any) => ({
      ...signal,
      // If signal doesn't have a result property but has a profit,
      // we can determine result from profit
      result: signal.result !== undefined ? signal.result : 
              (signal.profit !== undefined ? (signal.profit > 0 ? 1 : 0) : undefined),
      // Make sure strategy is included in the mapped data
      strategy: signal.strategy || signal.strategy_name || signal.signal_type
    }));
    
    // Update cache
    cache.signals = {
      data: mappedData,
      timestamp: Date.now(),
    };
    
    console.log("Signals fetched:", mappedData.length);
    return mappedData as TradingSignal[];
  } catch (error) {
    console.error("Error fetching signals:", error);
    throw error;
  }
};

/**
 * Fetches signal performance metrics from the API
 * @returns Promise with performance data
 */
export const fetchPerformanceMetrics = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, daysString = "30"] = queryKey;
  // Convert the string back to a number
  const days = parseInt(daysString, 10);
  
  try {
    // Check cache first
    const cacheKey = `performance_${days}`;
    if (cache.performance.data && 
        cache.performance.timestamp > Date.now() - CACHE_DURATIONS.performance) {
      console.log("Using cached performance data");
      return cache.performance.data;
    }
    
    // Get fetch options with auth token
    const options = await createFetchOptions();
    
    console.log(`Fetching performance data for ${days} days from: ${API_BASE_URL}/performance?days=${days}`);
    const response = await fetch(`${API_BASE_URL}/performance?days=${days}`, options);
    
    const data = await handleApiResponse(response);
    
    // Update cache
    cache.performance = {
      data,
      timestamp: Date.now(),
    };
    
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
export const fetchSymbols = async (forceRefresh = false): Promise<string[]> => {
  try {
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && 
        cache.symbols.data && 
        cache.symbols.timestamp > Date.now() - CACHE_DURATIONS.symbols) {
      console.log("Using cached symbols data");
      return cache.symbols.data as string[];
    }
    
    // Get fetch options with auth token if available
    const options = await createFetchOptions();
    
    console.log(`Fetching symbols from: ${API_BASE_URL}/symbols`);
    const response = await fetch(`${API_BASE_URL}/symbols`, options);
    
    const data = await handleApiResponse(response);
    
    // Update cache
    cache.symbols = {
      data,
      timestamp: Date.now(),
    };
    
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
export const fetchStrategies = async (forceRefresh = false): Promise<string[]> => {
  try {
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && 
        cache.strategies.data && 
        cache.strategies.timestamp > Date.now() - CACHE_DURATIONS.strategies) {
      console.log("Using cached strategies data");
      return cache.strategies.data as string[];
    }
    
    // Get fetch options with auth token if available
    const options = await createFetchOptions();
    
    console.log(`Fetching strategies from: ${API_BASE_URL}/strategies`);
    const response = await fetch(`${API_BASE_URL}/strategies`, options);
    
    const data = await handleApiResponse(response);
    
    // Update cache
    cache.strategies = {
      data,
      timestamp: Date.now(),
    };
    
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
    const options = await createFetchOptions();
    const response = await fetch(`${API_BASE_URL}/raw_data/${symbol}`, options);
    
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
        
      const options = await createFetchOptions();
      const response = await fetch(url, options);
      
      const data = await handleApiResponse(response);
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

/**
 * Prefetches common data to speed up application loading
 */
export const prefetchCommonData = async () => {
  try {
    // Start multiple fetches in parallel
    const promises = [
      fetchStrategies(),
      fetchSymbols(),
    ];
    
    // Wait for all to complete
    await Promise.all(promises);
    console.log("Prefetched common data successfully");
  } catch (error) {
    console.error("Error prefetching common data:", error);
  }
};

/**
 * Clears all API caches
 */
export const clearAllCaches = () => {
  cache.signals.data = null;
  cache.signals.timestamp = 0;
  cache.strategies.data = null;
  cache.strategies.timestamp = 0;
  cache.symbols.data = null;
  cache.symbols.timestamp = 0;
  cache.performance.data = null;
  cache.performance.timestamp = 0;
  console.log("All API caches cleared");
};
