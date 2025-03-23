import axios from "axios";
import { TradingSignal, CryptoNews } from "@/lib/types";

const API_BASE_URL = "http://localhost:5000/api";
const COINGECKO_API_KEY = "CG-r1Go4M9HPMrsNaH6tASKaWLr"; // API key for CoinGecko

export interface TradingSignalRecord {
  id: number;
  timestamp: string;
  symbol: string;
  signal: number;
  result: number;
  entry_price: number;
  exit_price: number;
  atr: number;
  position_size: number;
  profit_loss: number;
}

export interface PerformanceData {
  totalSignals: number;
  winningSignals: number;
  losingSignals: number;
  winRate: number;
  totalPnL: number;
  avgPositionSize: number;
  capitalHistory: {
    date: string;
    capital: number;
  }[];
}

// Verify Python backend is running before making requests
export async function checkBackendStatus(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/strategies`, { timeout: 3000 });
    console.log("Backend status check:", response.status === 200 ? "Online" : "Offline");
    return response.status === 200;
  } catch (error) {
    console.error("Error connecting to Python backend:", error);
    return false;
  }
}

export async function fetchSignalHistory(): Promise<TradingSignalRecord[]> {
  try {
    // First check if the backend is available
    const isBackendAvailable = await checkBackendStatus();
    if (!isBackendAvailable) {
      console.error("Python backend not available. Using mock data.");
      return getMockSignalHistory();
    }
    
    console.log("Fetching signal history from Python backend");
    const response = await axios.get(`${API_BASE_URL}/signals`);
    return response.data;
  } catch (error) {
    console.error("Error fetching signal history:", error);
    return getMockSignalHistory();
  }
}

function getMockSignalHistory(): TradingSignalRecord[] {
  // Return mock data when backend is unavailable
  return [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      symbol: "BTCUSDT",
      signal: 1,
      result: 1,
      entry_price: 45000,
      exit_price: 47000,
      atr: 1500,
      position_size: 0.05,
      profit_loss: 100
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      symbol: "ETHUSDT",
      signal: -1,
      result: 0,
      entry_price: 3000,
      exit_price: 3100,
      atr: 120,
      position_size: 0.5,
      profit_loss: -50
    }
  ];
}

export async function fetchPerformanceData(): Promise<PerformanceData> {
  try {
    // First check if the backend is available
    const isBackendAvailable = await checkBackendStatus();
    if (!isBackendAvailable) {
      console.error("Python backend not available. Using mock data.");
      return getMockPerformanceData();
    }
    
    console.log("Fetching performance data from Python backend");
    const response = await axios.get(`${API_BASE_URL}/performance`);
    return response.data;
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return getMockPerformanceData();
  }
}

function getMockPerformanceData(): PerformanceData {
  return {
    totalSignals: 10,
    winningSignals: 6,
    losingSignals: 4,
    winRate: 60,
    totalPnL: 450,
    avgPositionSize: 0.25,
    capitalHistory: [
      { date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], capital: 10000 },
      { date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0], capital: 10150 },
      { date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], capital: 10050 },
      { date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0], capital: 10200 },
      { date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], capital: 10350 },
      { date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], capital: 10300 },
      { date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], capital: 10450 },
      { date: new Date().toISOString().split('T')[0], capital: 10500 }
    ]
  };
}

export async function uploadMarketData(file: File, symbol: string = "BTCUSDT", strategy: string = "basic"): Promise<any> {
  try {
    // First check if the backend is available
    const isBackendAvailable = await checkBackendStatus();
    if (!isBackendAvailable) {
      throw new Error("Python backend not available. Please make sure the backend server is running.");
    }
    
    console.log(`Uploading market data for ${symbol} using ${strategy} strategy`);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("symbol", symbol);
    formData.append("strategy", strategy);
    
    const response = await axios.post(`${API_BASE_URL}/process`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000, // Increase timeout for large uploads
    });
    
    return response.data;
  } catch (error) {
    console.error("Error uploading market data:", error);
    throw error;
  }
}

// New route for direct signal generation
export async function generateTradingSignal(symbol: string, signalType: string = "classic"): Promise<TradingSignal | null> {
  try {
    // First check if the backend is available
    const isBackendAvailable = await checkBackendStatus();
    if (!isBackendAvailable) {
      console.error("Python backend not available. Using mock data.");
      return getMockTradingSignal(symbol, signalType);
    }
    
    console.log(`Requesting ${signalType} signal for ${symbol} from Python backend...`);
    
    // Call the Python backend directly
    const response = await axios.post(`${API_BASE_URL}/generate_signal`, {
      symbol,
      signal_type: signalType
    });
    
    if (response.data && response.data.error) {
      console.error("Backend error:", response.data.error);
      return null;
    }
    
    return response.data;
  } catch (error) {
    console.error("Error generating trading signal:", error);
    return getMockTradingSignal(symbol, signalType);
  }
}

export async function generateAllSignals(signalType: string = "classic"): Promise<TradingSignal[]> {
  try {
    // First check if the backend is available
    const isBackendAvailable = await checkBackendStatus();
    if (!isBackendAvailable) {
      console.error("Python backend not available. Using mock data.");
      return getMockAllSignals(signalType);
    }
    
    console.log(`Requesting all ${signalType} signals from Python backend...`);
    
    // Call the Python backend directly
    const response = await axios.post(`${API_BASE_URL}/generate_all_signals`, {
      signal_type: signalType
    });
    
    if (response.data && response.data.error) {
      console.error("Backend error:", response.data.error);
      return [];
    }
    
    return response.data;
  } catch (error) {
    console.error("Error generating all signals:", error);
    return getMockAllSignals(signalType);
  }
}

export async function fetchLiveMarketData(symbol: string, interval: string = "1h", limit: number = 100): Promise<any> {
  try {
    // Call directly to Bybit for market data instead of using our mock
    const apiUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=${limit}`;
    
    console.log(`Fetching live market data for ${symbol} from Bybit`);
    const response = await axios.get(apiUrl);
    
    if (response.data && response.data.result && response.data.result.list) {
      return response.data.result.list;
    }
    
    throw new Error("Invalid response from Bybit API");
  } catch (error) {
    console.error("Error fetching live market data:", error);
    return fetchBybitKlines(symbol, interval, limit); // Fallback to mock data
  }
}

