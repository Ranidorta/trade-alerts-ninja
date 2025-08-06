import axios from 'axios';
import { TradingSignal, SignalDirection } from '@/lib/types';

// Bybit API for Classic Crypto Pro V3 signals
const BYBIT_API_BASE = 'https://api.bybit.com/v5';

// Create axios instance for API calls
const classicCryptoProApi = axios.create({
  timeout: 15000,
});

// ML Training data storage
interface MLTrainingData {
  ema_ratio: number;
  rsi: number;
  volume: number;
  book_ratio: number;
  candle_score: number;
  label: number; // 0=LOSER, 1=WINNER
}

let mlTrainingData: MLTrainingData[] = [];
let mlModel: any = null;

// Signal cooldown tracker (prevent duplicates)
const signalCooldown = new Map<string, number>();
const lossTracker = new Map<string, number>(); // Track consecutive losses

// Get ALL Bybit USDT Futures symbols (including indices)
const getBybitFuturesSymbols = async (): Promise<string[]> => {
  try {
    const response = await classicCryptoProApi.get(`${BYBIT_API_BASE}/market/instruments-info`, {
      params: { category: 'linear' }
    });
    
    const symbols = response.data.result.list
      .filter((instrument: any) => 
        instrument.symbol.endsWith('USDT') && 
        instrument.status === 'Trading' &&
        instrument.quoteCoin === 'USDT'
      )
      .map((instrument: any) => instrument.symbol)
      .sort((a: string, b: string) => {
        // Prioritize major pairs
        const majorPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT'];
        const aIsMajor = majorPairs.includes(a);
        const bIsMajor = majorPairs.includes(b);
        if (aIsMajor && !bIsMajor) return -1;
        if (!aIsMajor && bIsMajor) return 1;
        return a.localeCompare(b);
      });
    
    console.log(`📊 Found ${symbols.length} Bybit futures symbols`);
    return symbols;
  } catch (error) {
    console.warn('Failed to fetch Bybit symbols, using defaults:', error);
    return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT', 'AVAXUSDT'];
  }
};

// Get Bybit kline data
const getBybitKlines = async (symbol: string, interval: string, limit: number = 200) => {
  try {
    const response = await classicCryptoProApi.get(`${BYBIT_API_BASE}/market/kline`, {
      params: {
        category: 'linear',
        symbol: symbol,
        interval: interval,
        limit: limit
      }
    });
    
    return response.data.result.list || [];
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error);
    return [];
  }
};

// Get Bybit order book
const getBybitOrderBook = async (symbol: string) => {
  try {
    const response = await classicCryptoProApi.get(`${BYBIT_API_BASE}/market/orderbook`, {
      params: {
        category: 'linear',
        symbol: symbol,
        limit: 25
      }
    });
    
    return response.data.result || null;
  } catch (error) {
    console.error(`Error fetching order book for ${symbol}:`, error);
    return null;
  }
};

// Technical indicators
const calculateEMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
};

