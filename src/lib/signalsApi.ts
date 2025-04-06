
import axios from "axios";
import { TradingSignal, PerformanceMetrics } from "./types";
import { config } from "@/config/env";

/**
 * Fetch historical trading signals from the API
 * @param filters Optional filters for symbol and result
 * @returns Promise with array of trading signals
 */
export const fetchSignalsHistory = async (filters?: { 
  symbol?: string;
  result?: string;
}): Promise<TradingSignal[]> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (filters?.symbol) {
      params.append('symbol', filters.symbol);
    }
    if (filters?.result) {
      params.append('result', filters.result);
    }

    // Construct URL with potential query params
    const queryString = params.toString();
    const url = `${config.apiUrl || ''}/api/signals/history${queryString ? `?${queryString}` : ''}`;
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching signals history:", error);
    throw error;
  }
};

/**
 * Fetch signals from the API
 * @param params Parameters for the API request
 * @returns Promise with array of trading signals
 */
export const fetchSignals = async (params?: any): Promise<TradingSignal[]> => {
  try {
    const response = await axios.get(`${config.apiUrl || ''}/api/signals`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching signals:", error);
    throw error;
  }
};

/**
 * Fetch performance metrics from the API
 * @param options Query options
 * @returns Promise with performance metrics
 */
export const fetchPerformanceMetrics = async (options?: any): Promise<PerformanceMetrics> => {
  const days = options?.queryKey?.[1] || '30';
  try {
    const response = await axios.get(`${config.apiUrl || ''}/api/performance?days=${days}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    throw error;
  }
};

/**
 * Set the authentication token for API requests
 * @param token The authentication token
 */
export const setAuthToken = (token: string): void => {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

/**
 * Clear the authentication token from API requests
 */
export const clearAuthToken = (): void => {
  delete axios.defaults.headers.common['Authorization'];
};

/**
 * Prefetch common data to improve user experience
 */
export const prefetchCommonData = async (): Promise<void> => {
  try {
    // Prefetch performance metrics
    await fetchPerformanceMetrics({ queryKey: ['performance', '30'] });
    // Add other prefetch calls as needed
  } catch (error) {
    console.error("Error prefetching common data:", error);
  }
};
