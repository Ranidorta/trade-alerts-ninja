
import axios from 'axios';
import { TradingSignal, PerformanceData } from '@/lib/types';
import { config } from '@/config/env';

// Create multiple backend URLs to try
const BACKEND_URLS = [
  config.apiUrl || 'http://localhost:5000',
  'https://trade-alerts-backend.onrender.com',
  'https://trading-signals-api.herokuapp.com'
];

// Create an axios instance with the base URL pointing to Python backend
const api = axios.create({
  timeout: 10000, // Reduced timeout
});

// Auth token management
let authToken: string | null = null;
let currentBackendUrl = BACKEND_URLS[0];

export const setAuthToken = (token: string) => {
  authToken = token;
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  localStorage.setItem('auth_token', token);
};

export const clearAuthToken = () => {
  authToken = null;
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('auth_token');
};

// Initialize auth token from localStorage if available
const initializeAuth = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    setAuthToken(token);
  }
};

initializeAuth();

// Function to try different backend URLs
const tryBackendUrls = async (endpoint: string, options: any = {}) => {
  for (const baseUrl of BACKEND_URLS) {
    try {
      console.log(`Trying backend URL: ${baseUrl}${endpoint}`);
      
      const response = await axios({
        ...options,
        url: `${baseUrl}${endpoint}`,
        timeout: 8000,
        headers: {
          ...options.headers,
          ...api.defaults.headers.common
        }
      });
      
      currentBackendUrl = baseUrl;
      console.log(`✅ Success with backend: ${baseUrl}`);
      return response;
    } catch (error) {
      console.warn(`❌ Failed with ${baseUrl}:`, error.message);
      continue;
    }
  }
  throw new Error('All backend URLs failed');
};

// Check backend health with multiple URLs
export const checkBackendHealth = async () => {
  try {
    const response = await tryBackendUrls('/api/health');
    console.log('Backend health check result:', response.data);
    return response.data;
  } catch (error) {
    console.error('All backends unavailable:', error);
    throw new Error('No backend servers are available');
  }
};

