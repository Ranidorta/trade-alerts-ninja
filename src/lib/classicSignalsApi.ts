import axios from 'axios';
import { TradingSignal } from '@/lib/types';
import { 
  calculateEMA, 
  calculateVWAP, 
  calculateMACD, 
  calculateATR, 
  calculateVolumeMetrics, 
  calculatePivots, 
  detectDivergence, 
  validateEMAStack, 
  checkSRProximity,
  parseBybitKlines,
  KlineData 
} from '@/lib/indicators';
import { getSignalHistory } from '@/lib/signal-storage';

// Bybit API for Classic v2 signals
const BYBIT_API_BASE = 'https://api.bybit.com/v5';

// Configuration parameters
const CONFIG = {
  MIN_24H_TURNOVER: 10_000_000, // 10M USDT minimum
  TOP_VOLUME_COUNT: 40,
  MIN_RR_RATIO: 1.6,
  ATR_SL_COEFF: 0.8,
  MIN_VOLUME_ZSCORE: 1.0,
  MIN_VOLUME_MULTIPLE: 1.2,
  COOLDOWN_CANDLES: 5,
  MIN_CONFIDENCE_SCORE: 60,
  EXECUTABLE_SCORE: 75
};

// Create axios instance for API calls
const classicCryptoApi = axios.create({
  timeout: 15000, // Increased timeout for better reliability
});

interface SymbolInfo {
  symbol: string;
  turnover24h: number;
}

interface ClassicV2Signal {
  symbol: string;
  side: 'LONG' | 'SHORT';
  timeframes: { trend: string; execution: string };
  entry_zone: [number, number];
  stop_loss: number;
  take_profits: [number, number, number];
  rr_min: number;
  indicators: {
    ema9: number;
    ema14: number;
    ema21: number;
    vwap: number;
    macd: { value: number; signal: number; hist_slope: string };
    atr14: number;
    volume: { last: number; sma20: number; zscore: number };
  };
  context: {
    vwap_state: string;
    setup_type: string;
    divergence: string;
    nearest_sr: { type: string; price: number; distance_to_entry: number };
  };
  confidence_score: number;
  cooldown_until: string;
  reasons: string[];
}

// Get Bybit tickers with 24h turnover for prioritization
const getBybitTickersWithTurnover = async (): Promise<SymbolInfo[]> => {
  try {
    console.log('🔍 Fetching Bybit USDT perpetual symbols with turnover data...');
    
    const response = await classicCryptoApi.get(`${BYBIT_API_BASE}/market/tickers`, {
      params: { category: 'linear' }
    });
    
    if (!response.data?.result?.list) {
      throw new Error('Invalid response format from Bybit tickers API');
    }
    
    const symbols = response.data.result.list
      .filter((ticker: any) => 
        ticker.symbol?.endsWith('USDT') && 
        parseFloat(ticker.turnover24h || '0') >= CONFIG.MIN_24H_TURNOVER
      )
      .map((ticker: any) => ({
        symbol: ticker.symbol,
        turnover24h: parseFloat(ticker.turnover24h)
      }))
      .sort((a: SymbolInfo, b: SymbolInfo) => b.turnover24h - a.turnover24h);
    
    console.log(`✅ Found ${symbols.length} qualifying symbols (turnover >= ${CONFIG.MIN_24H_TURNOVER.toLocaleString()} USDT)`);
    return symbols;
  } catch (error) {
    console.warn('⚠️ Failed to fetch Bybit tickers, using fallback symbols:', error);
    return [
      { symbol: 'BTCUSDT', turnover24h: 1000000000 },
      { symbol: 'ETHUSDT', turnover24h: 500000000 },
      { symbol: 'SOLUSDT', turnover24h: 100000000 },
      { symbol: 'BNBUSDT', turnover24h: 80000000 },
      { symbol: 'ADAUSDT', turnover24h: 60000000 },
      { symbol: 'DOGEUSDT', turnover24h: 50000000 },
      { symbol: 'XRPUSDT', turnover24h: 45000000 },
      { symbol: 'AVAXUSDT', turnover24h: 40000000 }
    ];
  }
};

