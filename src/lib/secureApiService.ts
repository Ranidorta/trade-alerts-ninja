import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

interface ApiRequest {
  service: 'coingecko' | 'cryptonews' | 'bybit' | 'telegram';
  endpoint: string;
  method?: 'GET' | 'POST';
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

interface ApiResponse {
  data: any;
  success: boolean;
  error?: string;
}

/**
 * Secure API Service that routes through Firebase Cloud Functions
 * This prevents direct client-side API calls and provides security
 */
export class SecureApiService {
  static async makeSecureApiCall(request: ApiRequest): Promise<ApiResponse> {
    try {
      const cryptoApiProxy = httpsCallable(functions, 'cryptoApiProxy');
      const result = await cryptoApiProxy(request);
      
      return {
        data: result.data,
        success: true
      };
    } catch (error: any) {
      console.error('Firebase Cloud Function error:', error);
      return {
        data: null,
        success: false,
        error: error.message
      };
    }
  }

  // Specific methods for different services
  static async getCoinGeckoData(endpoint: string, params?: Record<string, any>) {
    return this.makeSecureApiCall({
      service: 'coingecko',
      endpoint,
      params
    });
  }

  static async getCryptoNews(params?: Record<string, any>) {
    return this.makeSecureApiCall({
      service: 'cryptonews',
      endpoint: 'news',
      params
    });
  }

  static async getBybitData(endpoint: string, params?: Record<string, any>) {
    return this.makeSecureApiCall({
      service: 'bybit',
      endpoint,
      params
    });
  }

  // Helper method for telegram notifications
  static async sendTelegramNotification(message: string, chatId?: string) {
    return this.makeSecureApiCall({
      service: 'telegram',
      endpoint: 'sendMessage',
      method: 'POST',
      params: {
        text: message,
        chat_id: chatId
      }
    });
  }

  // Legacy method for backward compatibility
  static async fetchCryptoData(endpoint: string, params?: Record<string, any>) {
    return this.getCoinGeckoData(endpoint, params);
  }

  // Legacy method for crypto news
  static async fetchCryptoNews() {
    const response = await this.getCryptoNews();
    return response.success ? response.data : [];
  }

  // Legacy method for market data
  static async fetchMarketData() {
    const response = await this.getCoinGeckoData('global');
    return response.success ? response.data : null;
  }

  // Legacy method for coin prices
  static async fetchCoinPrices(coinIds: string[]) {
    const response = await this.getCoinGeckoData('simple/price', {
      ids: coinIds.join(','),
      vs_currencies: 'usd',
      include_24hr_change: true
    });
    return response.success ? response.data : {};
  }
}