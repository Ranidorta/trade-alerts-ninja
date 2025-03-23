
import axios from "axios";
import { TradingSignal, CryptoNews } from "@/lib/types";

const API_BASE_URL = "http://localhost:5000/api";
const COINGECKO_API_KEY = "CG-r1Go4M9HPMrsNaH6tASKaWLr"; // Add API key

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

// Adding missing functions that are imported by components

// Function for formatting percentages for display
export const formatPercentage = (value: number): { value: string; color: string } => {
  const formattedValue = `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  const color = value > 0 
    ? "text-green-500" 
    : value < 0 
      ? "text-red-500" 
      : "text-gray-500";
  
  return { value: formattedValue, color };
};

// Function to fetch crypto news
export const fetchCryptoNews = async (): Promise<CryptoNews[]> => {
  try {
    // In a real app, you would fetch from a news API
    // For now, we'll return mock data
    return [
      {
        title: "Bitcoin Reaches New All-Time High",
        description: "Bitcoin has broken past its previous all-time high as institutional adoption continues to grow.",
        url: "https://example.com/news/1",
        publishedAt: new Date().toISOString(),
        source: { name: "CryptoNews" },
        urlToImage: "https://via.placeholder.com/300x200?text=Bitcoin"
      },
      {
        title: "Ethereum 2.0 Launch Date Confirmed",
        description: "The Ethereum Foundation has confirmed the launch date for the much-anticipated Ethereum 2.0 upgrade.",
        url: "https://example.com/news/2",
        publishedAt: new Date().toISOString(),
        source: { name: "Decrypt" },
        urlToImage: "https://via.placeholder.com/300x200?text=Ethereum"
      },
      {
        title: "Solana Ecosystem Grows Rapidly",
        description: "The Solana ecosystem has seen rapid growth with new DeFi projects launching on the platform.",
        url: "https://example.com/news/3",
        publishedAt: new Date().toISOString(),
        source: { name: "CoinDesk" },
        urlToImage: "https://via.placeholder.com/300x200?text=Solana"
      },
      {
        title: "Regulators Consider New Crypto Framework",
        description: "Financial regulators are considering a new framework for cryptocurrency assets to provide more clarity.",
        url: "https://example.com/news/4",
        publishedAt: new Date().toISOString(),
        source: { name: "Bloomberg" },
        urlToImage: "https://via.placeholder.com/300x200?text=Regulation"
      },
      {
        title: "NFT Market Shows Signs of Recovery",
        description: "After months of declining sales, the NFT market is showing signs of recovery with increased trading volume.",
        url: "https://example.com/news/5",
        publishedAt: new Date().toISOString(),
        source: { name: "The Block" },
        urlToImage: "https://via.placeholder.com/300x200?text=NFT"
      }
    ];
  } catch (error) {
    console.error("Error fetching crypto news:", error);
    return [];
  }
};

// Function to fetch Bybit klines (candlestick data)
export const fetchBybitKlines = async (symbol: string, interval: string = "1h", limit: number = 100): Promise<any[]> => {
  try {
    // In a real app, you would fetch from Bybit API
    // For now, we'll return mock data
    const mockData = [];
    const now = Date.now();
    let price = 100 + Math.random() * 10000;
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - (i * 3600 * 1000); // 1 hour intervals
      const open = price;
      const close = open * (1 + (Math.random() * 0.06 - 0.03)); // -3% to +3%
      const high = Math.max(open, close) * (1 + Math.random() * 0.02); // up to 2% higher
      const low = Math.min(open, close) * (1 - Math.random() * 0.02); // up to 2% lower
      const volume = Math.random() * 1000;
      
      mockData.push([
        timestamp.toString(),
        open.toString(),
        high.toString(),
        low.toString(),
        close.toString(),
        volume.toString()
      ]);
      
      price = close; // Next candle starts at previous close
    }
    
    return mockData;
  } catch (error) {
    console.error("Error fetching Bybit klines:", error);
    return [];
  }
};

// Function to fetch global market data from CoinGecko
export const fetchCoinGeckoGlobal = async (): Promise<any> => {
  try {
    // In a real app, you would fetch from CoinGecko API
    // For now, we'll return mock data
    return {
      data: {
        active_cryptocurrencies: 10000,
        total_market_cap: {
          usd: 2500000000000
        },
        total_volume: {
          usd: 150000000000
        },
        market_cap_percentage: {
          btc: 48.5,
          eth: 18.3
        },
        market_cap_change_percentage_24h_usd: 2.5
      }
    };
  } catch (error) {
    console.error("Error fetching CoinGecko global data:", error);
    return null;
  }
};

// Function to calculate technical indicators from price data
export const calculateIndicators = (klineData: any[]): any => {
  try {
    // In a real app, you would calculate actual indicators
    // For now, we'll return mock indicator data
    return {
      rsi: 45 + Math.random() * 10,
      macd: 0.5 + Math.random() * 0.5,
      macdSignal: 0.3 + Math.random() * 0.5,
      macdHistogram: 0.2 + Math.random() * 0.5,
      shortMa: 105 + Math.random() * 5,
      longMa: 100 + Math.random() * 5,
      upperBand: 110 + Math.random() * 5,
      lowerBand: 95 + Math.random() * 5,
      atr: 5 + Math.random() * 2,
      volatility: 0.05 + Math.random() * 0.05,
      signal: Math.random() > 0.5 ? 1 : -1,
      confidence: 0.7 + Math.random() * 0.3
    };
  } catch (error) {
    console.error("Error calculating indicators:", error);
    return {};
  }
};
