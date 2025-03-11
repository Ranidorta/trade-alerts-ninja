import { useToast } from "@/hooks/use-toast";
import { CryptoNews, TradingSignal, SignalStatus, CryptoCoin, PriceTarget } from "./types";

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

// List of symbols that we'll always try to generate signals for
const ALWAYS_SIGNAL_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

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

// Calculate RSI using the improved algorithm
const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length <= period) {
    return 50; // Default value if not enough data
  }
  
  const deltas = prices.slice(1).map((price, i) => price - prices[i]);
  const seed = deltas.slice(0, period);
  
  const up = seed.filter(d => d >= 0).reduce((sum, d) => sum + d, 0) / period;
  const down = Math.abs(seed.filter(d => d < 0).reduce((sum, d) => sum + d, 0)) / period;
  
  if (down === 0) {
    return 100; // Prevent division by zero
  }
  
  const rs = up / down;
  return 100 - (100 / (1 + rs));
};

// Calculate trading indicators (improved version)
export const calculateIndicators = (data: any[]) => {
  if (!data || data.length < 26) {
    console.error("Insufficient data for technical analysis");
    return { shortMa: null, longMa: null, rsi: null, macd: null, upperBand: null, lowerBand: null };
  }
  
  const closingPrices = data.map(candle => parseFloat(candle[4]));
  const highPrices = data.map(candle => parseFloat(candle[2]));
  const lowPrices = data.map(candle => parseFloat(candle[3]));
  
  // Calculate moving averages
  const shortMa = closingPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const longMa = closingPrices.slice(-15).reduce((a, b) => a + b, 0) / 15;
  
  // Calculate RSI using the improved algorithm
  const rsi = calculateRSI(closingPrices);
  
  // Simple MACD
  const macd = shortMa - longMa;
  
  // Calculate Bollinger Bands
  const ma20 = closingPrices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const stdDev = Math.sqrt(
    closingPrices.slice(-20).reduce((sum, price) => sum + Math.pow(price - ma20, 2), 0) / 20
  );
  const upperBand = ma20 + (2 * stdDev);
  const lowerBand = ma20 - (2 * stdDev);
  
  return { 
    shortMa, 
    longMa, 
    rsi, 
    macd, 
    currentPrice: closingPrices[closingPrices.length - 1],
    highPrices,
    lowPrices,
    upperBand,
    lowerBand
  };
};

// Check if targets have been hit based on candle data
export const checkTargetsHit = (targets: PriceTarget[], candles: any[], type: "LONG" | "SHORT"): PriceTarget[] => {
  if (!candles || candles.length === 0 || !targets || targets.length === 0) {
    return targets;
  }
  
  // Clone the targets to avoid mutating the original
  const updatedTargets = [...targets];
  
  // Get high/low prices from candles
  const highPrices = candles.map(candle => parseFloat(candle[2]));
  const lowPrices = candles.map(candle => parseFloat(candle[3]));
  
  // For LONG positions, check if the high price reached the target
  // For SHORT positions, check if the low price reached the target
  updatedTargets.forEach((target, index) => {
    if (type === "LONG") {
      // For long positions, check if price went above target
      target.hit = highPrices.some(price => price >= target.price);
    } else {
      // For short positions, check if price went below target
      target.hit = lowPrices.some(price => price <= target.price);
    }
  });
  
  return updatedTargets;
};

