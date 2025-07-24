import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApiRequest {
  service: 'coingecko' | 'cryptonews' | 'bybit' | 'telegram';
  endpoint: string;
  params?: Record<string, any>;
  method?: 'GET' | 'POST';
  body?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service, endpoint, params, method = 'GET', body } = await req.json() as ApiRequest;

    let apiUrl: string;
    let headers: Record<string, string> = {};

    // Configure API endpoints and authentication
    switch (service) {
      case 'coingecko':
        const coinGeckoKey = Deno.env.get('COINGECKO_API_KEY');
        if (!coinGeckoKey) {
          throw new Error('CoinGecko API key not configured');
        }
        apiUrl = `https://api.coingecko.com/api/v3${endpoint}`;
        headers['x-cg-demo-api-key'] = coinGeckoKey;
        break;

      case 'cryptonews':
        const cryptoNewsKey = Deno.env.get('CRYPTONEWS_API_KEY');
        if (!cryptoNewsKey) {
          throw new Error('CryptoNews API key not configured');
        }
        apiUrl = `https://cryptonews-api.com/api/v1${endpoint}`;
        headers['Authorization'] = `Bearer ${cryptoNewsKey}`;
        break;

      case 'bybit':
        // Bybit public API doesn't require authentication for market data
        apiUrl = `https://api.bybit.com${endpoint}`;
        break;

      case 'telegram':
        const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (!telegramToken) {
          throw new Error('Telegram bot token not configured');
        }
        apiUrl = `https://api.telegram.org/bot${telegramToken}${endpoint}`;
        break;

      default:
        throw new Error(`Unsupported service: ${service}`);
    }

    // Add query parameters
    if (params && method === 'GET') {
      const searchParams = new URLSearchParams(params);
      apiUrl += `?${searchParams.toString()}`;
    }

    // Make the API request
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Crypto API proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});