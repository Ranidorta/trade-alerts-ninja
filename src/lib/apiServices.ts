
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

export async function fetchSignalHistory(): Promise<TradingSignalRecord[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/signals`);
    return response.data;
  } catch (error) {
    console.error("Error fetching signal history:", error);
    return [];
  }
}

export async function fetchPerformanceData(): Promise<PerformanceData> {
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
}

export async function uploadMarketData(file: File, symbol: string = "BTCUSDT", strategy: string = "basic"): Promise<any> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("symbol", symbol);
    formData.append("strategy", strategy);
    
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
}

export async function generateTradingSignal(symbol: string, signalType: string = "classic"): Promise<TradingSignal | null> {
  try {
    console.log(`Requesting ${signalType} signal for ${symbol} from Python backend...`);
    
    // In a real integration, we would call the Python backend here
    // Since the current Python backend doesn't have a direct endpoint for single signal generation,
    // we'll still generate mock data for now, but this would be replaced with a real API call
    
    const id = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
    
    // Get real-time kline data to inform our signal
    const klineData = await fetchBybitKlines(symbol, "1h", 30);
    
    if (!klineData || klineData.length === 0) {
      throw new Error("No market data available");
    }
    
    // Calculate indicators (in a real app, this would be done by the Python backend)
    const indicators = await calculateIndicators(klineData);
    
    // Determine signal type based on indicators
    const signalDirection = indicators.signal > 0 ? "LONG" : "SHORT";
    
    // Get the latest price from kline data
    const latestPrice = parseFloat(klineData[0][4]); // close price of most recent candle
    
    const newSignal: TradingSignal = {
      id,
      symbol: symbol.replace("USDT", ""),
      pair: symbol,
      type: signalDirection,
      entryMin: latestPrice * 0.99,
      entryMax: latestPrice * 1.01,
      entryAvg: latestPrice,
      stopLoss: signalDirection === "LONG" ? latestPrice * (1 - indicators.atr / latestPrice) : latestPrice * (1 + indicators.atr / latestPrice),
      targets: [
        { level: 1, price: signalDirection === "LONG" ? latestPrice * (1 + 1.5 * indicators.atr / latestPrice) : latestPrice * (1 - 1.5 * indicators.atr / latestPrice), hit: false },
        { level: 2, price: signalDirection === "LONG" ? latestPrice * (1 + 2.5 * indicators.atr / latestPrice) : latestPrice * (1 - 2.5 * indicators.atr / latestPrice), hit: false },
        { level: 3, price: signalDirection === "LONG" ? latestPrice * (1 + 4 * indicators.atr / latestPrice) : latestPrice * (1 - 4 * indicators.atr / latestPrice), hit: false }
      ],
      leverage: Math.ceil(Math.random() * 10),
      status: "WAITING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentPrice: latestPrice,
      technicalIndicators: indicators,
      description: signalType === "fast" 
        ? "Fast signal based on momentum and short-term price action" 
        : "Classic signal based on multiple indicator confluence",
    };
    
    return newSignal;
  } catch (error) {
    console.error("Error generating trading signal:", error);
    return null;
  }
}

export async function generateAllSignals(signalType: string = "classic"): Promise<TradingSignal[]> {
  try {
    console.log(`Requesting all ${signalType} signals from Python backend...`);
    
    // In a real integration, we would call a specific endpoint for this
    // For now, we'll generate signals for a predefined list of symbols
    
    const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT", "ADAUSDT", "DOTUSDT"];
    const signals: TradingSignal[] = [];
    
    // Get real-time global market data to inform signal generation
    const globalData = await fetchCoinGeckoGlobal();
    const marketTrend = globalData?.data?.market_cap_change_percentage_24h_usd > 0 ? "bullish" : "bearish";
    
    console.log(`Market trend is ${marketTrend}. Generating ${signalType} signals...`);
    
    // Generate 3-5 signals based on market trend and coin performance
    const numberOfSignals = 3 + Math.floor(Math.random() * 3);
    const selectedSymbols = symbols.slice(0, numberOfSignals);
    
    for (const symbol of selectedSymbols) {
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
}

export async function getAvailableStrategies(): Promise<string[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/strategies`);
    return response.data;
  } catch (error) {
    console.error("Error fetching available strategies:", error);
    return ["basic", "advanced"];
  }
}

export function formatPercentage(value: number): { value: string; color: string } {
  const formattedValue = `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  const color = value > 0 
    ? "text-green-500" 
    : value < 0 
      ? "text-red-500" 
      : "text-gray-500";
  
  return { value: formattedValue, color };
}

export async function fetchCryptoNews(): Promise<CryptoNews[]> {
  try {
    // In a real integration, we would fetch news from an API
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
}

export async function fetchBybitKlines(symbol: string, interval: string = "1h", limit: number = 100): Promise<any[]> {
  try {
    // In a real integration, we would fetch from Bybit API
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
}

export async function fetchCoinGeckoGlobal(): Promise<any> {
  try {
    // In a real integration, we would fetch from CoinGecko API
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
}

export async function calculateIndicators(klineData: any[]): Promise<any> {
  try {
    // In a real app, we would calculate actual indicators or call the Python backend
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
}