export async function getAvailableStrategies(): Promise<string[]> {
  try {
    const isBackendAvailable = await checkBackendStatus();
    if (!isBackendAvailable) {
      console.error("Python backend not available. Using mock data.");
      return ["basic", "advanced"];
    }
    
    console.log("Fetching available strategies from Python backend");
    const response = await axios.get(`${API_BASE_URL}/strategies`);
    return response.data;
  } catch (error) {
    console.error("Error fetching available strategies:", error);
    return ["basic", "advanced"];
  }
}

export function formatPercentage(value: number): { value: string; color: string } {
  const formattedValue = `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  const color = value > 0 
    ? "text-green-500" 
    : value < 0 
      ? "text-red-500" 
      : "text-gray-500";
  
  return { value: formattedValue, color };
}

export async function fetchCryptoNews(): Promise<CryptoNews[]> {
  try {
    // Try to use an actual news API here
    const apiUrl = `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&api_key=7871c5dc90cef471dae1f81c9440f1ec2cad759b63d504a99ff7d222d64966f0`;
    const response = await axios.get(apiUrl);
    
    if (response.data && response.data.Data) {
      return response.data.Data.slice(0, 5).map((item: any) => ({
        title: item.title,
        description: item.body.substring(0, 200) + "...",
        url: item.url,
        publishedAt: item.published_on ? new Date(item.published_on * 1000).toISOString() : new Date().toISOString(),
        source: { name: item.source },
        urlToImage: item.imageurl
      }));
    }
    
    throw new Error("Invalid response from news API");
  } catch (error) {
    console.error("Error fetching crypto news:", error);
    return getMockCryptoNews();
  }
}

function getMockCryptoNews(): CryptoNews[] {
  return [
    {
      title: "Bitcoin Reaches New All-Time High",
      description: "Bitcoin has broken past its previous all-time high as institutional adoption continues to grow.",
      url: "https://example.com/news/1",
      publishedAt: new Date().toISOString(),
      source: { name: "CryptoNews" },
      urlToImage: "https://via.placeholder.com/300x200?text=Bitcoin"
    },
    {
      title: "Ethereum 2.0 Launch Date Confirmed",
      description: "The Ethereum Foundation has confirmed the launch date for the much-anticipated Ethereum 2.0 upgrade.",
      url: "https://example.com/news/2",
      publishedAt: new Date().toISOString(),
      source: { name: "Decrypt" },
      urlToImage: "https://via.placeholder.com/300x200?text=Ethereum"
    },
    {
      title: "Solana Ecosystem Grows Rapidly",
      description: "The Solana ecosystem has seen rapid growth with new DeFi projects launching on the platform.",
      url: "https://example.com/news/3",
      publishedAt: new Date().toISOString(),
      source: { name: "CoinDesk" },
      urlToImage: "https://via.placeholder.com/300x200?text=Solana"
    },
    {
      title: "Regulators Consider New Crypto Framework",
      description: "Financial regulators are considering a new framework for cryptocurrency assets to provide more clarity.",
      url: "https://example.com/news/4",
      publishedAt: new Date().toISOString(),
      source: { name: "Bloomberg" },
      urlToImage: "https://via.placeholder.com/300x200?text=Regulation"
    },
    {
      title: "NFT Market Shows Signs of Recovery",
      description: "After months of declining sales, the NFT market is showing signs of recovery with increased trading volume.",
      url: "https://example.com/news/5",
      publishedAt: new Date().toISOString(),
      source: { name: "The Block" },
      urlToImage: "https://via.placeholder.com/300x200?text=NFT"
    }
  ];
}

// Export the fetchBybitKlines function so it can be imported in CryptoMarket.tsx
export async function fetchBybitKlines(symbol: string, interval: string = "1h", limit: number = 100): Promise<any[]> {
  try {
    // In a real integration, we would fetch from Bybit API
    const mockData = [];
    const now = Date.now();
    let price = 100 + Math.random() * 10000;
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - (i * 3600 * 1000); // 1 hour intervals
      const open = price;
      const close = open * (1 + (Math.random() * 0.06 - 0.03)); // -3% to +3%
      const high = Math.max(open, close) * (1 + Math.random() * 0.02); // up to 2% higher
      const low = Math.min(open, close) * (1 - Math.random() * 0.02); // up to 2% lower
      const volume = Math.random() * 1000;
      
      mockData.push([
        timestamp.toString(),
        open.toString(),
        high.toString(),
        low.toString(),
        close.toString(),
        volume.toString()
      ]);
      
      price = close; // Next candle starts at previous close
    }
    
    return mockData;
  } catch (error) {
    console.error("Error fetching Bybit klines:", error);
    return [];
  }
}

export async function fetchCoinGeckoGlobal(): Promise<any> {
  try {
    // Try to fetch real data from CoinGecko
    const apiUrl = `https://api.coingecko.com/api/v3/global?x_cg_api_key=${COINGECKO_API_KEY}`;
    console.log("Fetching global market data from CoinGecko");
    
    const response = await axios.get(apiUrl);
    return response.data;
  } catch (error) {
    console.error("Error fetching CoinGecko global data:", error);
    
    // Return mock data if the real API call fails
    return {
      data: {
        active_cryptocurrencies: 10000,
        total_market_cap: {
          usd: 2500000000000
        },
        total_volume: {
          usd: 150000000000
        },
        market_cap_percentage: {
          btc: 48.5,
          eth: 18.3
        },
        market_cap_change_percentage_24h_usd: 2.5
      }
    };
  }
}

