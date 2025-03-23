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

// Signal confidence threshold - based on improved Python model
const SIGNAL_CONFIDENCE_THRESHOLD = 0.65;

// Model performance tracking
const MODEL_PERFORMANCE = {
  accuracy: 0,
  totalSamples: 0,
  lastUpdated: new Date()
};

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

// Get trend from candle data with enhanced pattern recognition
export const getTrendFromCandle = (candle: any[]): "BULLISH" | "BEARISH" | "NEUTRAL" => {
  if (!candle || candle.length < 5) return "NEUTRAL";
  
  const openPrice = parseFloat(candle[1]);
  const highPrice = parseFloat(candle[2]);
  const lowPrice = parseFloat(candle[3]);
  const closePrice = parseFloat(candle[4]);
  
  // Enhanced pattern recognition (like in the Python code)
  const bodySize = Math.abs(closePrice - openPrice);
  const wickSize = highPrice - Math.max(openPrice, closePrice);
  const tailSize = Math.min(openPrice, closePrice) - lowPrice;
  
  // Check for strong bullish/bearish patterns
  if (closePrice > openPrice) {
    // Bullish candle
    if (bodySize > (highPrice - lowPrice) * 0.6) return "BULLISH"; // Strong bullish
    if (wickSize < bodySize * 0.2 && tailSize < bodySize * 0.5) return "BULLISH"; // Bull with small wick
    return "NEUTRAL"; // Weak bullish
  } else if (closePrice < openPrice) {
    // Bearish candle
    if (bodySize > (highPrice - lowPrice) * 0.6) return "BEARISH"; // Strong bearish
    if (tailSize < bodySize * 0.2 && wickSize < bodySize * 0.5) return "BEARISH"; // Bear with small tail
    return "NEUTRAL"; // Weak bearish
  }
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

// Improved RSI calculation based on Python code
const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length <= period) {
    return 50; // Default value if not enough data
  }
  
  // Calculate price deltas
  const deltas = prices.slice(1).map((price, i) => price - prices[i]);
  
  // Initialize gains and losses
  const gains = deltas.map(delta => delta > 0 ? delta : 0);
  const losses = deltas.map(delta => delta < 0 ? -delta : 0);
  
  // Calculate average gain and loss for the initial period
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
  
  // Smooth RSI calculation for the rest of the data (like in TaLib)
  for (let i = period; i < deltas.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  
  // Prevent division by zero
  if (avgLoss === 0) {
    return 100;
  }
  
  // Calculate RS and RSI
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

// Calculate EMA (Exponential Moving Average) for MACD
const calculateEMA = (prices: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaData: number[] = [];
  
  // Initialize with SMA
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  emaData.push(ema);
  
  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    emaData.push(ema);
  }
  
  return emaData;
};

// Calculate MACD based on the Python code
const calculateMACD = (
  prices: number[], 
  shortWindow: number = 12, 
  longWindow: number = 26, 
  signalWindow: number = 9
): { macdLine: number; signalLine: number; histogram: number } => {
  if (prices.length < Math.max(shortWindow, longWindow) + signalWindow) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }
  
  // Calculate EMAs
  const shortEMA = calculateEMA(prices, shortWindow);
  const longEMA = calculateEMA(prices, longWindow);
  
  // Calculate MACD Line
  const macdLine = shortEMA[shortEMA.length - 1] - longEMA[longEMA.length - 1];
  
  // Calculate Signal Line (EMA of MACD Line)
  // For simplicity, we'll use a simple approximation here
  const prevMacdLines = [];
  for (let i = Math.max(0, shortEMA.length - signalWindow); i < shortEMA.length; i++) {
    prevMacdLines.push(shortEMA[i] - longEMA[i]);
  }
  
  const signalLine = prevMacdLines.reduce((sum, value) => sum + value, 0) / prevMacdLines.length;
  
  // Calculate MACD Histogram
  const histogram = macdLine - signalLine;
  
  return { macdLine, signalLine, histogram };
};

// Calculate Simple Moving Average
const calculateSMA = (prices: number[], window: number): number => {
  if (prices.length < window) {
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }
  return prices.slice(-window).reduce((sum, price) => sum + price, 0) / window;
};

// Calculate Bollinger Bands
const calculateBollingerBands = (prices: number[], window: number = 20, deviations: number = 2): { 
  middle: number;
  upper: number;
  lower: number;
} => {
  // Calculate middle band (SMA)
  const middleBand = calculateSMA(prices, window);
  
  // Calculate standard deviation
  const stdDev = Math.sqrt(
    prices.slice(-window).reduce((sum, price) => sum + Math.pow(price - middleBand, 2), 0) / window
  );
  
  // Calculate upper and lower bands
  const upperBand = middleBand + (deviations * stdDev);
  const lowerBand = middleBand - (deviations * stdDev);
  
  return { middle: middleBand, upper: upperBand, lower: lowerBand };
};