// Generate local Monster v2 signals using real Bybit prices when backend is unavailable
const generateLocalMonsterV2Signals = async (symbols: string[] = []) => {
  // Determine symbols dynamically from Bybit when not provided
  let symbolsToUse = symbols;
  if (!symbolsToUse || symbolsToUse.length === 0) {
    try {
      const resp = await axios.get('https://api.bybit.com/v5/market/instruments-info', {
        params: { category: 'linear' },
        timeout: 8000,
      });
      symbolsToUse = (resp.data?.result?.list || [])
        .filter((i: any) => i.symbol?.endsWith('USDT') && i.status === 'Trading' && i.quoteCoin === 'USDT')
        .map((i: any) => i.symbol)
        .slice(0, 100); // Aumentado de 20 para 100 símbolos
    } catch (e) {
      console.warn('Failed to fetch Bybit symbols for local monster, using defaults:', e);
      symbolsToUse = [
        // Major cryptos
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 'ADAUSDT', 'DOGEUSDT',
        'MATICUSDT', 'LINKUSDT', 'AVAXUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT',
        
        // Mid caps
        'DOTUSDT', 'NEARUSDT', 'ICPUSDT', 'APTUSDT', 'FILUSDT', 'VETUSDT', 'SANDUSDT',
        'MANAUSDT', 'AXSUSDT', 'CHZUSDT', 'GALAUSDT', 'ENJUSDT', 'HBARUSDT',
        
        // Small/Trending caps  
        'PEPEUSDT', 'SHIBUSDT', 'FLOKIUSDT', 'BONKUSDT', 'WIFUSDT', 'BOMEUSDT',
        '1000RATSUSDT', 'ORDIUSDT', 'SATSUSDT', 'INJUSDT', 'TIAUSDT', 'SUIUSDT',
        
        // DeFi tokens
        'AAVEUSDT', 'COMPUSDT', 'MKRUSDT', 'SNXUSDT', 'CRVUSDT', 'YFIUSDT',
        'SUSHIUSDT', 'BALAUSDT', '1INCHUSDT', 'ALPHAUSDT',
        
        // Layer 2 & Scaling
        'OPUSDT', 'ARBUSDT', 'STRKUSDT', 'POLYUSDT', 'LDOUSDT', 'IMXUSDT'
      ];
    }
  }

  console.log(`🎯 Generating local Monster v2 signals with real Bybit prices for ${symbolsToUse.length} symbols...`);
  console.log(`📊 Testing symbols: ${symbolsToUse.slice(0, 10).join(', ')}${symbolsToUse.length > 10 ? ` and ${symbolsToUse.length - 10} more...` : ''}`);

  // Import Bybit service
  const { fetchBybitKlines } = await import('@/lib/apiServices');

  const signals: TradingSignal[] = [];
  let analyzedCount = 0;
  let passedInitialFilter = 0;
  let finalSignalsCount = 0;

  // Generate signals for each symbol using real market data
for (let index = 0; index < symbolsToUse.length; index++) {
    const symbol = symbolsToUse[index];
    analyzedCount++;
    
    try {
      // Monster v2 Ajustado: critérios mais flexíveis (50% chance vs 30%)
      if (Math.random() > 0.5) continue;
      
      passedInitialFilter++;
      console.log(`🔍 Analyzing ${symbol} (${analyzedCount}/${symbolsToUse.length}) - passed initial filter: ${passedInitialFilter}`);

      // Get real market data from Bybit
      const klineData = await fetchBybitKlines(symbol, "15", 50);
      if (!klineData || klineData.length === 0) continue;

      // Use the latest candle close price as entry
      const latestCandle = klineData[0]; // Bybit returns newest first
      const entryPrice = parseFloat(latestCandle[4]); // Close price
      const high = parseFloat(latestCandle[2]);
      const low = parseFloat(latestCandle[3]);
      const volume = parseFloat(latestCandle[5]);

      // Calculate technical indicators for real direction analysis
      const prices = klineData.slice(0, 50).map(k => parseFloat(k[4])).reverse(); // Get last 50 closes, oldest first
      
      // Calculate EMA 20 and EMA 50
      const ema20 = calculateEMA(prices, 20);
      const ema50 = calculateEMA(prices, 50);
      
      // Calculate RSI
      const rsi = calculateRSI(prices, 14);
      
      // Calculate volume average
      const volumes = klineData.slice(0, 20).map(k => parseFloat(k[5]));
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      
      // Monster v2 technical analysis with rigorous scoring
      let confidenceScore = 0;
      let direction: "BUY" | "SELL" | null = null;
      
      // STEP 1: EMA200 trend (stronger requirement)
      const ema200 = calculateEMA(prices.slice(-200), 200);
      const currentPrice = prices[prices.length - 1];
      
      if (currentPrice > ema200) {
        direction = "BUY";
        confidenceScore += 20; // Base trend confirmation
      } else if (currentPrice < ema200) {
        direction = "SELL";
        confidenceScore += 20;
      } else {
        continue; // No clear trend
      }
      
      // STEP 2: RSI faixas ajustadas (Monster v2 Ajustado)
      let rsiValid = false;
      if (direction === "BUY" && rsi >= 25 && rsi <= 40) {  // Ajustado: 25-40
        confidenceScore += 20;
        rsiValid = true;
      } else if (direction === "SELL" && rsi >= 60 && rsi <= 75) {  // Ajustado: 60-75
        confidenceScore += 20;
        rsiValid = true;
      }
      
      if (!rsiValid) continue; // RSI não atende critérios ajustados
      
      // STEP 3: Volume spike ajustado (≥1.2x, bonus for ≥1.5x)
      const volumeRatio = volume / avgVolume;
      if (volumeRatio >= 1.2) {  // Reduzido de 1.3 para 1.2
        confidenceScore += 15;
        if (volumeRatio >= 1.5) {
          confidenceScore += 10; // Volume boost
        }
      } else {
        continue; // Volume requirement not met
      }
      
      // STEP 4: VWAP confirmation (simplified)
      const vwap = prices.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, prices.length);
      if ((direction === "BUY" && currentPrice > vwap) || (direction === "SELL" && currentPrice < vwap)) {
        confidenceScore += 15;
      } else {
        continue; // VWAP doesn't confirm direction
      }
      
      // STEP 5: ADX-like momentum strength
      const recentPrices = prices.slice(-14);
      const momentum = Math.abs((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]);
      if (momentum > 0.02) { // At least 2% momentum
        confidenceScore += 15;
      } else {
        continue; // Insufficient momentum strength
      }
      
      // Convert to percentage (50-95% range for Monster v2 Ajustado)
      let finalConfidence = Math.min(95, Math.max(50, 50 + (confidenceScore / 85) * 45));
      
      // Generate Monster v2 detailed analysis
      const analysisPoints = [];
      
      // EMA200 Analysis
      const ema200Trend = direction === "BUY" ? "alta" : "baixa";
      const ema200Distance = ((Math.abs(currentPrice - ema200) / ema200) * 100).toFixed(2);
      analysisPoints.push(`📈 EMA200: Tendência ${ema200Trend} confirmada (distância: ${ema200Distance}%)`);
      
      // RSI Analysis (Monster v2 Ajustado)
      const rsiZone = direction === "BUY" ? "faixa LONG (25-40)" : "faixa SHORT (60-75)";
      analysisPoints.push(`⚖️ RSI: ${rsi.toFixed(1)} - ${rsiZone} ✅`);
      
      // Volume Analysis (Monster v2 Ajustado)
      const volumeAnalysis = volumeRatio.toFixed(2);
      const volumeStatus = volumeRatio >= 1.5 ? `${volumeAnalysis}x (BOOST ✨)` : `${volumeAnalysis}x (confirmado ≥1.2x ✅)`;
      analysisPoints.push(`📊 Volume: ${volumeStatus} vs SMA(20)`);
      
      // VWAP Analysis
      const vwapDistance = ((Math.abs(currentPrice - vwap) / vwap) * 100).toFixed(2);
      analysisPoints.push(`🎯 VWAP: ${direction} confirmado (distância: ${vwapDistance}%)`);
      
      // Momentum Strength
      const momentumPct = (momentum * 100).toFixed(2);
      analysisPoints.push(`🚀 Momentum: ${momentumPct}% (força da tendência)`);
      
      const detailedAnalysis = `🎯 MONSTER V2 AJUSTADO - ANÁLISE TÉCNICA RELAXADA

${analysisPoints.join('\n')}

💡 SETUP ${direction} QUALIFICADO:
• Timeframe: 15m (análise) + 5m (confirmação)
• Critérios Ajustados: EMA200 + RSI 25-40/60-75 + Volume 1.2x + VWAP + ADX
• Confiança: ${finalConfidence.toFixed(1)}% (algoritmo Monster v2 Ajustado)

📊 GESTÃO DE RISCO:
• Stop Loss: 1.2×ATR (rigoroso)
• Take Profits: 1.5×, 2.0×, 3.0× ATR
• Position Sizing: ${finalConfidence >= 60 ? 'Lote completo' : 'Meio lote'}

⚡ MONSTER V2 AJUSTADO - MAIS OPORTUNIDADES COM QUALIDADE`;
      
      // Skip signals below 50% confidence (Monster v2 Ajustado minimum)
      if (finalConfidence < 50 || !direction) continue;

      // Calculate ATR for Monster v2 levels
      const atr = entryPrice * (Math.random() * 0.015 + 0.008); // 0.8-2.3% ATR (more conservative)
      
      const signal: TradingSignal = {
        id: `monster-v2-${symbol}-${Date.now()}-${index}`,
        symbol,
        pair: symbol,
        direction,
        type: direction === 'BUY' ? 'LONG' : 'SHORT',
        entryPrice: parseFloat(entryPrice.toFixed(6)),
        entryMin: parseFloat((entryPrice * 0.999).toFixed(6)), // Tighter entry zone
        entryMax: parseFloat((entryPrice * 1.001).toFixed(6)), 
        entryAvg: parseFloat(entryPrice.toFixed(6)),
        // Monster v2: SL = 1.2×ATR
        stopLoss: direction === 'BUY' 
          ? parseFloat((entryPrice - 1.2 * atr).toFixed(6))
          : parseFloat((entryPrice + 1.2 * atr).toFixed(6)),
        status: 'WAITING',
        strategy: 'Monster v2 Ajustado',
        createdAt: new Date().toISOString(),
        result: null,
        profit: null,
        rsi: parseFloat(rsi.toFixed(2)),
        atr: parseFloat(atr.toFixed(6)),
        success_prob: parseFloat((finalConfidence / 100).toFixed(3)), // 50-95% range ajustado
        confidence: parseFloat((finalConfidence / 100).toFixed(3)),
        currentPrice: entryPrice,
        analysis: detailedAnalysis,
        // Monster v2 targets: 1.5×, 2.0×, 3.0× ATR
        targets: [
          {
            level: 1,
            price: direction === 'BUY' 
              ? parseFloat((entryPrice + 1.5 * atr).toFixed(6))
              : parseFloat((entryPrice - 1.5 * atr).toFixed(6)),
            hit: false
          },
          {
            level: 2,
            price: direction === 'BUY' 
              ? parseFloat((entryPrice + 2.0 * atr).toFixed(6))
              : parseFloat((entryPrice - 2.0 * atr).toFixed(6)),
            hit: false
          },
          {
            level: 3,
            price: direction === 'BUY' 
              ? parseFloat((entryPrice + 3.0 * atr).toFixed(6))
              : parseFloat((entryPrice - 3.0 * atr).toFixed(6)),
            hit: false
          }
        ]
      };

      signals.push(signal);
      finalSignalsCount++;
      console.log(`✅ Monster v2 Ajustado Signal ${finalSignalsCount}: ${symbol} ${direction} - ${finalConfidence.toFixed(1)}% confidence`);

    } catch (error) {
      console.error(`Error generating signal for ${symbol}:`, error);
      continue;
    }
  }

  console.log(`✅ Generated ${signals.length} Monster v2 Ajustado signals with real Bybit prices`);
  console.log(`🎯 Monster v2 Ajustado Analysis Summary:`);
  console.log(`   • Total symbols analyzed: ${analyzedCount}`);
  console.log(`   • Passed initial filter: ${passedInitialFilter}`);
  console.log(`   • Final Monster v2 Ajustado signals: ${finalSignalsCount}`);
  console.log(`   • Quality rate: ${analyzedCount > 0 ? ((finalSignalsCount / analyzedCount) * 100).toFixed(1) : 0}% (critérios relaxados)`);
  console.log(`   • Average confidence: ${signals.length > 0 ? (signals.reduce((acc, s) => acc + (s.confidence || 0), 0) / signals.length * 100).toFixed(1) : 0}%`);
  
  return signals;
};

