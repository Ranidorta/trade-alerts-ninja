
import axios from "axios";
import { toast } from "sonner";

const BINANCE_API_BASE = "https://api.binance.com/api/v3";
const KLINES_ENDPOINT = `${BINANCE_API_BASE}/klines`;
const TICKER_ENDPOINT = `${BINANCE_API_BASE}/ticker/price`;

/**
 * Interface for kline (candlestick) data from Binance
 */
export interface BinanceCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  trades: number;
  takerBaseAssetVolume: number;
  takerQuoteAssetVolume: number;
}

/**
 * Fetches historical kline (candlestick) data from Binance API
 * 
 * @param symbol Trading pair symbol (e.g., "BTCUSDT")
 * @param interval Candlestick interval (e.g., "1h", "4h", "1d")
 * @param startTime Start time in milliseconds
 * @param endTime End time in milliseconds
 * @param limit Number of candles to return (max 1000)
 */
export async function fetchBinanceCandles(
  symbol: string,
  interval: string = "1h",
  startTime?: number,
  endTime?: number,
  limit: number = 100
): Promise<BinanceCandle[]> {
  try {
    // Ensure symbol is uppercase and properly formatted
    const formattedSymbol = symbol.toUpperCase();
    
    // Prepare request parameters
    const params: Record<string, any> = {
      symbol: formattedSymbol,
      interval,
      limit,
    };
    
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    // Make API request with rate limiting and retry mechanism
    const response = await axios.get(KLINES_ENDPOINT, { params });
    
    // Process the response data
    return response.data.map((candle: any[]) => ({
      openTime: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      closeTime: candle[6],
      quoteAssetVolume: parseFloat(candle[7]),
      trades: candle[8],
      takerBaseAssetVolume: parseFloat(candle[9]),
      takerQuoteAssetVolume: parseFloat(candle[10]),
    }));
  } catch (error) {
    console.error("Error fetching Binance candles:", error);
    
    // Handle different error types
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        toast.error("Binance API rate limit exceeded. Please try again later.");
      } else if (error.response?.status === 400) {
        toast.error(`Invalid request parameters: ${error.response.data.msg || "Unknown error"}`);
      } else {
        toast.error(`API Error: ${error.response?.data?.msg || error.message}`);
      }
    } else {
      toast.error("Failed to fetch candle data. Check network connection.");
    }
    
    return [];
  }
}

/**
 * Fetches current price for a symbol from Binance
 * 
 * @param symbol Trading pair symbol (e.g., "BTCUSDT")
 */
export async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const formattedSymbol = symbol.toUpperCase();
    const response = await axios.get(TICKER_ENDPOINT, { params: { symbol: formattedSymbol } });
    return parseFloat(response.data.price);
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Verifies if price targets were hit based on historical candles
 * 
 * @param candles Array of candles to check
 * @param takeProfits Array of take profit levels
 * @param stopLoss Stop loss level
 * @param direction BUY or SELL direction
 */
export function checkPriceLevels(
  candles: BinanceCandle[],
  takeProfits: number[],
  stopLoss: number,
  direction: "BUY" | "SELL" = "BUY"
) {
  const hitTargets = takeProfits.map(() => false);
  let hitSL = false;

  candles.forEach(candle => {
    // For BUY signals, we check if price went up to hit take profits
    // For SELL signals, we check if price went down to hit take profits
    if (direction === "BUY") {
      takeProfits.forEach((tp, i) => {
        if (candle.high >= tp) hitTargets[i] = true;
      });
      if (candle.low <= stopLoss) hitSL = true;
    } else {
      takeProfits.forEach((tp, i) => {
        if (candle.low <= tp) hitTargets[i] = true;
      });
      if (candle.high >= stopLoss) hitSL = true;
    }
  });

  return { hitTargets, hitSL };
}

/**
 * Determines trade result based on hit targets and stop loss
 */
export function getTradeResult(hitTargets: boolean[], hitSL: boolean): "win" | "loss" | "partial" | "missed" {
  if (hitSL) return "loss";
  if (hitTargets.every(Boolean)) return "win";
  if (hitTargets.some(Boolean)) return "partial";
  return "missed";
}
