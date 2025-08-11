import axios from 'axios';
import { TradingSignal } from '@/lib/types';

// Bybit API for Classic Crypto signals
const BYBIT_API_BASE = 'https://api.bybit.com/v5';

// Create axios instance for API calls
const classicCryptoApi = axios.create({
  timeout: 10000,
});

// Get available Bybit USDT Futures symbols
const getBybitFuturesSymbols = async (): Promise<string[]> => {
  try {
    const response = await classicCryptoApi.get(`${BYBIT_API_BASE}/market/instruments-info`, {
      params: { category: 'linear' }
    });
    
    const symbols = response.data.result.list
      .filter((instrument: any) => 
        instrument.symbol.endsWith('USDT') && 
        instrument.status === 'Trading' &&
        instrument.quoteCoin === 'USDT'
      )
      .map((instrument: any) => instrument.symbol)
      .slice(0, 20); // Top 20 most liquid pairs
    
    return symbols;
  } catch (error) {
    console.warn('Failed to fetch Bybit symbols, using defaults:', error);
    return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'XRPUSDT', 'AVAXUSDT'];
  }
};

// Get Bybit kline data
const getBybitKlines = async (symbol: string, interval: string, limit: number = 200) => {
  try {
    const response = await classicCryptoApi.get(`${BYBIT_API_BASE}/market/kline`, {
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

// Calculate technical indicators
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

const calculateADX = (high: number[], low: number[], close: number[], period: number = 14): number => {
  if (high.length < period + 1) return 25;
  
  let dmPlus = 0;
  let dmMinus = 0;
  let tr = 0;
  
  for (let i = 1; i < Math.min(period + 1, high.length); i++) {
    const highDiff = high[i] - high[i - 1];
    const lowDiff = low[i - 1] - low[i];
    
    dmPlus += Math.max(highDiff > lowDiff && highDiff > 0 ? highDiff : 0, 0);
    dmMinus += Math.max(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0, 0);
    
    const trueRange = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );
    tr += trueRange;
  }
  
  const diPlus = (dmPlus / tr) * 100;
  const diMinus = (dmMinus / tr) * 100;
  const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  
  return dx || 25;
};

const calculateATR = (high: number[], low: number[], close: number[], period: number = 14): number => {
  if (high.length < period + 1) return 0;
  
  let atrSum = 0;
  for (let i = 1; i < Math.min(period + 1, high.length); i++) {
    const trueRange = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );
    atrSum += trueRange;
  }
  
  return atrSum / period;
};

// Generate Classic Crypto signals with NOVA LÓGICA TÉCNICA
const generateClassicCryptoSignals = async (): Promise<TradingSignal[]> => {
  console.log('🚀 Generating Classic Crypto signals - Nova Lógica Técnica...');
  
  try {
    // Get available Bybit futures symbols (USDT pairs)
    const symbols = await getBybitFuturesSymbols();
    const signals: TradingSignal[] = [];
    
    // Prevent duplicate signals (max 1 per symbol every 6h)
    const signalCooldown = new Map<string, number>();
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    
    for (const symbol of symbols) {
      try {
        // Check cooldown - apenas 1 sinal por ativo a cada 6h
        const lastSignalTime = signalCooldown.get(symbol) || 0;
        if (lastSignalTime > sixHoursAgo) {
          console.log(`⏳ ${symbol} em cooldown - aguardando 6h`);
          continue;
        }
        
        // 1. FILTRO DE TENDÊNCIA (4h): EMA 50 > EMA 200
        const klines4h = await getBybitKlines(symbol, '240', 200); // 4h, 200 períodos
        if (!klines4h || klines4h.length < 200) {
          console.log(`❌ ${symbol}: dados 4h insuficientes`);
          continue;
        }
        
        // 2. TIMEFRAME PRINCIPAL (15m) para condições de entrada
        const klines15m = await getBybitKlines(symbol, '15', 100); // 15m, 100 períodos
        if (!klines15m || klines15m.length < 50) {
          console.log(`❌ ${symbol}: dados 15m insuficientes`);
          continue;
        }
        
        // Parse kline data (Bybit format: [startTime, openPrice, highPrice, lowPrice, closePrice, volume, turnover])
        const prices4h = klines4h.map(k => parseFloat(k[4])).reverse(); // Close prices, oldest first
        const prices15m = klines15m.map(k => parseFloat(k[4])).reverse();
        const highs15m = klines15m.map(k => parseFloat(k[2])).reverse();
        const lows15m = klines15m.map(k => parseFloat(k[3])).reverse();
        const volumes15m = klines15m.map(k => parseFloat(k[5])).reverse();
        
        // FILTRO DE TENDÊNCIA 4H: EMA 50 > EMA 200
        const ema50_4h = calculateEMA(prices4h, 50);
        const ema200_4h = calculateEMA(prices4h, 200);
        const isBullishTrend = ema50_4h > ema200_4h;
        const trendDirection = isBullishTrend ? 'BUY' : 'SELL';
        
        console.log(`📈 ${symbol} - Tendência 4h: ${trendDirection} (EMA50: ${ema50_4h.toFixed(2)}, EMA200: ${ema200_4h.toFixed(2)})`);
        
        // CONDIÇÕES DE ENTRADA no 15m
        const currentPrice = prices15m[prices15m.length - 1];
        const rsi15m = calculateRSI(prices15m, 14);
        const adx15m = calculateADX(highs15m, lows15m, prices15m, 14);
        const atr15m = calculateATR(highs15m, lows15m, prices15m, 14);
        
        // Condição 1: RSI(14) entre 45 e 65 (evita extremos)
        const rsiValid = rsi15m >= 45 && rsi15m <= 65;
        
        // Condição 2: ADX(14) > 25 (mercado com força)
        const adxValid = adx15m > 25;
        
        // Condição 3: Volume atual > 20% da média dos últimos 20 candles
        const volumeAvg = volumes15m.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const currentVolume = volumes15m[volumes15m.length - 1];
        const volumeValid = currentVolume > volumeAvg * 1.2;
        
        // Condição 4: Candle de entrada com corpo > 60% do range
        const lastKline = klines15m[0]; // Most recent candle
        const candleOpen = parseFloat(lastKline[1]);
        const candleHigh = parseFloat(lastKline[2]);
        const candleLow = parseFloat(lastKline[3]);
        const candleClose = parseFloat(lastKline[4]);
        const candleBody = Math.abs(candleClose - candleOpen);
        const candleRange = candleHigh - candleLow;
        const candleValid = candleRange > 0 && (candleBody / candleRange) > 0.6;

        console.log(`📊 ${symbol} - Análise 15m:`, {
          rsi: rsi15m.toFixed(1),
          adx: adx15m.toFixed(1),
          volume: `${((currentVolume / volumeAvg - 1) * 100).toFixed(1)}%`,
          candle: `${((candleBody / candleRange) * 100).toFixed(1)}%`,
          conditions: { rsiValid, adxValid, volumeValid, candleValid }
        });
        
        // TODAS as 4 condições devem ser atendidas
        if (!rsiValid || !adxValid || !volumeValid || !candleValid) {
          console.log(`❌ ${symbol}: condições não atendidas`);
          continue;
        }
        
        // GESTÃO DE RISCO usando ATR(14)
        const stopLoss = trendDirection === 'BUY' 
          ? currentPrice - (atr15m * 1.5)  // Stop Loss: 1.5x ATR
          : currentPrice + (atr15m * 1.5);
        
        const tp1 = trendDirection === 'BUY'
          ? currentPrice + (atr15m * 1.0)   // TP1: 1x ATR
          : currentPrice - (atr15m * 1.0);
        
        const tp2 = trendDirection === 'BUY'
          ? currentPrice + (atr15m * 1.8)   // TP2: 1.8x ATR
          : currentPrice - (atr15m * 1.8);
        
        const tp3 = trendDirection === 'BUY'
          ? currentPrice + (atr15m * 2.5)   // TP3: 2.5x ATR
          : currentPrice - (atr15m * 2.5);
        
        // Calculate confidence score
        let confidence = 0.7; // Base confidence para nova lógica
        if (rsi15m >= 50 && rsi15m <= 60) confidence += 0.1; // RSI optimal range
        if (adx15m > 30) confidence += 0.1; // Very strong trend
        if (currentVolume > volumeAvg * 1.5) confidence += 0.1; // High volume spike
        if ((candleBody / candleRange) > 0.75) confidence += 0.05; // Very strong candle
        
        const signal: TradingSignal = {
          id: `classic-crypto-${symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          pair: symbol,
          direction: trendDirection,
          type: trendDirection === 'BUY' ? 'LONG' : 'SHORT',
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
          strategy: 'classic_crypto_15m',
          createdAt: new Date().toISOString(),
          confidence: parseFloat(confidence.toFixed(3)),
          result: null,
          profit: null,
          rsi: parseFloat(rsi15m.toFixed(2)),
          atr: parseFloat(atr15m.toFixed(6)),
          timeframe: '15m',
          analysis: `Classic Crypto para ${symbol}: Tendência 4h ${trendDirection}, RSI ${rsi15m.toFixed(1)}, ADX ${adx15m.toFixed(1)}, Volume ${volumeValid ? 'Elevado' : 'Normal'}, Candle ${candleValid ? 'Forte' : 'Fraco'}.`
        };
        
        signals.push(signal);
        signalCooldown.set(symbol, Date.now());
        
        console.log(`✅ Classic Crypto signal generated for ${symbol}: ${trendDirection} at ${currentPrice}`);
        
        // Limit to prevent too many signals at once
        if (signals.length >= 8) break;
        
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
        continue;
      }
    }
    
    console.log(`✅ Generated ${signals.length} Classic Crypto signals`);
    return signals;
    
  } catch (error) {
    console.error('❌ Error generating Classic Crypto signals:', error);
    return [];
  }
};

// Main export function - fetch Classic Crypto signals
export const fetchClassicSignals = async (): Promise<TradingSignal[]> => {
  console.log('🎯 Starting Classic Crypto signals generation...');
  
  try {
    return await generateClassicCryptoSignals();
  } catch (error) {
    console.error('❌ Error fetching Classic Crypto signals:', error);
    return [];
  }
};

