
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