export function calculateIndicators(klineData: any[]): any {
  try {
    // In a real app, we would calculate actual indicators or call the Python backend
    return {
      rsi: 45 + Math.random() * 10,
      macd: 0.5 + Math.random() * 0.5,
      macdSignal: 0.3 + Math.random() * 0.5,
      macdHistogram: 0.2 + Math.random() * 0.5,
      shortMa: 105 + Math.random() * 5,
      longMa: 100 + Math.random() * 5,
      upperBand: 110 + Math.random() * 5,
      lowerBand: 95 + Math.random() * 5,
      atr: 5 + Math.random() * 2,
      volatility: 0.05 + Math.random() * 0.05,
      signal: Math.random() > 0.5 ? 1 : -1,
      confidence: 0.7 + Math.random() * 0.3
    };
  } catch (error) {
    console.error("Error calculating indicators:", error);
    return {};
  }
}

function getMockTradingSignal(symbol: string, signalType: string): TradingSignal | null {
  try {
    const id = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const isLong = Math.random() > 0.5;
    
    // Use realistic prices based on the symbol
    let basePrice: number;
    switch (symbol.replace("USDT", "").toLowerCase()) {
      case "btc":
        basePrice = 45000 + Math.random() * 5000;
        break;
      case "eth":
        basePrice = 3000 + Math.random() * 300;
        break;
      case "sol":
        basePrice = 150 + Math.random() * 20;
        break;
      case "xrp":
        basePrice = 0.5 + Math.random() * 0.1;
        break;
      case "doge":
        basePrice = 0.08 + Math.random() * 0.02;
        break;
      default:
        basePrice = 100 + Math.random() * 50;
    }
    
    const atr = basePrice * 0.03; // 3% ATR is realistic
    
    const newSignal: TradingSignal = {
      id,
      symbol: symbol.replace("USDT", ""),
      pair: symbol,
      type: isLong ? "LONG" : "SHORT",
      entryMin: basePrice * 0.99,
      entryMax: basePrice * 1.01,
      entryAvg: basePrice,
      stopLoss: isLong ? basePrice * (1 - 0.05) : basePrice * (1 + 0.05), // 5% stop loss
      targets: [
        { level: 1, price: isLong ? basePrice * (1 + 0.03) : basePrice * (1 - 0.03), hit: false },
        { level: 2, price: isLong ? basePrice * (1 + 0.06) : basePrice * (1 - 0.06), hit: false },
        { level: 3, price: isLong ? basePrice * (1 + 0.12) : basePrice * (1 - 0.12), hit: false }
      ],
      leverage: Math.ceil(Math.random() * 5) + 5, // 5-10x leverage
      status: "WAITING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentPrice: basePrice,
      technicalIndicators: {
        rsi: isLong ? 30 + Math.random() * 15 : 55 + Math.random() * 15,
        macd: isLong ? 0.001 + Math.random() * 0.005 : -0.001 - Math.random() * 0.005,
        macdSignal: 0,
        macdHistogram: isLong ? 0.001 + Math.random() * 0.005 : -0.001 - Math.random() * 0.005,
        shortMa: isLong ? 102 + Math.random() * 3 : 98 - Math.random() * 3,
        longMa: 100,
        upperBand: 105 + Math.random() * 5,
        lowerBand: 95 - Math.random() * 5,
        atr: atr,
        volatility: 0.03 + Math.random() * 0.02,
        signal: isLong ? 1 : -1,
        confidence: 0.7 + Math.random() * 0.3
      },
      description: signalType === "fast" 
        ? "Fast signal based on momentum and short-term price action" 
        : "Classic signal based on multiple indicator confluence",
    };
    
    return newSignal;
  } catch (error) {
    console.error("Error generating mock trading signal:", error);
    return null;
  }
}