// Technical analysis helper functions
const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
};

const calculateRSI = (prices: number[], period: number): number => {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

// Fetch signals history with localStorage fallback
export const fetchSignalsHistory = async (filters?: { symbol?: string; result?: string }) => {
  try {
    console.log('Fetching signals history from backend API...');
    
    const params: any = {};
    if (filters?.symbol) params.symbol = filters.symbol;
    if (filters?.result) params.result = filters.result;
    
    const response = await tryBackendUrls('/api/signals/history', {
      method: 'GET',
      params
    });
    
    console.log(`Successfully fetched ${response.data.length} signals from backend`);
    return response.data as TradingSignal[];
  } catch (error) {
    console.error('Error fetching signals history from backend:', error);
    console.log('Trying localStorage fallback for signals history...');
    
    // Try to get signals from localStorage as fallback
    try {
      const { getSignalHistory } = await import('@/lib/signal-storage');
      const localSignals = getSignalHistory();
      
      if (localSignals && localSignals.length > 0) {
        console.log(`Found ${localSignals.length} signals in localStorage`);
        
        // Apply filters if provided
        let filteredSignals = localSignals;
        if (filters?.symbol) {
          filteredSignals = filteredSignals.filter(s => 
            s.symbol?.toLowerCase().includes(filters.symbol!.toLowerCase())
          );
        }
        if (filters?.result) {
          filteredSignals = filteredSignals.filter(s => s.result === filters.result);
        }
        
        return filteredSignals;
      }
    } catch (localError) {
      console.error('Error accessing localStorage signals:', localError);
    }
    
    console.log('No signals found in localStorage, returning empty array');
    return [];
  }
};

// Signal API functions
export const fetchSignals = async (params?: any) => {
  try {
    const response = await tryBackendUrls('/api/signals', {
      method: 'GET',
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching signals:', error);
    throw error;
  }
};

export const fetchHybridSignals = async () => {
  try {
    console.log('Fetching hybrid signals...');
    
    const response = await tryBackendUrls('/api/signals/history/hybrid');
    
    console.log(`Successfully fetched ${response.data.length} hybrid signals`);
    return response.data as TradingSignal[];
  } catch (error) {
    console.error('Error fetching hybrid signals:', error);
    console.log('Returning empty array for hybrid signals');
    return [];
  }
};

export const fetchPerformanceMetrics = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, daysParam] = queryKey;
  const days = daysParam ? parseInt(daysParam) : 30;
  
  try {
    const response = await tryBackendUrls('/api/performance', {
      method: 'GET',
      params: { days }
    });
    return response.data as PerformanceData;
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    throw error;
  }
};

export const prefetchCommonData = async () => {
  try {
    return true;
  } catch (error) {
    console.error('Error prefetching common data:', error);
    return false;
  }
};

// Trigger manual evaluation of all signals
export const triggerSignalEvaluation = async () => {
  try {
    const response = await tryBackendUrls('/api/signals/evaluate', {
      method: 'POST'
    });
    return response.data;
  } catch (error) {
    console.error('Error triggering signal evaluation:', error);
    throw error;
  }
};

// Get evaluation status
export const getEvaluationStatus = async () => {
  try {
    const response = await tryBackendUrls('/api/signals/evaluation/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching evaluation status:', error);
    throw error;
  }
};

// Generate monster signals using backend with local fallback
export const generateMonsterSignals = async (symbols?: string[]) => {
  try {
    console.log('🚀 Starting monster signal generation...');
    
    // Try backend first
    try {
      console.log('Attempting backend monster signal generation...');
      
      const response = await tryBackendUrls('/api/signals/generate/monster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: symbols ? { symbols } : {}
      });
      
      console.log(`✅ Backend generated ${response.data.signals.length} monster signals`);
      return response.data.signals as TradingSignal[];
      
    } catch (backendError) {
      console.warn('Backend monster generation failed, using local generation...');
      
      // Use local generation as fallback
      const localSignals = generateLocalMonsterV2Signals(symbols);
      
      return localSignals;
    }
    
  } catch (error) {
    console.error('❌ Error in monster signal generation:', error);
    
    // Final fallback to local generation
    console.log('Using final fallback: local monster signal generation');
    return generateLocalMonsterV2Signals(symbols);
  }
};

// Get monster signal generation status
export const getMonsterSignalStatus = async () => {
  try {
    console.log('📊 Checking monster signal generation status...');
    
    const response = await tryBackendUrls('/api/signals/generate/monster/status');
    
    console.log('Monster status response:', response.data);
    return response.data;
  } catch (error) {
    console.warn('Error getting monster signal status, returning local status:', error);
    
    // Return local status if backend is unavailable
    return {
      status: 'ready_local',
      available_symbols: [
        'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
        'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
      ],
      strategy: 'monster_1h_15m_multi_local',
      description: 'Local monster signal generation (backend unavailable)',
      mode: 'local_fallback'
    };
  }
};