// Get Bybit kline data for specified timeframe
const getBybitKlines = async (symbol: string, interval: string, limit: number = 200): Promise<any[]> => {
  try {
    const response = await classicCryptoApi.get(`${BYBIT_API_BASE}/market/kline`, {
      params: {
        category: 'linear',
        symbol: symbol,
        interval: interval,
        limit: limit
      }
    });
    
    return response.data.result?.list || [];
  } catch (error) {
    console.error(`❌ Error fetching ${interval} klines for ${symbol}:`, error);
    return [];
  }
};

// Check if symbol is in cooldown
const isSymbolInCooldown = (symbol: string): boolean => {
  const history = getSignalHistory();
  const recentSignals = history.filter(s => 
    s.symbol === symbol && 
    s.strategy === 'classic_v2' &&
    (s.status === 'COMPLETED' || s.result !== null)
  );
  
  if (recentSignals.length === 0) return false;
  
  // Find the most recent completed signal
  const lastCompleted = recentSignals.sort((a, b) => 
    new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime()
  )[0];
  
  if (!lastCompleted) return false;
  
  // Calculate cooldown end (5 candles * 5 minutes = 25 minutes)
  const cooldownEnd = new Date(lastCompleted.completedAt || lastCompleted.createdAt).getTime() + (25 * 60 * 1000);
  return Date.now() < cooldownEnd;
};

