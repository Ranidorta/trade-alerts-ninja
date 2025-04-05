
import { TradingSignal } from "@/lib/types";
import { config } from "@/config/env";

// Default API base URL with fallback
const API_BASE_URL = config.signalsApiUrl || "http://localhost:5000/api";

// Cache para armazenar respostas de API
const apiCache = new Map();
const CACHE_DURATION = 60000; // 1 minuto em milissegundos

/**
 * Gets the current Firebase auth token if available
 * @returns The auth token or null
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    // Check if Firebase Auth is available using safer type checking
    // that won't cause TypeScript errors
    const firebaseObj = (window as any).firebase;
    if (firebaseObj && firebaseObj.auth) {
      const currentUser = firebaseObj.auth().currentUser;
      if (currentUser) {
        return await currentUser.getIdToken(true); // Force token refresh
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
 * Gera uma chave de cache baseada nos parâmetros da requisição
 */
const generateCacheKey = (endpoint: string, params?: any): string => {
  return `${endpoint}:${JSON.stringify(params || {})}`;
};

/**
 * Verifica se há uma resposta em cache válida
 */
const getFromCache = (cacheKey: string) => {
  if (apiCache.has(cacheKey)) {
    const { data, timestamp } = apiCache.get(cacheKey);
    const now = Date.now();
    
    // Verifica se o cache ainda é válido
    if (now - timestamp < CACHE_DURATION) {
      return data;
    }
    // Remove do cache se expirado
    apiCache.delete(cacheKey);
  }
  return null;
};

/**
 * Armazena o resultado no cache
 */
const setInCache = (cacheKey: string, data: any) => {
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
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
    // Extrair forceRefresh e criar uma cópia dos parâmetros sem ela para o cache
    const { forceRefresh, ...cacheableParams } = params || {};
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    if (cacheableParams?.symbol) queryParams.append("symbol", cacheableParams.symbol);
    if (cacheableParams?.type) queryParams.append("type", cacheableParams.type);
    if (cacheableParams?.strategy) queryParams.append("strategy", cacheableParams.strategy);
    if (cacheableParams?.days) queryParams.append("days", cacheableParams.days.toString());
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const cacheKey = generateCacheKey(`signals${queryString}`, null);
    
    // Verificar cache se não for forçado refresh
    if (!forceRefresh) {
      const cachedData = getFromCache(cacheKey);
      if (cachedData) {
        console.log("Using cached signals data");
        return cachedData;
      }
    }
    
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
    
    // Armazenar no cache
    setInCache(cacheKey, mappedData);
    
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
    // Get fetch options with auth token
    const options = await createFetchOptions();
    
    console.log(`Fetching performance data for ${days} days from: ${API_BASE_URL}/performance?days=${days}`);
    const response = await fetch(`${API_BASE_URL}/performance?days=${days}`, options);
    
    const data = await handleApiResponse(response);
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
    
    const data = await handleApiResponse(response);
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
    
    const data = await handleApiResponse(response);
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