const calculateRSI = (prices: number[], period: number = 14): number => {
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

const calculateVWAP = (klines: any[]): number => {
  let totalVolume = 0;
  let totalPriceVolume = 0;
  
  for (const kline of klines.slice(-20)) { // Last 20 candles
    const volume = parseFloat(kline[5]);
    const typical = (parseFloat(kline[2]) + parseFloat(kline[3]) + parseFloat(kline[4])) / 3;
    totalVolume += volume;
    totalPriceVolume += typical * volume;
  }
  
  return totalVolume > 0 ? totalPriceVolume / totalVolume : 0;
};

const calculateATR = (klines: any[], period: number = 14): number => {
  if (klines.length < period + 1) return 0;
  
  let atrSum = 0;
  for (let i = 1; i < Math.min(period + 1, klines.length); i++) {
    const high = parseFloat(klines[i][2]);
    const low = parseFloat(klines[i][3]);
    const prevClose = parseFloat(klines[i + 1][4]);
    
    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    atrSum += trueRange;
  }
  
  return atrSum / period;
};

// 🔍 VALIDATION MODULE 1: EMA Cross
const validateEmaCross = (klines1m: any[], klines5m: any[]): { score: number; data: any } => {
  const prices1m = klines1m.map(k => parseFloat(k[4])).reverse();
  const prices5m = klines5m.map(k => parseFloat(k[4])).reverse();
  
  const ema9_1m = calculateEMA(prices1m, 9);
  const ema21_1m = calculateEMA(prices1m, 21);
  const ema9_5m = calculateEMA(prices5m, 9);
  const ema21_5m = calculateEMA(prices5m, 21);
  
  // Check for alignment
  const bullishAlignment = ema9_1m > ema21_1m && ema9_5m > ema21_5m;
  const bearishAlignment = ema9_1m < ema21_1m && ema9_5m < ema21_5m;
  
  const score = (bullishAlignment || bearishAlignment) ? 0.85 : 0.0;
  const direction = bullishAlignment ? 'BUY' : bearishAlignment ? 'SELL' : 'NEUTRAL';
  
  return {
    score,
    data: { direction, ema9_1m, ema21_1m, ema9_5m, ema21_5m }
  };
};

// 🔍 VALIDATION MODULE 2: Volume Spike + Anomaly
const validateVolumeSpike = (klines1m: any[], klines5m: any[]): { score: number; data: any } => {
  const volumes1m = klines1m.map(k => parseFloat(k[5])).reverse();
  const volumes5m = klines5m.map(k => parseFloat(k[5])).reverse();
  
  const avgVolume1m = volumes1m.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const avgVolume5m = volumes5m.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const currentVol1m = volumes1m[volumes1m.length - 1];
  const currentVol5m = volumes5m[volumes5m.length - 1];
  
  const spike1m = currentVol1m / avgVolume1m;
  const spike5m = currentVol5m / avgVolume5m;
  
  let score = 0;
  if (spike1m > 2.0 && spike5m > 1.8) score = 0.90;
  else if (spike1m > 1.5 && spike5m > 1.3) score = 0.75;
  else if (spike1m > 1.2 || spike5m > 1.2) score = 0.50;
  
  return {
    score,
    data: { spike1m, spike5m, avgVolume1m, avgVolume5m }
  };
};

// 🔍 VALIDATION MODULE 3: Candle Reversal
const validateCandleReversal = (klines1m: any[], klines5m: any[]): { score: number; data: any } => {
  const analyzeCandle = (kline: any) => {
    const open = parseFloat(kline[1]);
    const high = parseFloat(kline[2]);
    const low = parseFloat(kline[3]);
    const close = parseFloat(kline[4]);
    
    const body = Math.abs(close - open);
    const range = high - low;
    const bodyRatio = range > 0 ? body / range : 0;
    
    // Check for reversal patterns
    const isHammer = (close > open) && (close - open) > 0.6 * range;
    const isShootingStar = (open > close) && (open - close) > 0.6 * range;
    const isDoji = bodyRatio < 0.1;
    
    return { bodyRatio, isHammer, isShootingStar, isDoji };
  };
  
  const candle1m = analyzeCandle(klines1m[0]);
  const candle5m = analyzeCandle(klines5m[0]);
  
  let score = 0;
  if (candle1m.isHammer || candle5m.isHammer) score += 0.4;
  if (candle1m.isShootingStar || candle5m.isShootingStar) score += 0.4;
  if (candle1m.bodyRatio > 0.7 && candle5m.bodyRatio > 0.6) score += 0.3;
  
  return {
    score: Math.min(score, 1.0),
    data: { candle1m, candle5m }
  };
};

// 🔍 VALIDATION MODULE 4: RSI + Momentum
const validateRsiMomentum = (klines1m: any[], klines5m: any[], klines15m: any[]): { score: number; data: any } => {
  const prices1m = klines1m.map(k => parseFloat(k[4])).reverse();
  const prices5m = klines5m.map(k => parseFloat(k[4])).reverse();
  const prices15m = klines15m.map(k => parseFloat(k[4])).reverse();
  
  const rsi1m = calculateRSI(prices1m, 14);
  const rsi5m = calculateRSI(prices5m, 14);
  const rsi15m = calculateRSI(prices15m, 14);
  
  const vwap1m = calculateVWAP(klines1m);
  const currentPrice = prices1m[prices1m.length - 1];
  
  let score = 0;
  
  // RSI confluence
  if (rsi1m > 50 && rsi5m > 50 && rsi15m > 50) score += 0.4; // Bullish momentum
  if (rsi1m < 50 && rsi5m < 50 && rsi15m < 50) score += 0.4; // Bearish momentum
  
  // VWAP position
  if (Math.abs(currentPrice - vwap1m) / currentPrice < 0.01) score += 0.3; // Near VWAP
  
  // RSI optimal range
  if (rsi15m > 45 && rsi15m < 65) score += 0.3;
  
  return {
    score: Math.min(score, 1.0),
    data: { rsi1m, rsi5m, rsi15m, vwap1m, currentPrice }
  };
};

// 🔍 VALIDATION MODULE 5: Order Book Analysis
const validateOrderBook = async (symbol: string): Promise<{ score: number; data: any }> => {
  const orderBook = await getBybitOrderBook(symbol);
  
  if (!orderBook || !orderBook.b || !orderBook.a) {
    return { score: 0, data: { error: 'No order book data' } };
  }
  
  // Calculate bid/ask liquidity
  const bidLiquidity = orderBook.b.slice(0, 10).reduce((sum: number, level: any) => sum + parseFloat(level[1]), 0);
  const askLiquidity = orderBook.a.slice(0, 10).reduce((sum: number, level: any) => sum + parseFloat(level[1]), 0);
  
  const totalLiquidity = bidLiquidity + askLiquidity;
  const liquidityRatio = totalLiquidity > 0 ? bidLiquidity / totalLiquidity : 0.5;
  
  // Calculate spread
  const bestBid = parseFloat(orderBook.b[0][0]);
  const bestAsk = parseFloat(orderBook.a[0][0]);
  const spread = (bestAsk - bestBid) / bestBid;
  
  let score = 0.5; // Base score
  
  // Tight spread bonus
  if (spread < 0.001) score += 0.3; // Very tight spread
  else if (spread < 0.002) score += 0.2;
  
  // Liquidity balance bonus
  if (liquidityRatio > 0.4 && liquidityRatio < 0.6) score += 0.2; // Balanced
  
  return {
    score: Math.min(score, 1.0),
    data: { bidLiquidity, askLiquidity, liquidityRatio, spread, bestBid, bestAsk }
  };
};

// 🔍 VALIDATION MODULE 6: ML Validator
const validateML = (features: MLTrainingData): { score: number; data: any } => {
  if (!mlModel || mlTrainingData.length < 50) {
    return { score: 0.65, data: { status: 'Not enough training data' } }; // Default score
  }
  
  try {
    // Simple ML prediction based on training data
    const similarSamples = mlTrainingData.filter(sample => 
      Math.abs(sample.ema_ratio - features.ema_ratio) < 0.1 &&
      Math.abs(sample.rsi - features.rsi) < 10 &&
      Math.abs(sample.volume - features.volume) < 0.5
    );
    
    if (similarSamples.length === 0) {
      return { score: 0.65, data: { status: 'No similar samples' } };
    }
    
    const successRate = similarSamples.filter(s => s.label === 1).length / similarSamples.length;
    return {
      score: successRate,
      data: { successRate, sampleCount: similarSamples.length }
    };
  } catch (error) {
    return { score: 0.65, data: { error: 'ML prediction failed' } };
  }
};

// 🎯 1H DIRECTIONAL FILTER (MANDATORY)
const validateDirectionalFilter = async (symbol: string): Promise<{ allowed: boolean; direction: string; data: any }> => {
  const klines1h = await getBybitKlines(symbol, '60', 50); // 1h data
  
  if (!klines1h || klines1h.length < 50) {
    return { allowed: false, direction: 'NONE', data: { error: 'Insufficient 1h data' } };
  }
  
  const prices1h = klines1h.map(k => parseFloat(k[4])).reverse();
  const ema20_1h = calculateEMA(prices1h, 20);
  const ema50_1h = calculateEMA(prices1h, 50);
  
  const lastCandle = klines1h[0]; // Most recent candle
  const candleOpen = parseFloat(lastCandle[1]);
  const candleClose = parseFloat(lastCandle[4]);
  const isGreenCandle = candleClose > candleOpen;
  const isRedCandle = candleClose < candleOpen;
  
  let allowed = false;
  let direction = 'NONE';
  
  if (ema20_1h > ema50_1h && isGreenCandle) {
    allowed = true;
    direction = 'BUY';
  } else if (ema20_1h < ema50_1h && isRedCandle) {
    allowed = true;
    direction = 'SELL';
  }
  
  return {
    allowed,
    direction,
    data: { ema20_1h, ema50_1h, candleOpen, candleClose, isGreenCandle, isRedCandle }
  };
};

// 🚫 MARKET QUALITY FILTER
const checkMarketQuality = (symbol: string): boolean => {
  const losses = lossTracker.get(symbol) || 0;
  if (losses >= 3) {
    console.log(`🚫 ${symbol} blocked due to 3 consecutive losses`);
    return false;
  }
  
  // Add macro events filter here if needed
  const currentHour = new Date().getHours();
  const forbiddenHours = [0, 1, 2, 3, 4, 5]; // Low liquidity hours
  if (forbiddenHours.includes(currentHour)) {
    console.log(`🚫 Trading blocked during low liquidity hours: ${currentHour}h`);
    return false;
  }
  
  return true;
};

// 🎯 MAIN SIGNAL GENERATION
const generateClassicCryptoProSignals = async (): Promise<TradingSignal[]> => {
  console.log('🚀 Generating Classic Crypto Pro V3 signals...');
  
  try {
    const symbols = await getBybitFuturesSymbols();
    const signals: TradingSignal[] = [];
    
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    
    for (const symbol of symbols) {
      try {
        // Check cooldown (6h between signals)
        const lastSignalTime = signalCooldown.get(symbol) || 0;
        if (lastSignalTime > sixHoursAgo) {
          continue;
        }
        
        // Market quality filter
        if (!checkMarketQuality(symbol)) {
          continue;
        }
        
        // 📊 1H DIRECTIONAL FILTER (MANDATORY)
        const directionalFilter = await validateDirectionalFilter(symbol);
        if (!directionalFilter.allowed) {
          console.log(`🚫 ${symbol}: Directional filter not passed - ${directionalFilter.direction}`);
          continue;
        }
        
        console.log(`✅ ${symbol}: Directional filter passed - ${directionalFilter.direction}`);
        
        // Fetch multi-timeframe data
        const [klines1m, klines5m, klines15m] = await Promise.all([
          getBybitKlines(symbol, '1', 50),
          getBybitKlines(symbol, '5', 50),
          getBybitKlines(symbol, '15', 100)
        ]);
        
        if (!klines1m.length || !klines5m.length || !klines15m.length) {
          console.log(`❌ ${symbol}: Insufficient data`);
          continue;
        }
        
        // 🔍 RUN ALL 6 VALIDATIONS
        const validations = {
          emaCross: validateEmaCross(klines1m, klines5m),
          volumeSpike: validateVolumeSpike(klines1m, klines5m),
          candleReversal: validateCandleReversal(klines1m, klines5m),
          rsiMomentum: validateRsiMomentum(klines1m, klines5m, klines15m),
          orderBook: await validateOrderBook(symbol),
          ml: { score: 0.65, data: {} } // Will be calculated below
        };
        
        // Prepare ML features
        const prices15m = klines15m.map(k => parseFloat(k[4])).reverse();
        const ema9 = calculateEMA(prices15m, 9);
        const ema21 = calculateEMA(prices15m, 21);
        const rsi = calculateRSI(prices15m, 14);
        const volume = parseFloat(klines15m[0][5]);
        const avgVolume = klines15m.slice(0, 20).reduce((sum, k) => sum + parseFloat(k[5]), 0) / 20;
        
        const mlFeatures: MLTrainingData = {
          ema_ratio: ema9 / ema21,
          rsi: rsi,
          volume: volume / avgVolume,
          book_ratio: validations.orderBook.data.liquidityRatio || 0.5,
          candle_score: validations.candleReversal.score,
          label: 0 // Will be updated when signal is evaluated
        };
        
        validations.ml = validateML(mlFeatures);
        
        // 📊 SCORING SYSTEM
        const weights = {
          emaCross: 0.20,
          volumeSpike: 0.18,
          candleReversal: 0.16,
          rsiMomentum: 0.18,
          orderBook: 0.13,
          ml: 0.15
        };
        
        const passedValidations = Object.values(validations).filter(v => v.score >= 0.65).length;
        const weightedScore = Object.entries(validations).reduce((total, [key, validation]) => {
          return total + (validation.score * weights[key as keyof typeof weights]);
        }, 0);
        
        console.log(`📊 ${symbol} Validations:`, {
          emaCross: validations.emaCross.score.toFixed(2),
          volumeSpike: validations.volumeSpike.score.toFixed(2),
          candleReversal: validations.candleReversal.score.toFixed(2),
          rsiMomentum: validations.rsiMomentum.score.toFixed(2),
          orderBook: validations.orderBook.score.toFixed(2),
          ml: validations.ml.score.toFixed(2),
          passed: `${passedValidations}/6`,
          totalScore: weightedScore.toFixed(3)
        });
        
        // 🎯 APPROVAL CRITERIA: Score ≥ 0.70 AND ≥ 5/6 validations
        if (weightedScore < 0.70 || passedValidations < 5) {
          console.log(`❌ ${symbol}: Criteria not met (Score: ${weightedScore.toFixed(3)}, Passed: ${passedValidations}/6)`);
          continue;
        }
        
        // 📈 CALCULATE ENTRY AND RISK MANAGEMENT
        const currentPrice = parseFloat(klines15m[0][4]);
        const atr = calculateATR(klines15m, 14);
        
        const direction = directionalFilter.direction;
        const stopLoss = direction === 'BUY' 
          ? currentPrice - (atr * 1.5)
          : currentPrice + (atr * 1.5);
        
        const tp1 = direction === 'BUY'
          ? currentPrice + (atr * 1.0)
          : currentPrice - (atr * 1.0);
        
        const tp2 = direction === 'BUY'
          ? currentPrice + (atr * 1.8)
          : currentPrice - (atr * 1.8);
        
        const tp3 = direction === 'BUY'
          ? currentPrice + (atr * 2.4)
          : currentPrice - (atr * 2.4);
        
        // 🎯 R/R CHECK: Minimum 1.3 ratio
        const riskReward = Math.abs(tp1 - currentPrice) / Math.abs(currentPrice - stopLoss);
        if (riskReward < 1.3) {
          console.log(`❌ ${symbol}: R/R too low (${riskReward.toFixed(2)})`);
          continue;
        }
        
        // ⏰ SIGNAL EXPIRATION: 5 minutes
        const expirationTime = new Date(Date.now() + 5 * 60 * 1000);
        
        const signal: TradingSignal = {
          id: `classic-pro-v3-${symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          pair: symbol,
          direction: direction as SignalDirection,
          type: direction === 'BUY' ? 'LONG' : 'SHORT',
          entryPrice: parseFloat(currentPrice.toFixed(6)),
          entry_price: parseFloat(currentPrice.toFixed(6)),
          entryAvg: parseFloat(currentPrice.toFixed(6)),
          stopLoss: parseFloat(stopLoss.toFixed(6)),
          tp1: parseFloat(tp1.toFixed(6)),
          tp2: parseFloat(tp2.toFixed(6)),
          tp3: parseFloat(tp3.toFixed(6)),
          targets: [
            { level: 1, price: parseFloat(tp1.toFixed(6)), hit: false },
            { level: 2, price: parseFloat(tp2.toFixed(6)), hit: false },
            { level: 3, price: parseFloat(tp3.toFixed(6)), hit: false }
          ],
          status: 'WAITING',
          strategy: 'classic_crypto_pro',
          createdAt: new Date().toISOString(),
          expiresAt: expirationTime.toISOString(),
          confidence: parseFloat(weightedScore.toFixed(3)),
          result: null,
          profit: null,
          rsi: parseFloat(rsi.toFixed(2)),
          atr: parseFloat(atr.toFixed(6)),
          timeframe: '1m/5m/15m',
          riskReward: parseFloat(riskReward.toFixed(2)),
          validationsPassed: passedValidations,
          mlFeatures: mlFeatures,
          analysis: `Classic Crypto Pro V3 para ${symbol}: Direção ${direction} (1h confirmada), Score ${weightedScore.toFixed(3)}, ${passedValidations}/6 validações, R/R ${riskReward.toFixed(2)}, expira em 5min.`
        };
        
        signals.push(signal);
        signalCooldown.set(symbol, Date.now());
        
        console.log(`✅ Signal generated for ${symbol}: ${direction} at ${currentPrice} (Score: ${weightedScore.toFixed(3)})`);
        
        // Limit signals per batch
        if (signals.length >= 5) break;
        
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
        continue;
      }
    }
    
    console.log(`✅ Generated ${signals.length} Classic Crypto Pro V3 signals`);
    return signals;
    
  } catch (error) {
    console.error('❌ Error generating Classic Crypto Pro V3 signals:', error);
    return [];
  }
};

// 🤖 ML TRAINING FUNCTIONS
export const trainMLModel = (signalResults: { signal: TradingSignal; result: string }[]) => {
  console.log('🤖 Training ML model with signal results...');
  
  for (const { signal, result } of signalResults) {
    if (signal.mlFeatures) {
      const label = result === 'WINNER' ? 1 : 0;
      mlTrainingData.push({
        ...signal.mlFeatures,
        label
      });
    }
  }
  
  // Keep only last 1000 training samples
  if (mlTrainingData.length > 1000) {
    mlTrainingData = mlTrainingData.slice(-1000);
  }
  
  console.log(`🤖 ML training data updated: ${mlTrainingData.length} samples`);
};

export const updateSignalResult = (symbol: string, result: string) => {
  if (result === 'LOSER') {
    const currentLosses = lossTracker.get(symbol) || 0;
    lossTracker.set(symbol, currentLosses + 1);
  } else if (result === 'WINNER') {
    lossTracker.set(symbol, 0); // Reset loss count
  }
};

// Main export function
export const fetchClassicCryptoProSignals = async (): Promise<TradingSignal[]> => {
  console.log('🎯 Starting Classic Crypto Pro V3 signals generation...');
  
  try {
    return await generateClassicCryptoProSignals();
  } catch (error) {
    console.error('❌ Error fetching Classic Crypto Pro V3 signals:', error);
    return [];
  }
};