// Analyze single symbol for Classic v2 signal
const analyzeSymbolForSignal = async (symbol: string): Promise<ClassicV2Signal | null> => {
  try {
    console.log(`🔍 Analyzing ${symbol} for Classic v2 signal...`);
    
    // Check cooldown first
    if (isSymbolInCooldown(symbol)) {
      console.log(`⏳ ${symbol} in cooldown, skipping`);
      return null;
    }
    
    // Get 15m and 5m klines
    const [klines15m, klines5m] = await Promise.all([
      getBybitKlines(symbol, '15', 200),
      getBybitKlines(symbol, '5', 100)
    ]);
    
    if (!klines15m.length || !klines5m.length) {
      console.log(`❌ ${symbol}: insufficient kline data`);
      return null;
    }
    
    // Parse kline data
    const data15m = parseBybitKlines(klines15m);
    const data5m = parseBybitKlines(klines5m);
    
    if (data15m.length < 50 || data5m.length < 30) {
      console.log(`❌ ${symbol}: not enough parsed data`);
      return null;
    }
    
    // 1. TREND ANALYSIS (15m timeframe)
    const prices15m = data15m.map(k => k.close);
    const ema9_15m = calculateEMA(prices15m, 9);
    const ema14_15m = calculateEMA(prices15m, 14);
    const ema21_15m = calculateEMA(prices15m, 21);
    
    if (!ema9_15m.length || !ema14_15m.length || !ema21_15m.length) {
      console.log(`❌ ${symbol}: EMA calculation failed`);
      return null;
    }
    
    const currentEMA9_15m = ema9_15m[ema9_15m.length - 1];
    const currentEMA14_15m = ema14_15m[ema14_15m.length - 1];
    const currentEMA21_15m = ema21_15m[ema21_15m.length - 1];
    const currentPrice15m = prices15m[prices15m.length - 1];
    
    // Determine trend direction
    let trendDirection: 'LONG' | 'SHORT' | null = null;
    if (validateEMAStack(currentEMA9_15m, currentEMA14_15m, currentEMA21_15m, 'LONG') && currentPrice15m >= currentEMA9_15m) {
      trendDirection = 'LONG';
    } else if (validateEMAStack(currentEMA9_15m, currentEMA14_15m, currentEMA21_15m, 'SHORT') && currentPrice15m <= currentEMA9_15m) {
      trendDirection = 'SHORT';
    }
    
    if (!trendDirection) {
      console.log(`❌ ${symbol}: trend not established`);
      return null;
    }
    
    // 2. EXECUTION TIMEFRAME ANALYSIS (5m)
    const prices5m = data5m.map(k => k.close);
    const ema9_5m = calculateEMA(prices5m, 9);
    const ema14_5m = calculateEMA(prices5m, 14);
    const ema21_5m = calculateEMA(prices5m, 21);
    
    if (!ema9_5m.length || !ema14_5m.length || !ema21_5m.length) {
      console.log(`❌ ${symbol}: 5m EMA calculation failed`);
      return null;
    }
    
    const currentEMA9_5m = ema9_5m[ema9_5m.length - 1];
    const currentEMA14_5m = ema14_5m[ema14_5m.length - 1];
    const currentEMA21_5m = ema21_5m[ema21_5m.length - 1];
    const currentPrice5m = prices5m[prices5m.length - 1];
    
    // Check if 5m agrees with 15m trend
    const emaStackValid5m = validateEMAStack(currentEMA9_5m, currentEMA14_5m, currentEMA21_5m, trendDirection);
    
    // 3. VWAP ANALYSIS
    const vwapData = calculateVWAP(data5m);
    let vwapCondition = false;
    let vwapState = '';
    
    if (trendDirection === 'LONG') {
      vwapCondition = vwapData.priceAbove || vwapData.reclaimed;
      vwapState = vwapData.reclaimed ? 'reclaimed' : (vwapData.priceAbove ? 'above' : 'below');
    } else {
      vwapCondition = !vwapData.priceAbove || vwapData.rejected;
      vwapState = vwapData.rejected ? 'rejected' : (!vwapData.priceAbove ? 'below' : 'above');
    }
    
    // If EMA stack doesn't agree, only allow VWAP reclaim/reject
    if (!emaStackValid5m && !vwapData.reclaimed && !vwapData.rejected) {
      console.log(`❌ ${symbol}: 5m timeframe diverges without valid VWAP reclaim/reject`);
      return null;
    }
    
    // 4. MACD ANALYSIS
    const macdData = calculateMACD(prices5m);
    const macdFavor = trendDirection === 'LONG' ? macdData.slope > 0 : macdData.slope < 0;
    
    // 5. VOLUME ANALYSIS
    const volumes5m = data5m.map(k => k.volume);
    const volumeMetrics = calculateVolumeMetrics(volumes5m);
    const volumeOk = volumeMetrics.zScore >= CONFIG.MIN_VOLUME_ZSCORE || 
                     volumeMetrics.current >= volumeMetrics.sma20 * CONFIG.MIN_VOLUME_MULTIPLE;
    
    // 6. ENTRY TRIGGERS
    let setupType = '';
    let entryValid = false;
    
    // A) Pullback entry (preferencial)
    const lastKline5m = data5m[data5m.length - 1];
    if (trendDirection === 'LONG') {
      const touchedEMA21 = lastKline5m.low <= currentEMA21_5m * 1.002; // Small tolerance
      const closedAboveEMA9 = lastKline5m.close > currentEMA9_5m;
      if (touchedEMA21 && closedAboveEMA9 && macdFavor && volumeOk) {
        setupType = 'pullback_ema21';
        entryValid = true;
      }
    } else {
      const touchedEMA21 = lastKline5m.high >= currentEMA21_5m * 0.998;
      const closedBelowEMA9 = lastKline5m.close < currentEMA9_5m;
      if (touchedEMA21 && closedBelowEMA9 && macdFavor && volumeOk) {
        setupType = 'pullback_ema21';
        entryValid = true;
      }
    }
    
    // B) Breakout + Retest (conservative)
    if (!entryValid && volumeMetrics.zScore >= CONFIG.MIN_VOLUME_ZSCORE) {
      // Simplified breakout logic - look for range breakout with retest
      const recentHighs = data5m.slice(-10).map(k => k.high);
      const recentLows = data5m.slice(-10).map(k => k.low);
      const rangeHigh = Math.max(...recentHighs.slice(0, -2));
      const rangeLow = Math.min(...recentLows.slice(0, -2));
      
      if (trendDirection === 'LONG' && currentPrice5m > rangeHigh && macdFavor) {
        setupType = 'breakout_retest';
        entryValid = true;
      } else if (trendDirection === 'SHORT' && currentPrice5m < rangeLow && macdFavor) {
        setupType = 'breakout_retest';
        entryValid = true;
      }
    }
    
    if (!entryValid) {
      console.log(`❌ ${symbol}: entry conditions not met`);
      return null;
    }
    
    // 7. DIVERGENCE CHECK
    const macdValues = data5m.map((_, i) => {
      if (i < 12) return 0; // Need at least 12 periods for MACD
      const slicePrices = data5m.slice(Math.max(0, i - 25), i + 1).map(k => k.close);
      return calculateMACD(slicePrices).value;
    });
    
    const divergence = detectDivergence(prices5m.slice(-20), macdValues.slice(-20));
    
    // Block signal if divergence is against the trend
    if ((trendDirection === 'LONG' && divergence.bearish) || (trendDirection === 'SHORT' && divergence.bullish)) {
      console.log(`❌ ${symbol}: divergence against trend`);
      return null;
    }
    
    // 8. SUPPORT/RESISTANCE CHECK
    const pivots = calculatePivots(data5m);
    const allSRLevels = [...pivots.resistance, ...pivots.support];
    const atr = calculateATR(data5m);
    const minSRDistance = atr * CONFIG.ATR_SL_COEFF * 0.5; // Half of SL distance
    
    const srCheck = checkSRProximity(currentPrice5m, allSRLevels, minSRDistance);
    if (srCheck.tooClose) {
      console.log(`❌ ${symbol}: too close to S/R level at ${srCheck.nearestLevel}`);
      return null;
    }
    
    // 9. RISK/REWARD CALCULATION
    const dynamicSL = trendDirection === 'LONG'
      ? Math.max(
          data5m.slice(-5).reduce((min, k) => Math.min(min, k.low), Infinity),
          currentEMA21_5m - (CONFIG.ATR_SL_COEFF * atr)
        )
      : Math.min(
          data5m.slice(-5).reduce((max, k) => Math.max(max, k.high), -Infinity),
          currentEMA21_5m + (CONFIG.ATR_SL_COEFF * atr)
        );
    
    const entryPrice = currentPrice5m;
    const entryZone: [number, number] = [entryPrice * 0.999, entryPrice * 1.001]; // Tight entry zone
    
    const tp1 = trendDirection === 'LONG' ? entryPrice + (1 * atr) : entryPrice - (1 * atr);
    const tp2 = trendDirection === 'LONG' ? entryPrice + (2 * atr) : entryPrice - (2 * atr);
    const tp3 = trendDirection === 'LONG' ? entryPrice + (3 * atr) : entryPrice - (3 * atr);
    
    // Check minimum R/R ratio
    const riskAmount = Math.abs(entryPrice - dynamicSL);
    const rewardAmount = Math.abs(tp1 - entryPrice);
    const rrRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;
    
    if (rrRatio < CONFIG.MIN_RR_RATIO) {
      console.log(`❌ ${symbol}: R/R ratio ${rrRatio.toFixed(2)} below minimum ${CONFIG.MIN_RR_RATIO}`);
      return null;
    }
    
    // 10. CONFIDENCE SCORING (0-100)
    let score = 0;
    const reasons: string[] = [];
    
    // +25 EMA stack conforme direção (15m e 5m)
    if (emaStackValid5m) {
      score += 25;
      reasons.push(`EMA9>EMA14>EMA21 em 15m/5m`);
    }
    
    // +15 VWAP position or reclaim/reject
    if (vwapCondition) {
      score += 15;
      reasons.push(`VWAP ${vwapState}`);
    }
    
    // +15 MACD slope + histogram
    if (macdFavor && Math.abs(macdData.histogram) > Math.abs(macdData.value) * 0.1) {
      score += 15;
      reasons.push(`MACD ${trendDirection === 'LONG' ? 'abrindo para cima' : 'abrindo para baixo'}`);
    }
    
    // +15 Volume
    if (volumeOk) {
      score += 15;
      reasons.push(`Volume ${volumeMetrics.zScore >= 1.0 ? 'elevado (z-score)' : 'acima da média'}`);
    }
    
    // +15 Setup quality
    if (setupType === 'pullback_ema21') {
      score += 15;
      reasons.push(`Pullback perfeito na EMA21`);
    } else if (setupType === 'breakout_retest') {
      score += 10;
      reasons.push(`Breakout com reteste válido`);
    }
    
    // +15 R/R >= 2.0
    if (rrRatio >= 2.0) {
      score += 15;
      reasons.push(`R/R >= 2.0 (${rrRatio.toFixed(1)}:1)`);
    }
    
    // -10 penalties
    if (divergence.confirmed) {
      score -= 10;
      reasons.push(`Divergência detectada`);
    }
    
    if (srCheck.distance < atr) {
      score -= 10;
      reasons.push(`Próximo a S/R`);
    }
    
    // Only publish signals with score >= 60
    if (score < CONFIG.MIN_CONFIDENCE_SCORE) {
      console.log(`❌ ${symbol}: confidence score ${score} below minimum ${CONFIG.MIN_CONFIDENCE_SCORE}`);
      return null;
    }
    
    // Calculate cooldown timestamp
    const cooldownUntil = new Date(Date.now() + (CONFIG.COOLDOWN_CANDLES * 5 * 60 * 1000)).toISOString();
    
    const signal: ClassicV2Signal = {
      symbol,
      side: trendDirection,
      timeframes: { trend: '15m', execution: '5m' },
      entry_zone: entryZone,
      stop_loss: dynamicSL,
      take_profits: [tp1, tp2, tp3],
      rr_min: CONFIG.MIN_RR_RATIO,
      indicators: {
        ema9: currentEMA9_5m,
        ema14: currentEMA14_5m,
        ema21: currentEMA21_5m,
        vwap: vwapData.vwap,
        macd: {
          value: macdData.value,
          signal: macdData.signal,
          hist_slope: macdData.slope > 0 ? 'up' : 'down'
        },
        atr14: atr,
        volume: {
          last: volumeMetrics.current,
          sma20: volumeMetrics.sma20,
          zscore: volumeMetrics.zScore
        }
      },
      context: {
        vwap_state: vwapState,
        setup_type: setupType,
        divergence: divergence.confirmed ? (divergence.bullish ? 'bullish' : 'bearish') : 'none',
        nearest_sr: {
          type: srCheck.nearestLevel > currentPrice5m ? 'resistance' : 'support',
          price: srCheck.nearestLevel,
          distance_to_entry: srCheck.distance
        }
      },
      confidence_score: score,
      cooldown_until: cooldownUntil,
      reasons
    };
    
    console.log(`✅ ${symbol}: Classic v2 signal generated (score: ${score})`);
    return signal;
    
  } catch (error) {
    console.error(`❌ Error analyzing ${symbol}:`, error);
    return null;
  }
};