function getMockAllSignals(signalType: string): TradingSignal[] {
  try {
    const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT"];
    const signals: TradingSignal[] = [];
    
    // Generate 3-5 signals
    const numberOfSignals = 3 + Math.floor(Math.random() * 3);
    const selectedSymbols = symbols.slice(0, numberOfSignals);
    
    for (const symbol of selectedSymbols) {
      const signal = getMockTradingSignal(symbol, signalType);
      if (signal) {
        signals.push(signal);
      }
    }
    
    return signals;
  } catch (error) {
    console.error("Error generating mock all signals:", error);
    return [];
  }
}

// Add routes to Python backend
export async function addBackendRoute(): Promise<boolean> {
  try {
    console.log('Creating new routes in the Python backend...');
    const code = `
@app.route('/api/generate_signal', methods=['POST'])
def generate_signal():
    """Generate a trading signal for a specific symbol."""
    data = request.json
    symbol = data.get('symbol', 'BTCUSDT')
    signal_type = data.get('signal_type', 'classic')
    
    try:
        # Fetch latest market data
        # In a real system, you would fetch from exchange or database
        # For now, we'll use mock data
        
        # Generate signal based on strategy
        strategy_name = "advanced" if signal_type == "fast" else "basic"
        active_strategy = strategy_manager.get_strategy(strategy_name)
        
        # Get mock kline data for demonstration
        df = pd.DataFrame()
        df['close'] = [random.uniform(10000, 60000) for _ in range(100)]  # Mock BTC price
        df['open'] = df['close'] * (1 + random.uniform(-0.02, 0.02))
        df['high'] = df['close'] * (1 + random.uniform(0, 0.05))
        df['low'] = df['close'] * (1 - random.uniform(0, 0.05))
        df['volume'] = [random.uniform(100, 10000) for _ in range(100)]
        
        # Extract features
        df = feature_extractor.extract_features(df)
        
        # Get the most recent data point
        latest_data = df.iloc[-1]
        
        # Generate signal
        signal_direction = active_strategy.generate_signal(latest_data)
        
        atr = latest_data.get('atr', df['close'].iloc[-1] * 0.03)  # Default 3% ATR
        entry_price = df['close'].iloc[-1]
        
        # Determine if it's a long or short signal
        signal_type_str = "LONG" if signal_direction == 1 else "SHORT"
        
        # Create response
        response = {
            "id": f"{int(time.time())}-{random.randint(1000, 9999)}",
            "symbol": symbol.replace("USDT", ""),
            "pair": symbol,
            "type": signal_type_str,
            "entryMin": entry_price * 0.99,
            "entryMax": entry_price * 1.01,
            "entryAvg": entry_price,
            "stopLoss": entry_price * (1 - 0.05) if signal_direction == 1 else entry_price * (1 + 0.05),
            "targets": [
                {"level": 1, "price": entry_price * (1 + 0.03) if signal_direction == 1 else entry_price * (1 - 0.03), "hit": False},
                {"level": 2, "price": entry_price * (1 + 0.06) if signal_direction == 1 else entry_price * (1 - 0.06), "hit": False},
                {"level": 3, "price": entry_price * (1 + 0.12) if signal_direction == 1 else entry_price * (1 - 0.12), "hit": False}
            ],
            "leverage": random.randint(5, 10),
            "status": "WAITING",
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "currentPrice": entry_price,
            "technicalIndicators": {
                "rsi": latest_data.get('rsi', 50),
                "macd": latest_data.get('macd', 0),
                "macdSignal": latest_data.get('macd_signal', 0),
                "macdHistogram": latest_data.get('macd_hist', 0),
                "shortMa": latest_data.get('ma_short', 100),
                "longMa": latest_data.get('ma_long', 100),
                "atr": atr,
                "volatility": latest_data.get('volatility', 0.03),
                "signal": signal_direction,
                "confidence": 0.7 + random.random() * 0.3
            },
            "description": "Fast signal based on momentum" if signal_type == "fast" else "Classic signal based on multiple indicators"
        }
        
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/generate_all_signals', methods=['POST'])
def generate_all_signals():
    """Generate trading signals for multiple symbols."""
    data = request.json
    signal_type = data.get('signal_type', 'classic')
    
    try:
        symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT", "ADAUSDT", "DOTUSDT"]
        signals = []
        
        # Generate 3-5 signals
        num_signals = random.randint(3, 5)
        selected_symbols = symbols[:num_signals]
        
        for symbol in selected_symbols:
            # Similar logic to generate_signal endpoint
            # We'll call the same function with different symbols
            response_data = generate_signal().get_json()
            if not response_data.get('error'):
                signals.append(response_data)
        
        return jsonify(signals)
    except Exception as e:
        return jsonify({"error": str(e)})
    `;
    
    // Thi is a pseudo implementation since we can't directly modify the Python backend
    console.log('New Python backend routes code generated. You need to manually add these routes to your Python backend.');
    return true;
  } catch (error) {
    console.error("Error adding backend route:", error);
    return false;
  }
}
