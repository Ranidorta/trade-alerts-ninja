import { useToast } from "@/hooks/use-toast";
import { CryptoNews, TradingSignal, SignalStatus, CryptoCoin, PriceTarget } from "./types";
import { SecureApiService } from "./secureApiService";

// API URLs - Now using secure proxy service
const BYBIT_API_URL = "https://api.bybit.com/v5/market/kline";
const COIN_DESK_API_URL = "https://api.coindesk.com/v1/bpi/currentprice.json";

// Symbols to monitor - expanded list
const SYMBOLS = ["PNUTUSDT", "BTCUSDT", "ETHUSDT", "AUCTIONUSDT", "XRPUSDT", "AVAXUSDT", "ADAUSDT", "UNIUSDT", "SOLUSDT"];

// List of symbols that we'll always try to generate signals for
const ALWAYS_SIGNAL_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

// Helper function to handle API errors
const handleApiError = (error: any, endpoint: string) => {
  console.error(`Error fetching data from ${endpoint}:`, error);
  return null;
};

// Fetch kline data from Bybit using secure proxy
export const fetchBybitKlines = async (
  symbol: string,
  interval: string = "5", // 5 min interval
  limit: number = 50
) => {
  try {
    console.log("Fetching Bybit klines for:", symbol);
    
    const data = await SecureApiService.fetchBybitData('/v5/market/kline', {
      category: 'linear',
      symbol: symbol.toUpperCase(),
      interval,
      limit: limit.toString()
    });
    
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

// Fetch global market data from CoinGecko using secure proxy
export const fetchCoinGeckoGlobal = async () => {
  try {
    const data = await SecureApiService.fetchCoinGeckoData('/global');
    return data;
  } catch (error) {
    return handleApiError(error, "CoinGecko Global");
  }
};

// Fetch coin data from CoinGecko using secure proxy
export const fetchCoinData = async (coinId: string) => {
  try {
    const data = await SecureApiService.fetchCoinGeckoData(`/coins/${coinId}`, {
      localization: 'false',
      tickers: 'false',
      market_data: 'true',
      community_data: 'false',
      developer_data: 'false'
    });
    return data;
  } catch (error) {
    return handleApiError(error, `CoinGecko ${coinId}`);
  }
};

// Fetch crypto news using secure proxy
export const fetchCryptoNews = async (): Promise<CryptoNews[]> => {
  try {
    console.log("Fetching crypto news...");
    
    // Try secure CryptoNews API first
    try {
      const data = await SecureApiService.fetchCryptoNews({
        section: 'general',
        items: '10',
        page: '1'
      });
      console.log("CryptoNews API response:", data);
      
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
    } catch (cryptoNewsError) {
      console.log("CryptoNews API failed, trying CoinDesk API...", cryptoNewsError);
    }
    
    // Try CoinDesk API as fallback (public, no auth needed)
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

// Send message via Telegram bot using secure proxy
export const sendTelegramMessage = async (message: string) => {
  try {
    console.log("Sending Telegram message:", message);
    
    await SecureApiService.sendTelegramMessage(message);
    console.log("Telegram message sent successfully");
    return { ok: true };
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
  const avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  const avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
  
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

// Calculate trading indicators (improved version aligned with Python code)
export const calculateIndicators = (data: any[]) => {
  if (!data || data.length < 26) {
    console.error("Insufficient data for technical analysis");
    return { shortMa: null, longMa: null, rsi: null, macd: null, upperBand: null, lowerBand: null };
  }
  
  const closingPrices = data.map(candle => parseFloat(candle[4]));
  const highPrices = data.map(candle => parseFloat(candle[2]));
  const lowPrices = data.map(candle => parseFloat(candle[3]));
  
  // Calculate moving averages (more align with Python code: short=50, long=200)
  const shortMa = calculateSMA(closingPrices, 5); // Using 5 instead of 50 for more responsiveness
  const longMa = calculateSMA(closingPrices, 15); // Using 15 instead of 200 for more responsiveness
  
  // Calculate RSI using the improved algorithm
  const rsi = calculateRSI(closingPrices);
  
  // Calculate MACD using the improved algorithm
  const macdResult = calculateMACD(closingPrices);
  
  // Calculate Bollinger Bands
  const bollingerBands = calculateBollingerBands(closingPrices);
  
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
    stdDev: (bollingerBands.upper - bollingerBands.middle) / 2
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
      stdDev
    } = technicalIndicators;
    
    const volatility = (Math.max(...highPrices) - Math.min(...lowPrices)) / Math.min(...lowPrices);
    const leverage = Math.min(10, Math.max(2, Math.floor(volatility * 50)));
    
    let tradingSignal: TradingSignal | null = null;
    
    // Logic aligned with the Python code - using MA crossover strategy
    if (shortMa > longMa && macd > 0 && rsi < 70 && currentPrice > lowerBand) {
      // LONG signal
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 0.98;
      
      const targets = [
        { level: 1, price: entryPrice * 1.01, hit: false },
        { level: 2, price: entryPrice * 1.02, hit: false },
        { level: 3, price: entryPrice * 1.03, hit: false }
      ];
      
      tradingSignal = {
        id: `${symbol}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        symbol: symbol,
        pair: `${symbol.replace('USDT', '')}/USDT`,
        direction: "BUY",
        entryPrice: entryPrice,
        entryMin: entryPrice * 0.998,
        entryMax: entryPrice * 1.002,
        entryAvg: entryPrice,
        stopLoss: stopLoss,
        targets: targets,
        status: "ACTIVE",
        timeframe: "5m",
        reason: `STRONG BUY SIGNAL: RSI(${rsi.toFixed(2)}) with MACD(${macd.toFixed(4)}) crossing Signal(${macdSignal.toFixed(4)})`,
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
          signal: 1
        }
      };
    } else if (shortMa < longMa && macd < 0 && rsi > 30 && currentPrice < upperBand) {
      // SHORT signal
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 1.02;
      
      const targets = [
        { level: 1, price: entryPrice * 0.99, hit: false },
        { level: 2, price: entryPrice * 0.98, hit: false },
        { level: 3, price: entryPrice * 0.97, hit: false }
      ];
      
      tradingSignal = {
        id: `${symbol}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        symbol: symbol,
        pair: `${symbol.replace('USDT', '')}/USDT`,
        direction: "SELL",
        entryPrice: entryPrice,
        entryMin: entryPrice * 0.998,
        entryMax: entryPrice * 1.002,
        entryAvg: entryPrice,
        stopLoss: stopLoss,
        targets: targets,
        status: "ACTIVE",
        timeframe: "5m",
        reason: `STRONG SELL SIGNAL: RSI(${rsi.toFixed(2)}) with MACD(${macd.toFixed(4)}) below Signal(${macdSignal.toFixed(4)})`,
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
          signal: -1
        }
      };
    } else if (ALWAYS_SIGNAL_SYMBOLS.includes(symbol)) {
      // Always generate a potential signal for selected symbols, even if conditions aren't strong
      const entryPrice = currentPrice;
      const isBullish = rsi > 50 || macd > 0 || shortMa > longMa;
      
      if (isBullish) {
        const stopLoss = entryPrice * 0.99;
        const targets = [
          { level: 1, price: entryPrice * 1.005, hit: false },
          { level: 2, price: entryPrice * 1.01, hit: false },
          { level: 3, price: entryPrice * 1.015, hit: false }
        ];
        
        tradingSignal = {
          id: `${symbol}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          symbol: symbol,
          pair: `${symbol.replace('USDT', '')}/USDT`,
          direction: "BUY",
          entryPrice: entryPrice,
          entryMin: entryPrice * 0.998,
          entryMax: entryPrice * 1.002,
          entryAvg: entryPrice,
          stopLoss: stopLoss,
          targets: targets,
          status: "WAITING", // Mark as "WAITING" since conditions aren't strong
          timeframe: "5m",
          reason: `Possible BUY entry (RSI: ${rsi.toFixed(2)}, MACD/Signal: ${macd.toFixed(4)}/${macdSignal.toFixed(4)})`,
          leverage: Math.min(leverage, 5), // Lower leverage for less confident signals
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
            signal: 0
          }
        };
      } else {
        const stopLoss = entryPrice * 1.01;
        const targets = [
          { level: 1, price: entryPrice * 0.995, hit: false },
          { level: 2, price: entryPrice * 0.99, hit: false },
          { level: 3, price: entryPrice * 0.985, hit: false }
        ];
        
        tradingSignal = {
          id: `${symbol}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          symbol: symbol,
          pair: `${symbol.replace('USDT', '')}/USDT`,
          direction: "SELL",
          entryPrice: entryPrice,
          entryMin: entryPrice * 0.998,
          entryMax: entryPrice * 1.002,
          entryAvg: entryPrice,
          stopLoss: stopLoss,
          targets: targets,
          status: "WAITING", // Mark as "WAITING" since conditions aren't strong
          timeframe: "5m",
          reason: `Possible SELL entry (RSI: ${rsi.toFixed(2)}, MACD/Signal: ${macd.toFixed(4)}/${macdSignal.toFixed(4)})`,
          leverage: Math.min(leverage, 5), // Lower leverage for less confident signals
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
            signal: 0
          }
        };
      }
    }
    
    if (tradingSignal) {
      // Send signal to Telegram with enhanced message
      const signalMessage = 
        `🔥 TRADING NINJA SIGNAL 🔥\n\n` +
        `${tradingSignal.type === 'LONG' ? '🟢 BUY' : '🔴 SELL'} ${tradingSignal.symbol}\n\n` +
        `⚡ Entry: ${formatPrice(tradingSignal.entryMin)} - ${formatPrice(tradingSignal.entryMax)}\n` +
        `🛑 Stop Loss: ${formatPrice(tradingSignal.stopLoss)}\n` +
        `🎯 Targets:\n` +
        `  TP1: ${formatPrice(tradingSignal.targets[0].price)}\n` +
        `  TP2: ${formatPrice(tradingSignal.targets[1].price)}\n` +
        `  TP3: ${formatPrice(tradingSignal.targets[2].price)}\n\n` +
        `💰 Leverage: ${tradingSignal.leverage}x\n` +
        `⏱️ Timeframe: ${tradingSignal.timeframe}\n` +
        `📊 Status: ${tradingSignal.status}\n\n` +
        `📈 Indicators:\n` +
        `  RSI: ${rsi.toFixed(2)}\n` +
        `  MACD: ${macd.toFixed(4)}\n` +
        `  Signal: ${macdSignal.toFixed(4)}\n` +
        `  Histogram: ${macdHistogram.toFixed(4)}\n` +
        `  MA Crossover: ${signal === 1 ? 'BUY' : signal === -1 ? 'SELL' : 'NEUTRAL'}`;
        
      await sendTelegramMessage(signalMessage);
    }
    
    return tradingSignal;
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
    
    // Update technical indicators
    const indicators = calculateIndicators(marketData);
    if (updatedSignal.technicalIndicators) {
      updatedSignal.technicalIndicators = {
        ...updatedSignal.technicalIndicators,
        ...indicators
      };
    }
    
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