// Convert Classic v2 signal to TradingSignal format
const convertToTradingSignal = (classicSignal: ClassicV2Signal): TradingSignal => {
  const confidence = Math.min(100, Math.max(0, classicSignal.confidence_score)) / 100;
  
  return {
    id: `classic-v2-${classicSignal.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    symbol: classicSignal.symbol,
    pair: classicSignal.symbol,
    direction: classicSignal.side === 'LONG' ? 'BUY' : 'SELL',
    type: classicSignal.side,
    entryPrice: (classicSignal.entry_zone[0] + classicSignal.entry_zone[1]) / 2,
    entry_price: (classicSignal.entry_zone[0] + classicSignal.entry_zone[1]) / 2,
    entryAvg: (classicSignal.entry_zone[0] + classicSignal.entry_zone[1]) / 2,
    entryMin: classicSignal.entry_zone[0],
    entryMax: classicSignal.entry_zone[1],
    stopLoss: classicSignal.stop_loss,
    tp1: classicSignal.take_profits[0],
    tp2: classicSignal.take_profits[1],
    tp3: classicSignal.take_profits[2],
    targets: [
      { level: 1, price: classicSignal.take_profits[0], hit: false },
      { level: 2, price: classicSignal.take_profits[1], hit: false },
      { level: 3, price: classicSignal.take_profits[2], hit: false }
    ],
    status: 'WAITING',
    strategy: 'classic_v2',
    createdAt: new Date().toISOString(),
    confidence,
    result: null,
    profit: null,
    rsi: 0, // Not used in Classic v2
    atr: classicSignal.indicators.atr14,
    timeframe: '5m',
    risk_reward_ratio: classicSignal.rr_min,
    analysis: `Classic v2 - ${classicSignal.context.setup_type} setup. Score: ${classicSignal.confidence_score}/100. ${classicSignal.reasons.join(', ')}.`
  };
};

// Main signal generation function
const generateClassicV2Signals = async (): Promise<TradingSignal[]> => {
  console.log('🚀 Starting Classic v2 signal generation...');
  
  try {
    // 1. Get symbols prioritized by volume
    const symbolsInfo = await getBybitTickersWithTurnover();
    const topSymbols = symbolsInfo.slice(0, CONFIG.TOP_VOLUME_COUNT);
    
    console.log(`📊 Scanning top ${topSymbols.length} symbols by 24h turnover`);
    
    const classicSignals: ClassicV2Signal[] = [];
    const errors: string[] = [];
    
    // 2. Scan symbols in priority order
    for (const symbolInfo of topSymbols) {
      try {
        const signal = await analyzeSymbolForSignal(symbolInfo.symbol);
        if (signal) {
          classicSignals.push(signal);
          
          // Limit concurrent signals
          if (classicSignals.length >= 8) break;
        }
      } catch (error) {
        errors.push(`${symbolInfo.symbol}: ${error}`);
        console.error(`❌ Error scanning ${symbolInfo.symbol}:`, error);
      }
    }
    
    // 3. Sort by confidence score (descending)
    classicSignals.sort((a, b) => b.confidence_score - a.confidence_score);
    
    // 4. Convert to TradingSignal format
    const tradingSignals = classicSignals.map(convertToTradingSignal);
    
    console.log(`✅ Classic v2 generation complete:`);
    console.log(`- Scanned: ${topSymbols.length} symbols`);
    console.log(`- Generated: ${classicSignals.length} signals`);
    console.log(`- Errors: ${errors.length}`);
    
    if (classicSignals.length > 0) {
      console.log('📋 Generated signals:', classicSignals.map(s => 
        `${s.symbol} ${s.side} (${s.confidence_score})`
      ).join(', '));
    }
    
    return tradingSignals;
    
  } catch (error) {
    console.error('❌ Critical error in Classic v2 generation:', error);
    return [];
  }
};

// Export main function - fetch Classic v2 signals  
export const fetchClassicSignals = async (): Promise<TradingSignal[]> => {
  console.log('🎯 Fetching Classic v2 signals...');
  
  try {
    return await generateClassicV2Signals();
  } catch (error) {
    console.error('❌ Error fetching Classic v2 signals:', error);
    return [];
  }
};