// Generate trading signal (improved version)
export const generateTradingSignal = async (symbol: string): Promise<TradingSignal | null> => {
  try {
    const marketData = await fetchBybitKlines(symbol);
    if (!marketData) return null;
    
    const indicators = calculateIndicators(marketData);
    if (!indicators.shortMa || !indicators.longMa) return null;
    
    const { 
      shortMa, 
      longMa, 
      rsi, 
      macd, 
      currentPrice, 
      highPrices, 
      lowPrices, 
      upperBand, 
      lowerBand 
    } = indicators;
    
    const volatility = (Math.max(...highPrices) - Math.min(...lowPrices)) / Math.min(...lowPrices);
    const leverage = Math.min(10, Math.max(2, Math.floor(volatility * 50)));
    
    let signal: TradingSignal | null = null;
    
    // Enhanced signal generation logic similar to the Python code
    if (shortMa > longMa && macd > 0 && rsi < 70 && currentPrice > lowerBand) {
      // Long signal
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 0.98;
      const targets = [
        { level: 1, price: entryPrice * 1.01, hit: false },
        { level: 2, price: entryPrice * 1.02, hit: false },
        { level: 3, price: entryPrice * 1.03, hit: false }
      ];
      
      signal = {
        id: `${symbol}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        symbol: symbol,
        pair: `${symbol.replace('USDT', '')}/USDT`,
        direction: "BUY",
        entryPrice: entryPrice,
        entryMin: entryPrice * 0.995,
        entryMax: entryPrice * 1.005,
        entryAvg: entryPrice,
        stopLoss: stopLoss,
        targets: targets,
        status: "ACTIVE",
        timeframe: "5m",
        reason: `MA Cross (${shortMa.toFixed(2)} > ${longMa.toFixed(2)}) with RSI: ${rsi.toFixed(2)} and MACD: ${macd.toFixed(4)}`,
        leverage: leverage,
        type: "LONG",
        currentPrice: currentPrice
      };
    } else if (shortMa < longMa && macd < 0 && rsi > 30 && currentPrice < upperBand) {
      // Short signal
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 1.02;
      const targets = [
        { level: 1, price: entryPrice * 0.99, hit: false },
        { level: 2, price: entryPrice * 0.98, hit: false },
        { level: 3, price: entryPrice * 0.97, hit: false }
      ];
      
      signal = {
        id: `${symbol}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        symbol: symbol,
        pair: `${symbol.replace('USDT', '')}/USDT`,
        direction: "SELL",
        entryPrice: entryPrice,
        entryMin: entryPrice * 0.995,
        entryMax: entryPrice * 1.005,
        entryAvg: entryPrice,
        stopLoss: stopLoss,
        targets: targets,
        status: "ACTIVE",
        timeframe: "5m",
        reason: `MA Cross (${shortMa.toFixed(2)} < ${longMa.toFixed(2)}) with RSI: ${rsi.toFixed(2)} and MACD: ${macd.toFixed(4)}`,
        leverage: leverage,
        type: "SHORT",
        currentPrice: currentPrice
      };
    } else if (ALWAYS_SIGNAL_SYMBOLS.includes(symbol)) {
      // Always generate a potential signal for selected symbols, even if conditions aren't strong
      const entryPrice = currentPrice;
      const isBullish = rsi > 50 || shortMa > longMa; // Simple determination of trend
      
      if (isBullish) {
        const stopLoss = entryPrice * 0.99;
        const targets = [
          { level: 1, price: entryPrice * 1.005, hit: false },
          { level: 2, price: entryPrice * 1.01, hit: false },
          { level: 3, price: entryPrice * 1.015, hit: false }
        ];
        
        signal = {
          id: `${symbol}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          symbol: symbol,
          pair: `${symbol.replace('USDT', '')}/USDT`,
          direction: "BUY",
          entryPrice: entryPrice,
          entryMin: entryPrice * 0.995,
          entryMax: entryPrice * 1.005,
          entryAvg: entryPrice,
          stopLoss: stopLoss,
          targets: targets,
          status: "WAITING", // Mark as "WAITING" since conditions aren't strong
          timeframe: "5m",
          reason: `Possível entrada (RSI: ${rsi.toFixed(2)}, MACD: ${macd.toFixed(4)})`,
          leverage: Math.min(leverage, 5), // Lower leverage for less confident signals
          type: "LONG",
          currentPrice: currentPrice
        };
      } else {
        const stopLoss = entryPrice * 1.01;
        const targets = [
          { level: 1, price: entryPrice * 0.995, hit: false },
          { level: 2, price: entryPrice * 0.99, hit: false },
          { level: 3, price: entryPrice * 0.985, hit: false }
        ];
        
        signal = {
          id: `${symbol}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          symbol: symbol,
          pair: `${symbol.replace('USDT', '')}/USDT`,
          direction: "SELL",
          entryPrice: entryPrice,
          entryMin: entryPrice * 0.995,
          entryMax: entryPrice * 1.005,
          entryAvg: entryPrice,
          stopLoss: stopLoss,
          targets: targets,
          status: "WAITING", // Mark as "WAITING" since conditions aren't strong
          timeframe: "5m",
          reason: `Possível entrada (RSI: ${rsi.toFixed(2)}, MACD: ${macd.toFixed(4)})`,
          leverage: Math.min(leverage, 5), // Lower leverage for less confident signals
          type: "SHORT",
          currentPrice: currentPrice
        };
      }
    }
    
    if (signal) {
      // Send signal to Telegram
      const signalMessage = 
        `Sinal de Trade ⚡\n\n` +
        `${signal.type} ${signal.symbol}\n` +
        `Entrada: ${signal.entryMin.toFixed(4)} - ${signal.entryMax.toFixed(4)}\n` +
        `SL: ${signal.stopLoss.toFixed(4)}\n` +
        `TP1: ${signal.targets[0].price.toFixed(4)}\n` +
        `TP2: ${signal.targets[1].price.toFixed(4)}\n` +
        `TP3: ${signal.targets[2].price.toFixed(4)}\n` +
        `Alavancagem: ${signal.leverage}x\n` +
        `Status: ${signal.status}\n`;
        
      await sendTelegramMessage(signalMessage);
    }
    
    return signal;
  } catch (error) {
    console.error(`Error generating trading signal for ${symbol}:`, error);
    return null;
  }
};

