
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';

const API_BASE_URL = 'https://api.bybit.com';

interface BybitTickerResponse {
  ret_code: number;
  ret_msg: string;
  result: {
    symbol: string;
    lastPrice: string;
    indexPrice: string;
    markPrice: string;
    prevPrice24h: string;
    price24hPcnt: string;
    highPrice24h: string;
    lowPrice24h: string;
    prevPrice1h: string;
    openInterest: string;
    openInterestValue: string;
    turnover24h: string;
    volume24h: string;
    fundingRate: string;
    nextFundingTime: string;
    predictedDeliveryPrice: string;
    basisRate: string;
    deliveryFeeRate: string;
    deliveryTime: string;
  };
}

/**
 * Fetches current price data from Bybit API
 * @param symbol Trading pair symbol (e.g. BTCUSDT)
 * @returns Current price or null if error
 */
export const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
  try {
    // Normalize symbol format - ensure uppercase and USDT format
    const normalizedSymbol = symbol
      .replace('/', '')
      .replace('-', '')
      .toUpperCase();
    
    // Add USDT suffix if not present and not a USDT pair already
    const formattedSymbol = normalizedSymbol.includes('USDT') ? normalizedSymbol : `${normalizedSymbol}USDT`;
    
    // Use v5 API endpoint for tickers
    const response = await axios.get<BybitTickerResponse>(
      `${API_BASE_URL}/v5/market/tickers`, {
        params: {
          category: 'spot',
          symbol: formattedSymbol
        }
      }
    );

    if (response.data.ret_code === 0 && response.data.result) {
      const price = parseFloat(response.data.result.lastPrice);
      console.log(`Fetched ${formattedSymbol} price: ${price}`);
      return price;
    }
    
    console.error('Invalid response from Bybit:', response.data);
    return null;
  } catch (error) {
    console.error('Error fetching price from Bybit:', error);
    return null;
  }
};

/**
 * Fetches historical candlestick data from Bybit API
 * @param symbol Trading pair symbol (e.g. BTCUSDT)
 * @param interval Candlestick interval (1, 3, 5, 15, 30, 60, 120, 240, 360, 720, D, W, M)
 * @param limit Number of candles to return (max 200)
 * @returns Array of candles or null if error
 */
export const fetchHistoricalCandles = async (
  symbol: string,
  interval = '15',
  limit = 200
) => {
  try {
    // Normalize symbol format
    const normalizedSymbol = symbol
      .replace('/', '')
      .replace('-', '')
      .toUpperCase();
      
    // Add USDT suffix if not present
    const formattedSymbol = normalizedSymbol.includes('USDT') ? normalizedSymbol : `${normalizedSymbol}USDT`;
    
    const response = await axios.get(`${API_BASE_URL}/v5/market/kline`, {
      params: {
        category: 'spot',
        symbol: formattedSymbol,
        interval,
        limit
      }
    });
    
    if (response.data.ret_code === 0 && response.data.result?.list) {
      return response.data.result.list;
    }
    
    console.error('Invalid response from Bybit kline API:', response.data);
    return null;
  } catch (error) {
    console.error('Error fetching historical candles from Bybit:', error);
    return null;
  }
};
