
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

export interface TradingSignalRecord {
  id: number;
  timestamp: string;
  symbol: string;
  signal: number;
  result: number;
  entry_price: number;
  exit_price: number;
  atr: number;
  position_size: number;
  profit_loss: number;
}

export interface PerformanceData {
  totalSignals: number;
  winningSignals: number;
  losingSignals: number;
  winRate: number;
  totalPnL: number;
  avgPositionSize: number;
  capitalHistory: {
    date: string;
    capital: number;
  }[];
}

export const fetchSignalHistory = async (): Promise<TradingSignalRecord[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/signals`);
    return response.data;
  } catch (error) {
    console.error("Error fetching signal history:", error);
    return [];
  }
};

export const fetchPerformanceData = async (): Promise<PerformanceData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/performance`);
    return response.data;
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return {
      totalSignals: 0,
      winningSignals: 0,
      losingSignals: 0,
      winRate: 0,
      totalPnL: 0,
      avgPositionSize: 0,
      capitalHistory: [{ date: new Date().toISOString().split('T')[0], capital: 10000 }]
    };
  }
};

export const uploadMarketData = async (file: File, symbol: string = "BTCUSDT"): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("symbol", symbol);
    
    const response = await axios.post(`${API_BASE_URL}/process`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    return response.data;
  } catch (error) {
    console.error("Error uploading market data:", error);
    throw error;
  }
};
