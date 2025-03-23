import { TradingSignal } from "./types";
import { v4 as uuidv4 } from 'uuid';

// Mock function to simulate generating a trading signal
export const generateTradingSignalMock = (symbol: string): TradingSignal => {
  const signalType = Math.random() > 0.5 ? "LONG" : "SHORT";
  const direction = signalType === "LONG" ? "BUY" : "SELL";
  const entryPrice = Math.random() * 50 + 100;
  const stopLoss = entryPrice * (signalType === "LONG" ? 0.95 : 1.05);
  const takeProfit = [
    entryPrice * (signalType === "LONG" ? 1.1 : 0.9),
    entryPrice * (signalType === "LONG" ? 1.15 : 0.85),
  ];

  return {
    id: uuidv4(),
    symbol: symbol,
    pair: "USDT",
    direction: direction,
    entryPrice: entryPrice,
    stopLoss: stopLoss,
    takeProfit: takeProfit,
    leverage: 10,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentPrice: entryPrice + (Math.random() - 0.5) * 10,
    type: signalType,
    technicalIndicators: {
      rsi: Math.random() * 100,
      macd: Math.random() * 2 - 1,
    },
  };
};

// Mock function to generate multiple trading signals
export const generateMockSignals = (): TradingSignal[] => {
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  return symbols.map((symbol) => generateTradingSignalMock(symbol));
};

// Check if our backend is available
const checkBackendStatus = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    if (response.ok) {
      return true;
    }
    return false;
  } catch (error) {
    console.warn("Trading alerts backend is not available:", error);
    return false;
  }
};

// Generate a single signal for specific symbol
export const generateTradingSignal = async (symbol: string) => {
  try {
    // First check if our upgraded backend is available
    const backendAvailable = await checkBackendStatus();
    
    if (backendAvailable) {
      console.log("Using upgraded trading alerts backend");
      // Use our upgraded backend
      const response = await fetch(`http://localhost:5000/api/signals/${symbol}`);
      if (response.ok) {
        return await response.json();
      }
    }
    
    // If backend not available or request failed, fall back to mock data
    console.log("Using mock signal data for", symbol);
    return generateTradingSignalMock(symbol);
  } catch (error) {
    console.error("Error generating signal:", error);
    return null;
  }
};

// Generate all trading signals
export const generateAllSignals = async () => {
  try {
    // First check if our upgraded backend is available
    const backendAvailable = await checkBackendStatus();
    
    if (backendAvailable) {
      console.log("Using upgraded trading alerts backend");
      // Use our upgraded backend
      const response = await fetch('http://localhost:5000/api/signals');
      if (response.ok) {
        return await response.json();
      }
    }
    
    // If backend not available or request failed, fall back to mock data
    console.log("Using mock signals data");
    return generateMockSignals();
  } catch (error) {
    console.error("Error generating signals:", error);
    return [];
  }
};

// Fetch market data
export const fetchMarketData = async (symbol: string, timeframe = '1h', limit = 100) => {
  try {
    // First check if our upgraded backend is available
    const backendAvailable = await checkBackendStatus();
    
    if (backendAvailable) {
      console.log("Using upgraded backend for market data");
      // Use our upgraded backend
      const response = await fetch(`http://localhost:5000/api/market-data/${symbol}?timeframe=${timeframe}&limit=${limit}`);
      if (response.ok) {
        return await response.json();
      }
    }
    
    // If backend not available or request failed, fall back to existing methods
    console.log("Using fallback for market data");
    // Mock data for chart
    const mockChartData = Array.from({ length: 100 }, (_, i) => ({
      time: new Date().getTime() - i * 3600000,
      price: Math.random() * 100 + 100,
    }));
    return mockChartData;
  } catch (error) {
    console.error("Error fetching market data:", error);
    return [];
  }
};