// Update signals with current prices and check for hit targets
export const updateSignalStatus = async (signal: TradingSignal): Promise<TradingSignal> => {
  try {
    // Clone the signal to avoid mutation
    const updatedSignal = { ...signal };
    
    // Fetch the latest market data
    const marketData = await fetchBybitKlines(signal.symbol);
    if (!marketData || !updatedSignal.targets) {
      return updatedSignal;
    }
    
    // Get the current price from the latest candle
    const currentPrice = parseFloat(marketData[0][4]);
    updatedSignal.currentPrice = currentPrice;
    updatedSignal.updatedAt = new Date().toISOString();
    
    // Check if targets have been hit
    if (updatedSignal.targets) {
      updatedSignal.targets = checkTargetsHit(
        updatedSignal.targets, 
        marketData, 
        updatedSignal.type || "LONG"
      );
      
      // Check if all targets are hit
      const allTargetsHit = updatedSignal.targets.every(target => target.hit);
      if (allTargetsHit) {
        updatedSignal.status = "COMPLETED";
        updatedSignal.completedAt = new Date().toISOString();
        
        // Calculate approximate profit
        if (updatedSignal.type === "LONG") {
          const lastTarget = updatedSignal.targets[updatedSignal.targets.length - 1];
          updatedSignal.profit = ((lastTarget.price - (updatedSignal.entryAvg || 0)) / (updatedSignal.entryAvg || 1)) * 100 * (updatedSignal.leverage || 1);
        } else {
          const lastTarget = updatedSignal.targets[updatedSignal.targets.length - 1];
          updatedSignal.profit = (((updatedSignal.entryAvg || 0) - lastTarget.price) / (updatedSignal.entryAvg || 1)) * 100 * (updatedSignal.leverage || 1);
        }
      }
      
      // Check if stop loss is hit
      if (updatedSignal.type === "LONG" && currentPrice <= updatedSignal.stopLoss) {
        updatedSignal.status = "COMPLETED";
        updatedSignal.completedAt = new Date().toISOString();
        updatedSignal.profit = -((updatedSignal.entryAvg || 0) - currentPrice) / (updatedSignal.entryAvg || 1) * 100 * (updatedSignal.leverage || 1);
      } else if (updatedSignal.type === "SHORT" && currentPrice >= updatedSignal.stopLoss) {
        updatedSignal.status = "COMPLETED";
        updatedSignal.completedAt = new Date().toISOString();
        updatedSignal.profit = -((currentPrice - (updatedSignal.entryAvg || 0)) / (updatedSignal.entryAvg || 1)) * 100 * (updatedSignal.leverage || 1);
      }
    }
    
    return updatedSignal;
  } catch (error) {
    console.error(`Error updating signal status for ${signal.symbol}:`, error);
    return signal;
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

// Convert Bybit candle data to CryptoCoin format
export const convertBybitToCryptoCoin = async (symbol: string): Promise<CryptoCoin | null> => {
  try {
    const candles = await fetchBybitKlines(symbol);
    if (!candles || candles.length === 0) return null;
    
    // Extract the most recent candle
    const latestCandle = candles[0];
    
    // Parse candle data
    const openPrice = parseFloat(latestCandle[1]);
    const highPrice = parseFloat(latestCandle[2]);
    const lowPrice = parseFloat(latestCandle[3]);
    const closePrice = parseFloat(latestCandle[4]);
    const volume = parseFloat(latestCandle[5]);
    
    // Calculate 24h change
    const prevDayCandle = candles.find(c => {
      const candleTime = new Date(parseInt(c[0]));
      const now = new Date();
      const hoursDiff = (now.getTime() - candleTime.getTime()) / (1000 * 60 * 60);
      return hoursDiff >= 24;
    }) || candles[candles.length - 1];
    
    const prevClosePrice = parseFloat(prevDayCandle[4]);
    const priceChange = closePrice - prevClosePrice;
    const priceChangePercent = (priceChange / prevClosePrice) * 100;
    
    // Generate a simple coin ID
    const coinId = symbol.replace('USDT', '').toLowerCase();
    
    // Determine trend
    const trend = getTrendFromCandle(latestCandle);
    
    return {
      id: coinId,
      symbol: symbol,
      name: symbol.replace('USDT', ''),
      image: `https://cryptologos.cc/logos/${coinId}-${coinId}-logo.png?v=022`, // Generic placeholder
      currentPrice: closePrice,
      priceChange24h: priceChange,
      priceChangePercentage24h: priceChangePercent,
      marketCap: closePrice * volume * 1000, // Rough estimate
      volume24h: volume,
      high24h: highPrice,
      low24h: lowPrice,
      lastUpdated: new Date(),
      trend: trend
    };
  } catch (error) {
    console.error(`Error converting Bybit data for ${symbol}:`, error);
    return null;
  }
};

// Get multiple crypto coins data
export const getMultipleCryptoCoins = async (symbols: string[]): Promise<CryptoCoin[]> => {
  const results: CryptoCoin[] = [];
  
  for (const symbol of symbols) {
    const coin = await convertBybitToCryptoCoin(symbol);
    if (coin) {
      results.push(coin);
    }
  }
  
  return results;
};
