
import axios from "axios";
import { TradingSignal } from "./types";
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