// Generate signal based on MA crossover (similar to the Python strategy)
const generateMACrossoverSignal = (shortMa: number, longMa: number): number => {
  if (shortMa > longMa) {
    return 1; // Buy signal
  } else if (shortMa < longMa) {
    return -1; // Sell signal
  }
  return 0; // Neutral
};

// Calculate ATR (Average True Range) - added from Python code
const calculateATR = (highPrices: number[], lowPrices: number[], closePrices: number[], period: number = 14): number => {
  if (highPrices.length < period + 1) {
    return 0;
  }
  
  // Calculate true ranges
  const trueRanges: number[] = [];
  
  for (let i = 1; i < highPrices.length; i++) {
    const prevClose = closePrices[i - 1];
    const currentHigh = highPrices[i];
    const currentLow = lowPrices[i];
    
    // True Range is the greatest of:
    // 1. Current High - Current Low
    // 2. |Current High - Previous Close|
    // 3. |Current Low - Previous Close|
    const tr1 = currentHigh - currentLow;
    const tr2 = Math.abs(currentHigh - prevClose);
    const tr3 = Math.abs(currentLow - prevClose);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  // Calculate ATR as simple moving average of true ranges
  const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
  return atr;
};

// Calculate volatility - added from Python code
const calculateVolatility = (prices: number[], period: number = 10): number => {
  if (prices.length < period) {
    return 0;
  }
  
  const recentPrices = prices.slice(-period);
  const mean = recentPrices.reduce((sum, price) => sum + price, 0) / period;
  const squaredDiffs = recentPrices.map(price => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
  
  return Math.sqrt(variance);
};

// Generate signal confidence score - added from Python model
const calculateSignalConfidence = (indicators: any): number => {
  // This is a simplified version of the model prediction from the Python code
  // In a real implementation, you'd use a proper ML model here
  
  const { rsi, macd, shortMa, longMa, upperBand, lowerBand, currentPrice, atr, volatility } = indicators;
  
  // Initialize base confidence
  let confidence = 0.5;
  
  // Adjust confidence based on RSI extremes
  if (rsi < 30) confidence += 0.1;
  if (rsi < 20) confidence += 0.1;
  if (rsi > 70) confidence -= 0.1;
  if (rsi > 80) confidence -= 0.1;
  
  // Adjust confidence based on MACD
  if (macd > 0) confidence += 0.05;
  if (macd < 0) confidence -= 0.05;
  
  // Adjust confidence based on MA crossover
  if (shortMa > longMa) confidence += 0.1;
  if (shortMa < longMa) confidence -= 0.1;
  
  // Adjust confidence based on Bollinger Bands
  if (currentPrice < lowerBand) confidence += 0.1;
  if (currentPrice > upperBand) confidence -= 0.1;
  
  // Adjust for volatility and ATR - more volatile means less confident
  const volatilityFactor = Math.min(0.1, volatility / 10);
  confidence -= volatilityFactor;
  
  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
};

// Calculate trading indicators (improved version aligned with Python code)
export const calculateIndicators = (data: any[]) => {
  if (!data || data.length < 26) {
    console.error("Insufficient data for technical analysis");
    return { shortMa: null, longMa: null, rsi: null, macd: null, upperBand: null, lowerBand: null };
  }
  
  const closingPrices = data.map(candle => parseFloat(candle[4]));
  const highPrices = data.map(candle => parseFloat(candle[2]));
  const lowPrices = data.map(candle => parseFloat(candle[3]));
  
  // Calculate moving averages (more align with Python code: short=5, long=20)
  const shortMa = calculateSMA(closingPrices, 5); 
  const longMa = calculateSMA(closingPrices, 20);
  
  // Calculate RSI using the improved algorithm
  const rsi = calculateRSI(closingPrices);
  
  // Calculate MACD using the improved algorithm
  const macdResult = calculateMACD(closingPrices);
  
  // Calculate Bollinger Bands
  const bollingerBands = calculateBollingerBands(closingPrices);
  
  // Calculate ATR and volatility (added from Python code)
  const atr = calculateATR(highPrices, lowPrices, closingPrices, 14);
  const volatility = calculateVolatility(closingPrices, 10);
  
  // Generate signal based on MA crossover strategy
  const signal = generateMACrossoverSignal(shortMa, longMa);
  
  return { 
    shortMa, 
    longMa, 
    rsi, 
    macd: macdResult.macdLine,
    macdSignal: macdResult.signalLine,
    macdHistogram: macdResult.histogram,
    currentPrice: closingPrices[closingPrices.length - 1],
    highPrices,
    lowPrices,
    upperBand: bollingerBands.upper,
    lowerBand: bollingerBands.lower,
    middleBand: bollingerBands.middle,
    signal,
    stdDev: (bollingerBands.upper - bollingerBands.middle) / 2,
    atr,
    volatility
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

// Generate trading signal (improved version matching Python code)
export const generateTradingSignal = async (symbol: string): Promise<TradingSignal | null> => {
  try {
    const marketData = await fetchBybitKlines(symbol);
    if (!marketData) return null;
    
    const technicalIndicators = calculateIndicators(marketData);
    if (!technicalIndicators.shortMa || !technicalIndicators.longMa) return null;
    
    const { 
      shortMa, 
      longMa, 
      rsi, 
      macd, 
      macdSignal,
      macdHistogram,
      currentPrice, 
      highPrices, 
      lowPrices, 
      upperBand, 
      lowerBand,
      signal,
      atr,
      volatility
    } = technicalIndicators;
    
    // Calculate signal confidence (from Python model)
    const confidence = calculateSignalConfidence(technicalIndicators);
    
    // Adaptive leverage based on volatility (from Python code)
    const dynamicVolatility = (Math.max(...highPrices) - Math.min(...lowPrices)) / Math.min(...lowPrices);
    const leverage = Math.min(10, Math.max(2, Math.floor(dynamicVolatility * 50)));
    
    let tradingSignal: TradingSignal | null = null;
    
    // Logic aligned with the Python code - using improved signal criteria
    if (
      rsi < 30 && 
      shortMa > longMa && 
      macd > 0 && 
      currentPrice < lowerBand * 1.05 && 
      atr > 0.00001 &&
      volatility > 0.0003 &&
      confidence >= SIGNAL_CONFIDENCE_THRESHOLD
    ) {
      // LONG signal with improved criteria
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * (1 - (atr / entryPrice) * 2); // Dynamic stop loss based on ATR
      
      // Dynamic targets based on volatility and ATR
      const targetScale = Math.max(1, Math.min(3, volatility * 100));
      const targets = [
        { level: 1, price: entryPrice * (1 + (atr / entryPrice) * 3 * targetScale), hit: false },
        { level: 2, price: entryPrice * (1 + (atr / entryPrice) * 5 * targetScale), hit: false },
        { level: 3, price: entryPrice * (1 + (atr / entryPrice) * 8 * targetScale), hit: false }
      ];
      
      tradingSignal = {
        id: `${symbol}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        symbol: symbol,
        pair: `${symbol.replace('USDT', '')}/USDT`,
        direction: "BUY",
        entryPrice: entryPrice,
        entryMin: entryPrice * (1 - volatility),
        entryMax: entryPrice * (1 + volatility),
        entryAvg: entryPrice,
        stopLoss: stopLoss,
        targets: targets,
        status: confidence > 0.8 ? "ACTIVE" : "WAITING",
        timeframe: "5m",
        reason: `BUY SIGNAL: RSI(${rsi.toFixed(2)}) MA-Cross(✓) MACD(${macd.toFixed(4)}) Confidence(${(confidence * 100).toFixed(0)}%)`,
        leverage: leverage,
        type: "LONG",
        currentPrice: currentPrice,
        technicalIndicators: {
          rsi,
          macd,
          macdSignal,
          macdHistogram,
          shortMa,
          longMa,
          upperBand,
          lowerBand,
          signal: 1,
          atr,
          volatility,
          confidence
        }
      };
    } else if (
      rsi > 70 && 
      shortMa < longMa && 
      macd < 0 && 
      currentPrice > upperBand * 0.95 &&
      atr > 0.00001 &&
      volatility > 0.0003 &&
      confidence >= SIGNAL_CONFIDENCE_THRESHOLD
    ) {
      // SHORT signal with improved criteria
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * (1 + (atr / entryPrice) * 2); // Dynamic stop loss based on ATR
      
      // Dynamic targets based on volatility and ATR
      const targetScale = Math.max(1, Math.min(3, volatility * 100));
      const targets = [
        { level: 1, price: entryPrice * (1 - (atr / entryPrice) * 3 * targetScale), hit: false },
        { level: 2, price: entryPrice * (1 - (atr / entryPrice) * 5 * targetScale), hit: false },
        { level: 3, price: entryPrice * (1 - (atr / entryPrice) * 8 * targetScale), hit: false }
      ];
      
      tradingSignal = {
        id: `${symbol}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        symbol: symbol,
        pair: `${symbol.replace('USDT', '')}/USDT`,
        direction: "SELL",
        entryPrice: entryPrice,
        entryMin: entryPrice * (1 - volatility),
        entryMax: entryPrice * (1 + volatility),
        entryAvg: entryPrice,
        stopLoss: stopLoss,
        targets: targets,
        status: confidence > 0.8 ? "ACTIVE" : "WAITING",
        timeframe: "5m",
        reason: `SELL SIGNAL: RSI(${rsi.toFixed(2)}) MA-Cross(✓) MACD(${macd.toFixed(4)}) Confidence(${(confidence * 100).toFixed(0)}%)`,
        leverage: leverage,
        type: "SHORT",
        currentPrice: currentPrice,
        technicalIndicators: {
          rsi,
          macd,
          macdSignal,
          macdHistogram,
          shortMa,
          longMa,
          upperBand,
          lowerBand,
          signal: -1,
          atr,
          volatility,
          confidence
        }
      };
    } else if (ALWAYS_SIGNAL_SYMBOLS.includes(symbol) && confidence > 0.5) {
      // Generate lower-confidence signals for key symbols
      const entryPrice = currentPrice;
      const isBullish = rsi > 50 || macd > 0 || shortMa > longMa;
      
      if (isBullish) {
        const stopLoss = entryPrice * (1 - Math.max(0.01, atr / entryPrice));
        const targets = [
          { level: 1, price: entryPrice * (1 + Math.max(0.005, atr / entryPrice * 2)), hit: false },
          { level: 2, price: entryPrice * (1 + Math.max(0.01, atr / entryPrice * 4)), hit: false },
          { level: 3, price: entryPrice * (1 + Math.max(0.015, atr / entryPrice * 6)), hit: false }
        ];
        
        tradingSignal = {
          id: `${symbol}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          symbol: symbol,
          pair: `${symbol.replace('USDT', '')}/USDT`,
          direction: "BUY",
          entryPrice: entryPrice,
          entryMin: entryPrice * (1 - volatility/2),
          entryMax: entryPrice * (1 + volatility/2),
          entryAvg: entryPrice,
          stopLoss: stopLoss,
          targets: targets,
          status: "WAITING",
          timeframe: "5m",
          reason: `Potential BUY: RSI(${rsi.toFixed(2)}) MACD(${macd.toFixed(4)}) Confidence(${(confidence * 100).toFixed(0)}%)`,
          leverage: Math.min(leverage, 5),
          type: "LONG",
          currentPrice: currentPrice,
          technicalIndicators: {
            rsi,
            macd,
            macdSignal,
            macdHistogram,
            shortMa,
            longMa,
            upperBand,
            lowerBand,
            signal: 0,
            atr,
            volatility,
            confidence
          }
        };
      } else {
        const stopLoss = entryPrice * (1 + Math.max(0.01, atr / entryPrice));
        const targets = [
          { level: 1, price: entryPrice * (1 - Math.max(0.005, atr / entryPrice * 2)), hit: false },
          { level: 2, price: entryPrice * (1 - Math.max(0.01, atr / entryPrice * 4)), hit: false },
          { level: 3, price: entryPrice * (1 - Math.max(0.015, atr / entryPrice * 6)), hit: false }
        ];
        
        tradingSignal = {
          id: `${symbol}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          symbol: symbol,
          pair: `${symbol.replace('USDT', '')}/USDT`,
          direction: "SELL",
          entryPrice: entryPrice,
          entryMin: entryPrice * (1 - volatility/2),
          entryMax: entryPrice * (1 + volatility/2),
          entryAvg: entryPrice,
          stopLoss: stopLoss,
          targets: targets,
          status: "WAITING",
          timeframe: "5m",
          reason: `Potential SELL: RSI(${rsi.toFixed(2)}) MACD(${macd.toFixed(4)}) Confidence(${(confidence * 100).toFixed(0)}%)`,
          leverage: Math.min(leverage, 5),
          type: "SHORT",
          currentPrice: currentPrice,
          technicalIndicators: {
            rsi,
            macd,
            macdSignal,
            macdHistogram,
            shortMa,
            longMa,
            upperBand,
            lowerBand,
            signal: -1,
            atr,
            volatility,
            confidence
          }
        };
      }
    }
    
    return tradingSignal;
  } catch (error) {
    console.error(`Error generating trading signal for ${symbol}:`, error);
    return null;
  }
};
