import { supabase } from '@/integrations/supabase/client';

interface ApiRequest {
  service: 'coingecko' | 'cryptonews' | 'bybit' | 'telegram';
  endpoint: string;
  params?: Record<string, any>;
  method?: 'GET' | 'POST';
  body?: any;
}

/**
 * Secure API service that routes all external API calls through Supabase edge functions
 * This prevents exposure of API keys in the frontend
 */
export class SecureApiService {
  /**
   * Make a secure API call through the crypto-api-proxy edge function
   */
  static async makeSecureApiCall(request: ApiRequest): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('crypto-api-proxy', {
        body: request
      });

      if (error) {
        console.error('Secure API call error:', error);
        throw new Error(`API call failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Secure API service error:', error);
      throw error;
    }
  }

  /**
   * Fetch CoinGecko data securely
   */
  static async fetchCoinGeckoData(endpoint: string, params?: Record<string, any>) {
    return this.makeSecureApiCall({
      service: 'coingecko',
      endpoint,
      params,
      method: 'GET'
    });
  }

  /**
   * Fetch crypto news securely
   */
  static async fetchCryptoNews(params?: Record<string, any>) {
    return this.makeSecureApiCall({
      service: 'cryptonews',
      endpoint: '/news',
      params,
      method: 'GET'
    });
  }

  /**
   * Fetch Bybit data securely
   */
  static async fetchBybitData(endpoint: string, params?: Record<string, any>) {
    return this.makeSecureApiCall({
      service: 'bybit',
      endpoint,
      params,
      method: 'GET'
    });
  }

  /**
   * Send Telegram message securely
   */
  static async sendTelegramMessage(message: string, chatId?: string) {
    return this.makeSecureApiCall({
      service: 'telegram',
      endpoint: '/sendMessage',
      method: 'POST',
      body: {
        chat_id: chatId, // Chat ID will be handled by the edge function
        text: message,
        parse_mode: 'HTML'
      }
    });
  }
}