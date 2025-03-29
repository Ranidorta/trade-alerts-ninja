
import { CryptoCoin, CryptoNews, MarketOverview, TradingSignal } from "@/lib/types";
import { mockCryptoCoins, mockCryptoNews, mockMarketOverview, formatPercentage } from "@/lib/mockData";

export async function fetchCryptoNews(): Promise<CryptoNews[]> {
  try {
    return mockCryptoNews;
  } catch (error) {
    console.error("Error fetching crypto news:", error);
    return [];
  }
}

export async function fetchTopCryptos(): Promise<CryptoCoin[]> {
  try {
    return mockCryptoCoins;
  } catch (error) {
    console.error("Error fetching top cryptocurrencies:", error);
    return [];
  }
}

export async function fetchMarketOverview(): Promise<MarketOverview> {
  try {
    return mockMarketOverview;
  } catch (error) {
    console.error("Error fetching market overview:", error);
    throw error;
  }
}

// Function to fetch kline/candlestick data from Bybit
export async function fetchBybitKlines(symbol: string, interval: string = "1h", limit: number = 100): Promise<any[]> {
  try {
    console.log(`Fetching klines for ${symbol}`);
    
    // For now, use mock data to generate candlestick data
    const basePrice = symbol.includes("BTC") ? 62000 : 
                     symbol.includes("ETH") ? 3200 : 
                     symbol.includes("SOL") ? 140 : 
                     symbol.includes("BNB") ? 560 : 100;
    
    const klines = [];
    const now = Date.now();
    
    for (let i = limit - 1; i >= 0; i--) {
      const time = now - (i * 3600 * 1000); // 1 hour intervals
      const randomFactor = 0.01 * (Math.random() - 0.5); // -0.5% to +0.5%
      
      const open = basePrice * (1 + randomFactor);
      const close = open * (1 + (Math.random() - 0.5) * 0.02); // -1% to +1% from open
      const high = Math.max(open, close) * (1 + Math.random() * 0.01); // 0% to 1% above max(open, close)
      const low = Math.min(open, close) * (1 - Math.random() * 0.01); // 0% to 1% below min(open, close)
      const volume = basePrice * 100 * (Math.random() + 0.5); // Random volume
      
      klines.push([
        time.toString(), // timestamp
        open.toFixed(2), // open
        high.toFixed(2), // high
        low.toFixed(2),  // low
        close.toFixed(2), // close
        volume.toFixed(2) // volume
      ]);
    }
    
    return klines;
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error);
    return [];
  }
}

// Function to fetch global market data from CoinGecko
export async function fetchCoinGeckoGlobal(): Promise<any> {
  try {
    // Use mock data for now
    return {
      data: {
        active_cryptocurrencies: mockMarketOverview.activeCryptocurrencies,
        total_market_cap: {
          usd: mockMarketOverview.totalMarketCap
        },
        total_volume: {
          usd: mockMarketOverview.totalVolume24h
        },
        market_cap_percentage: mockMarketOverview.marketCapPercentage,
        market_cap_change_percentage_24h_usd: mockMarketOverview.marketCapChangePercentage24hUsd
      }
    };
  } catch (error) {
    console.error("Error fetching CoinGecko global data:", error);
    return null;
  }
}

// Function to calculate technical indicators from candle data
export function calculateIndicators(klineData: any[]): any {
  try {
    // Convert klines to format needed for indicator calculation
    const candles = klineData.map(k => ({
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
    
    // Calculate simple moving averages
    const calculateSMA = (data: any[], period: number) => {
      const result = [];
      for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const sum = slice.reduce((total, candle) => total + candle.close, 0);
        result.push({
          timestamp: data[i].timestamp,
          value: sum / period
        });
      }
      return result;
    };
    
    // Simple market sentiment based on price action
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const sentiment = lastCandle.close > prevCandle.close ? "BULLISH" : "BEARISH";
    
    // Calculate indicators
    return {
      sma20: calculateSMA(candles, 20),
      sma50: calculateSMA(candles, 50),
      sentiment: sentiment,
      lastPrice: lastCandle.close,
      priceChange: ((lastCandle.close - prevCandle.close) / prevCandle.close * 100).toFixed(2)
    };
  } catch (error) {
    console.error("Error calculating indicators:", error);
    return null;
  }
}

// Export necessary functions from signalsApi.ts
export { 
  fetchSignals, 
  fetchPerformanceMetrics, 
  fetchSymbols, 
  fetchStrategies, 
  fetchRawData, 
  fetchAvailableSymbols,
  fetchUserProfile,
  setAuthToken,
  clearAuthToken
} from './signalsApi';
