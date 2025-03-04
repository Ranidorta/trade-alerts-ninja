
import { useToast } from "@/hooks/use-toast";

// API URLs and keys
const BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines";
const COINGECKO_GLOBAL_URL = "https://api.coingecko.com/api/v3/global";
const COINGECKO_API_KEY = "CG-r1Go4M9HPMrsNaH6tASKaWLr";
const NEWS_API_URL = "https://newsapi.org/v2/everything";
const TELEGRAM_BOT_TOKEN = "7807375635:AAGWvj86Ok_9oYdwdB-VtSb1QQ3ZjXBSz04";
const TELEGRAM_CHAT_ID = "981122089";

// Helper function to handle API errors
const handleApiError = (error: any, endpoint: string) => {
  console.error(`Error fetching data from ${endpoint}:`, error);
  return null;
};

// Fetch candlestick data from Binance
export const fetchBinanceKlines = async (
  symbol: string,
  interval: string = "1h",
  limit: number = 24
) => {
  try {
    const response = await fetch(
      `${BINANCE_KLINES_URL}?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return handleApiError(error, "Binance Klines");
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

// Fetch crypto news from NewsAPI
export const fetchCryptoNews = async (keyword: string = "cryptocurrency", pageSize: number = 5) => {
  try {
    // Note: NewsAPI requires a valid API key. This is a placeholder for demonstration.
    // In a real application, this should be in an environment variable or in a backend service.
    const response = await fetch(
      `${NEWS_API_URL}?q=${keyword}&sortBy=publishedAt&pageSize=${pageSize}&apiKey=YOUR_NEWS_API_KEY`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.articles;
  } catch (error) {
    return handleApiError(error, "News API");
  }
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
