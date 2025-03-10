
import { useToast } from "@/hooks/use-toast";
import { CryptoNews, TradingSignal } from "./types";

// API URLs and keys
const BYBIT_API_URL = "https://api.bybit.com/v5/market/kline";
const COINGECKO_GLOBAL_URL = "https://api.coingecko.com/api/v3/global";
const COINGECKO_API_KEY = "CG-r1Go4M9HPMrsNaH6tASKaWLr";
const TELEGRAM_BOT_TOKEN = "7807375635:AAGWvj86Ok_9oYdwdB-VtSb1QQ3ZjXBSz04";
const TELEGRAM_CHAT_ID = "981122089";
const CRYPTO_APIS_KEY = "34b71000c7b0a5e31fb4b7bb5aca0b87bab6d05f";
const COIN_DESK_API_URL = "https://api.coindesk.com/v1/bpi/currentprice.json";
const CRYPTONEWS_API_KEY = "yq8qjvqe7rknrfsswlzjiwmlzuurgk3p4thsqgfs";
const CRYPTONEWS_API_URL = "https://cryptonews-api.com/api/v1";

// Symbols to monitor - expanded list
const SYMBOLS = ["PNUTUSDT", "BTCUSDT", "ETHUSDT", "AUCTIONUSDT", "XRPUSDT", "AVAXUSDT", "ADAUSDT", "UNIUSDT", "SOLUSDT"];

// Helper function to handle API errors
const handleApiError = (error: any, endpoint: string) => {
  console.error(`Error fetching data from ${endpoint}:`, error);
  return null;
};

