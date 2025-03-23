import axios from "axios";
import { TradingSignal } from "@/lib/types";

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

// Let's update the interface for our signal generation functions to include signal type
export const generateTradingSignal = async (symbol: string, signalType: string = "classic"): Promise<TradingSignal | null> => {
  try {
    // Here you would make an API call to your backend
    // For now we'll create mock data
    console.log(`Generating ${signalType} signal for ${symbol}...`);
    
    // Generate a unique ID
    const id = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
    
    // Create a new signal
    const newSignal: TradingSignal = {
      id,
      symbol: symbol.replace("USDT", ""),
      pair: symbol,
      type: Math.random() > 0.5 ? "LONG" : "SHORT",
      entryMin: 100 + Math.random() * 5,
      entryMax: 105 + Math.random() * 5,
      entryAvg: 102.5 + Math.random() * 5,
      stopLoss: 95 + Math.random() * 5,
      targets: [
        { level: 1, price: 110 + Math.random() * 5, hit: false },
        { level: 2, price: 115 + Math.random() * 5, hit: false },
        { level: 3, price: 120 + Math.random() * 5, hit: false }
      ],
      leverage: Math.ceil(Math.random() * 10),
      status: "WAITING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      technicalIndicators: {
        rsi: 30 + Math.random() * 40,
        macd: Math.random() - 0.5,
        macdSignal: Math.random() - 0.5,
        shortMa: 100 + Math.random() * 10,
        longMa: 90 + Math.random() * 10,
        // Fast signals might have different indicator values
        confidence: signalType === "fast" ? 0.6 + Math.random() * 0.3 : 0.7 + Math.random() * 0.2,
      },
      description: signalType === "fast" 
        ? "Fast signal based on momentum and short-term price action" 
        : "Classic signal based on multiple indicator confluence",
    };
    
    return newSignal;
  } catch (error) {
    console.error("Error generating trading signal:", error);
    return null;
  }
};

export const generateAllSignals = async (signalType: string = "classic"): Promise<TradingSignal[]> => {
  try {
    // Here you would make an API call to your backend
    // For now we'll generate mock data
    console.log(`Generating all ${signalType} signals...`);
    
    const numberOfSignals = 3 + Math.floor(Math.random() * 3);
    const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT", "ADAUSDT", "DOTUSDT"];
    const signals: TradingSignal[] = [];
    
    for (let i = 0; i < numberOfSignals; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const signal = await generateTradingSignal(symbol, signalType);
      if (signal) {
        signals.push(signal);
      }
    }
    
    return signals;
  } catch (error) {
    console.error("Error generating all signals:", error);
    return [];
  }
};