// Fetch kline data from Bybit
export const fetchBybitKlines = async (
  symbol: string,
  interval: string = "5", // 5 min interval
  limit: number = 50
) => {
  try {
    const params = new URLSearchParams({
      category: "linear",
      symbol: symbol.toUpperCase(),
      interval: interval,
      limit: limit.toString()
    });
    
    const response = await fetch(`${BYBIT_API_URL}?${params}`, {
      headers: {
        "Accept": "application/json"
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.retCode === 0 && data.result?.list) {
      return data.result.list;
    } else {
      console.error(`Error in Bybit API response for ${symbol}: ${data.retMsg}`);
      return null;
    }
  } catch (error) {
    return handleApiError(error, `Bybit Klines for ${symbol}`);
  }
};

// Fetch global market data from CoinGecko
export const fetchCoinGeckoGlobal = async () => {
  try {
    const response = await fetch(COINGECKO_GLOBAL_URL, {
      headers: {
        "x-cg-api-key": COINGECKO_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return handleApiError(error, "CoinGecko Global");
  }
};

// Fetch coin data from CoinGecko
export const fetchCoinData = async (coinId: string) => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
      {
        headers: {
          "x-cg-api-key": COINGECKO_API_KEY
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return handleApiError(error, `CoinGecko ${coinId}`);
  }
};

// Fetch crypto news from real APIs
export const fetchCryptoNews = async (): Promise<CryptoNews[]> => {
  try {
    // Try CryptoNews API first
    try {
      const response = await fetch(
        `${CRYPTONEWS_API_URL}/category?section=general&items=10&page=1&token=${CRYPTONEWS_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.news && data.news.length > 0) {
          return data.news.map((item: any) => ({
            title: item.title,
            description: item.text || item.description,
            url: item.news_url,
            publishedAt: item.date,
            source: { name: item.source_name },
            urlToImage: item.image_url
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching from CryptoNews API:", error);
    }
    
    // Try CoinDesk API as fallback
    try {
      const response = await fetch("https://api.coindesk.com/v2/news/alerts/latest");
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.items && data.data.items.length > 0) {
          return data.data.items.map((item: any) => ({
            title: item.headline,
            description: item.summary || item.snippet,
            url: item.url,
            publishedAt: item.published_at,
            source: { name: 'CoinDesk' },
            urlToImage: item.cover_image_url
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching from CoinDesk API:", error);
    }
    
    // If all else fails, use mock data
    return getMockCryptoNews();
  } catch (error) {
    console.error("Error fetching crypto news:", error);
    return getMockCryptoNews();
  }
};

// Get mock crypto news (fallback when API fails)
export const getMockCryptoNews = () => {
  return [
    {
      title: "Bitcoin Reaches New All-Time High as Institutional Adoption Increases",
      description: "Bitcoin has reached a new all-time high as institutional investors continue to pour money into the cryptocurrency market.",
      url: "https://example.com/news/1",
      publishedAt: new Date().toISOString(),
      source: { name: "Crypto News" },
      urlToImage: "https://example.com/image1.jpg"
    },
    {
      title: "Ethereum 2.0 Upgrade Shows Promise With Improved Transaction Speeds",
      description: "The latest Ethereum upgrade has shown significant improvements in transaction speeds and reduced gas fees.",
      url: "https://example.com/news/2",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      source: { name: "Blockchain Times" },
      urlToImage: "https://example.com/image2.jpg"
    },
    {
      title: "Regulatory Clarity Needed for Cryptocurrency Market Growth, Says Expert",
      description: "Experts suggest that clear regulations are essential for the sustained growth of the cryptocurrency market.",
      url: "https://example.com/news/3",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      source: { name: "Financial Post" },
      urlToImage: "https://example.com/image3.jpg"
    }
  ];
};

// Send message via Telegram bot
export const sendTelegramMessage = async (message: string) => {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return handleApiError(error, "Telegram API");
  }
};

// Get trend from candle data
export const getTrendFromCandle = (candle: any[]): "BULLISH" | "BEARISH" | "NEUTRAL" => {
  if (!candle || candle.length < 5) return "NEUTRAL";
  
  const openPrice = parseFloat(candle[1]);
  const closePrice = parseFloat(candle[4]);
  
  if (closePrice > openPrice) return "BULLISH";
  if (closePrice < openPrice) return "BEARISH";
  return "NEUTRAL";
};

// Format price with proper decimals
export const formatPrice = (price: number): string => {
  if (price < 0.001) return price.toFixed(8);
  if (price < 1) return price.toFixed(6);
  if (price < 100) return price.toFixed(4);
  if (price < 10000) return price.toFixed(2);
  return price.toFixed(0);
};

// Format percentage with color indicator
export const formatPercentage = (percentage: number): { value: string, color: string } => {
  const formattedValue = percentage.toFixed(2) + "%";
  
  if (percentage > 0) return { value: "+" + formattedValue, color: "text-crypto-green" };
  if (percentage < 0) return { value: formattedValue, color: "text-crypto-red" };
  return { value: formattedValue, color: "text-gray-500" };
};

// Calculate trading indicators
export const calculateIndicators = (data: any[]) => {
  if (!data || data.length < 15) {
    console.error("Insufficient data for technical analysis");
    return { shortMa: null, longMa: null, rsi: null, macd: null };
  }
  
  const closingPrices = data.map(candle => parseFloat(candle[4]));
  const highPrices = data.map(candle => parseFloat(candle[2]));
  const lowPrices = data.map(candle => parseFloat(candle[3]));
  
  // Calculate moving averages
  const shortMa = closingPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const longMa = closingPrices.slice(-15).reduce((a, b) => a + b, 0) / 15;
  
  // Simple RSI calculation
  const rsi = 100 - (100 / (1 + 
    (closingPrices.slice(-5).reduce((a, b) => a + b, 0) / 5) / 
    (closingPrices.slice(-15).reduce((a, b) => a + b, 0) / 15)
  ));
  
  // Simple MACD
  const macd = shortMa - longMa;
  
  return { shortMa, longMa, rsi, macd };
};

// Generate trading signal
export const generateTradingSignal = async (symbol: string): Promise<TradingSignal | null> => {
  try {
    const marketData = await fetchBybitKlines(symbol);
    if (!marketData) return null;
    
    const { shortMa, longMa, rsi, macd } = calculateIndicators(marketData);
    if (shortMa === null || longMa === null) return null;
    
    const entryPrice = parseFloat(marketData[marketData.length - 1][4]);
    const highestHigh = Math.max(...marketData.map(c => parseFloat(c[2])));
    const lowestLow = Math.min(...marketData.map(c => parseFloat(c[3])));
    const volatility = (highestHigh - lowestLow) / lowestLow;
    const leverage = Math.min(10, Math.max(2, Math.floor(volatility * 50)));
    
    let signal: TradingSignal | null = null;
    
    if (shortMa > longMa && rsi < 70 && macd > 0) {
      // Long signal
      signal = {
        id: `${symbol}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        symbol: symbol,
        pair: `${symbol.replace('USDT', '')}/USDT`,
        direction: "BUY",
        entryPrice: entryPrice,
        stopLoss: entryPrice * 0.98,
        takeProfit: [
          entryPrice * 1.02,
          entryPrice * 1.03,
          entryPrice * 1.05
        ],
        status: "ACTIVE",
        timeframe: "5m",
        reason: `MA Cross (Short: ${shortMa.toFixed(2)} > Long: ${longMa.toFixed(2)}) with RSI: ${rsi.toFixed(2)} and MACD: ${macd.toFixed(4)}`,
        leverage: leverage,
        type: "LONG"
      };
    } else if (shortMa < longMa && rsi > 30 && macd < 0) {
      // Short signal
      signal = {
        id: `${symbol}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        symbol: symbol,
        pair: `${symbol.replace('USDT', '')}/USDT`,
        direction: "SELL",
        entryPrice: entryPrice,
        stopLoss: entryPrice * 1.02,
        takeProfit: [
          entryPrice * 0.98,
          entryPrice * 0.97,
          entryPrice * 0.95
        ],
        status: "ACTIVE",
        timeframe: "5m",
        reason: `MA Cross (Short: ${shortMa.toFixed(2)} < Long: ${longMa.toFixed(2)}) with RSI: ${rsi.toFixed(2)} and MACD: ${macd.toFixed(4)}`,
        leverage: leverage,
        type: "SHORT"
      };
    }
    
    if (signal) {
      // Send signal to Telegram
      const signalMessage = 
        `Sinal de Trade ⚡\n\n` +
        `${signal.direction === "BUY" ? "Long" : "Short"} ${signal.symbol}\n` +
        `Entrada: ${signal.entryPrice.toFixed(4)}\n` +
        `SL: ${signal.stopLoss.toFixed(4)}\n` +
        `TP1: ${signal.takeProfit[0].toFixed(4)}\n` +
        `TP2: ${signal.takeProfit[1].toFixed(4)}\n` +
        `TP3: ${signal.takeProfit[2].toFixed(4)}\n` +
        `Alavancagem: ${signal.leverage}x\n`;
        
      await sendTelegramMessage(signalMessage);
    }
    
    return signal;
  } catch (error) {
    console.error(`Error generating trading signal for ${symbol}:`, error);
    return null;
  }
};

// Generate signals for all monitored symbols
export const generateAllSignals = async (): Promise<TradingSignal[]> => {
  const signals: TradingSignal[] = [];
  
  for (const symbol of SYMBOLS) {
    const signal = await generateTradingSignal(symbol);
    if (signal) {
      signals.push(signal);
    }
  }
  
  return signals;
};
