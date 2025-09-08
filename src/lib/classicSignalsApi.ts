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

// Scanning profiles for adaptive relaxation
interface ScanProfile {
  name: string;
  MIN_24H_TURNOVER: number;
  TOP_VOLUME_COUNT: number;
  MIN_RR_RATIO: number;
  ATR_SL_COEFF: number;
  MIN_VOLUME_ZSCORE: number;
  MIN_VOLUME_MULTIPLE: number;
  PULLBACK_VOLUME_ZSCORE: number; // Separate for pullbacks
  EMA21_TOUCH_TOLERANCE: number;
  MIN_SR_DISTANCE_MULTIPLIER: number; // Multiplier for SR distance check
  MIN_CONFIDENCE_SCORE: number;
  EXECUTABLE_SCORE: number;
  BLOCK_ON_DIVERGENCE: boolean;
  MAX_SIGNALS: number;
}

// Extremely relaxed scanning profiles to guarantee signals
const SCAN_PROFILES: ScanProfile[] = [
  // Stage 1: Relaxed (easier rules)
  {
    name: 'relaxed',
    MIN_24H_TURNOVER: 3_000_000, // Much lower
    TOP_VOLUME_COUNT: 80,
    MIN_RR_RATIO: 1.3, // Lower R/R
    ATR_SL_COEFF: 0.5, // Tighter SL for better R/R
    MIN_VOLUME_ZSCORE: 0.0, // No volume requirement
    MIN_VOLUME_MULTIPLE: 0.8, // Below average volume OK
    PULLBACK_VOLUME_ZSCORE: -1.0, // Very relaxed
    EMA21_TOUCH_TOLERANCE: 0.01, // 1% tolerance
    MIN_SR_DISTANCE_MULTIPLIER: 0.05, // Very close to S/R OK
    MIN_CONFIDENCE_SCORE: 35, // Much lower score
    EXECUTABLE_SCORE: 60, // Lower executable score
    BLOCK_ON_DIVERGENCE: false,
    MAX_SIGNALS: 5
  },
  // Stage 2: Very Relaxed (emergency mode)
  {
    name: 'emergency',
    MIN_24H_TURNOVER: 1_000_000, // Very low turnover
    TOP_VOLUME_COUNT: 120,
    MIN_RR_RATIO: 1.2, // Low R/R acceptable
    ATR_SL_COEFF: 0.4, // Very tight SL
    MIN_VOLUME_ZSCORE: -0.5, // Low volume OK
    MIN_VOLUME_MULTIPLE: 0.5, // Half average volume OK
    PULLBACK_VOLUME_ZSCORE: -2.0, // Extremely relaxed
    EMA21_TOUCH_TOLERANCE: 0.015, // 1.5% tolerance
    MIN_SR_DISTANCE_MULTIPLIER: 0.02, // Almost touching S/R OK
    MIN_CONFIDENCE_SCORE: 25, // Very low score acceptable
    EXECUTABLE_SCORE: 50, // Low executable score
    BLOCK_ON_DIVERGENCE: false,
    MAX_SIGNALS: 8
  },
  // Stage 3: Ultra Relaxed (must generate signals)
  {
    name: 'ultra',
    MIN_24H_TURNOVER: 500_000, // Extremely low
    TOP_VOLUME_COUNT: 150,
    MIN_RR_RATIO: 1.1, // Minimal R/R
    ATR_SL_COEFF: 0.3, // Very tight SL
    MIN_VOLUME_ZSCORE: -1.0, // Very low volume OK
    MIN_VOLUME_MULTIPLE: 0.3, // Very low volume multiple
    PULLBACK_VOLUME_ZSCORE: -3.0, // Extremely relaxed
    EMA21_TOUCH_TOLERANCE: 0.02, // 2% tolerance
    MIN_SR_DISTANCE_MULTIPLIER: 0.01, // Touching S/R OK
    MIN_CONFIDENCE_SCORE: 15, // Extremely low score
    EXECUTABLE_SCORE: 40, // Very low executable score
    BLOCK_ON_DIVERGENCE: false,
    MAX_SIGNALS: 10
  }
];

const COOLDOWN_CANDLES = 5;

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

// Get Bybit tickers with 24h turnover for prioritization (profile-aware)
const getBybitTickersWithTurnover = async (profile: ScanProfile): Promise<SymbolInfo[]> => {
  try {
    console.log(`🔍 Fetching Bybit USDT perpetual symbols with turnover data [${profile.name}]...`);
    
    const response = await classicCryptoApi.get(`${BYBIT_API_BASE}/market/tickers`, {
      params: { category: 'linear' }
    });
    
    if (!response.data?.result?.list) {
      throw new Error('Invalid response format from Bybit tickers API');
    }
    
    const symbols = response.data.result.list
      .filter((ticker: any) => 
        ticker.symbol?.endsWith('USDT') && 
        parseFloat(ticker.turnover24h || '0') >= profile.MIN_24H_TURNOVER
      )
      .map((ticker: any) => ({
        symbol: ticker.symbol,
        turnover24h: parseFloat(ticker.turnover24h)
      }))
      .sort((a: SymbolInfo, b: SymbolInfo) => b.turnover24h - a.turnover24h);
    
    console.log(`✅ Found ${symbols.length} qualifying symbols (turnover >= ${profile.MIN_24H_TURNOVER.toLocaleString()} USDT) [${profile.name}]`);
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
    ].filter(s => s.turnover24h >= profile.MIN_24H_TURNOVER);
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

// Analyze single symbol for Classic v2 signal with adaptive profile
const analyzeSymbolForSignal = async (symbol: string, profile: ScanProfile): Promise<ClassicV2Signal | null> => {
  try {
    console.log(`🔍 Analyzing ${symbol} for Classic v2 signal [${profile.name}]...`);
    
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
    
    // If EMA stack doesn't agree, only allow VWAP reclaim/reject (relaxed in exploratory)
    if (!emaStackValid5m && !vwapData.reclaimed && !vwapData.rejected && profile.name !== 'exploratory') {
      console.log(`❌ ${symbol}: 5m timeframe diverges without valid VWAP reclaim/reject`);
      return null;
    }
    
    // 4. MACD ANALYSIS
    const macdData = calculateMACD(prices5m);
    const macdFavor = trendDirection === 'LONG' ? macdData.slope > 0 : macdData.slope < 0;
    
    // 5. VOLUME ANALYSIS (using profile-specific thresholds)
    const volumes5m = data5m.map(k => k.volume);
    const volumeMetrics = calculateVolumeMetrics(volumes5m);
    
    // 6. ENTRY TRIGGERS
    let setupType = '';
    let entryValid = false;
    
    // A) Pullback entry (preferencial) - relaxed volume for pullbacks
    const lastKline5m = data5m[data5m.length - 1];
    if (trendDirection === 'LONG') {
      const touchedEMA21 = lastKline5m.low <= currentEMA21_5m * (1 + profile.EMA21_TOUCH_TOLERANCE);
      const closedAboveEMA9 = lastKline5m.close > currentEMA9_5m;
      const pullbackVolumeOk = volumeMetrics.zScore >= profile.PULLBACK_VOLUME_ZSCORE || 
                               volumeMetrics.current >= volumeMetrics.sma20 * profile.MIN_VOLUME_MULTIPLE;
      if (touchedEMA21 && closedAboveEMA9 && macdFavor && pullbackVolumeOk) {
        setupType = 'pullback_ema21';
        entryValid = true;
      }
    } else {
      const touchedEMA21 = lastKline5m.high >= currentEMA21_5m * (1 - profile.EMA21_TOUCH_TOLERANCE);
      const closedBelowEMA9 = lastKline5m.close < currentEMA9_5m;
      const pullbackVolumeOk = volumeMetrics.zScore >= profile.PULLBACK_VOLUME_ZSCORE || 
                               volumeMetrics.current >= volumeMetrics.sma20 * profile.MIN_VOLUME_MULTIPLE;
      if (touchedEMA21 && closedBelowEMA9 && macdFavor && pullbackVolumeOk) {
        setupType = 'pullback_ema21';
        entryValid = true;
      }
    }
    
    // B) Breakout + Retest (conservative) - stricter volume for breakouts
    if (!entryValid && volumeMetrics.zScore >= profile.MIN_VOLUME_ZSCORE) {
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
    
    // Block signal if divergence is against the trend (only in strict mode)
    if (profile.BLOCK_ON_DIVERGENCE && 
        ((trendDirection === 'LONG' && divergence.bearish) || (trendDirection === 'SHORT' && divergence.bullish))) {
      console.log(`❌ ${symbol}: divergence against trend (blocked in ${profile.name} mode)`);
      return null;
    }
    
    // 8. SUPPORT/RESISTANCE CHECK (relaxed distance, skip in ultra mode)
    let srCheck = { tooClose: false, nearestLevel: currentPrice5m, distance: 999999 };
    
    if (profile.name !== 'ultra') {
      const pivots = calculatePivots(data5m);
      const allSRLevels = [...pivots.resistance, ...pivots.support];
      const atr = calculateATR(data5m);
      const minSRDistance = atr * profile.ATR_SL_COEFF * profile.MIN_SR_DISTANCE_MULTIPLIER;
      
      srCheck = checkSRProximity(currentPrice5m, allSRLevels, minSRDistance);
      if (srCheck.tooClose && profile.name === 'relaxed') {
        console.log(`⚠️ ${symbol}: close to S/R level at ${srCheck.nearestLevel} (continuing anyway in ${profile.name} mode)`);
      } else if (srCheck.tooClose) {
        console.log(`❌ ${symbol}: too close to S/R level at ${srCheck.nearestLevel}`);
        return null;
      }
    }
    
    // 9. RISK/REWARD CALCULATION (using profile ATR coefficient)
    const atr = calculateATR(data5m);
    const dynamicSL = trendDirection === 'LONG'
      ? Math.max(
          data5m.slice(-5).reduce((min, k) => Math.min(min, k.low), Infinity),
          currentEMA21_5m - (profile.ATR_SL_COEFF * atr)
        )
      : Math.min(
          data5m.slice(-5).reduce((max, k) => Math.max(max, k.high), -Infinity),
          currentEMA21_5m + (profile.ATR_SL_COEFF * atr)
        );
    
    const entryPrice = currentPrice5m;
    const entryZone: [number, number] = [entryPrice * 0.999, entryPrice * 1.001]; // Tight entry zone
    
    const tp1 = trendDirection === 'LONG' ? entryPrice + (1 * atr) : entryPrice - (1 * atr);
    const tp2 = trendDirection === 'LONG' ? entryPrice + (2 * atr) : entryPrice - (2 * atr);
    const tp3 = trendDirection === 'LONG' ? entryPrice + (3 * atr) : entryPrice - (3 * atr);
    
    // Check minimum R/R ratio (profile-specific)
    const riskAmount = Math.abs(entryPrice - dynamicSL);
    const rewardAmount = Math.abs(tp1 - entryPrice);
    const rrRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;
    
    if (rrRatio < profile.MIN_RR_RATIO) {
      console.log(`❌ ${symbol}: R/R ratio ${rrRatio.toFixed(2)} below minimum ${profile.MIN_RR_RATIO}`);
      return null;
    }
    
    // 10. CONFIDENCE SCORING (0-100) - same logic but different thresholds
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
    
    // +15 Volume (adjusted for profile)
    const volumeOk = volumeMetrics.zScore >= profile.MIN_VOLUME_ZSCORE || 
                     volumeMetrics.current >= volumeMetrics.sma20 * profile.MIN_VOLUME_MULTIPLE;
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
    
    // Penalties (not blocks in balanced/exploratory)
    if (divergence.confirmed) {
      score -= 10;
      reasons.push(`Divergência detectada`);
    }
    
    if (srCheck.distance < atr) {
      score -= 10;
      reasons.push(`Próximo a S/R`);
    }
    
    // Only publish signals with profile-specific minimum score
    if (score < profile.MIN_CONFIDENCE_SCORE) {
      console.log(`❌ ${symbol}: confidence score ${score} below minimum ${profile.MIN_CONFIDENCE_SCORE} [${profile.name}]`);
      return null;
    }
    
    // Calculate cooldown timestamp
    const cooldownUntil = new Date(Date.now() + (COOLDOWN_CANDLES * 5 * 60 * 1000)).toISOString();
    
    // Add profile tag to reasons
    const profileTag = profile.name === 'strict' ? 'Executável' : 
                       profile.name === 'balanced' ? 'Balanceado' : 'Watchlist';
    reasons.unshift(`[${profileTag}]`);
    
    const signal: ClassicV2Signal = {
      symbol,
      side: trendDirection,
      timeframes: { trend: '15m', execution: '5m' },
      entry_zone: entryZone,
      stop_loss: dynamicSL,
      take_profits: [tp1, tp2, tp3],
      rr_min: profile.MIN_RR_RATIO,
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
    
    console.log(`✅ ${symbol}: Classic v2 signal generated [${profile.name}] (score: ${score})`);
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

// Adaptive Classic v2 signal generation with staged relaxation
const generateClassicV2Signals = async (): Promise<TradingSignal[]> => {
  console.log('🚀 Starting Classic v2 signal generation with adaptive approach...');
  
  try {
    const allSignals: ClassicV2Signal[] = [];
    let totalScanned = 0;
    let totalErrors = 0;
    
    // Try each scanning profile in sequence until we get enough signals
    for (const profile of SCAN_PROFILES) {
      console.log(`\n📊 === STAGE ${profile.name.toUpperCase()} ===`);
      console.log(`Min Turnover: ${profile.MIN_24H_TURNOVER.toLocaleString()}, Top: ${profile.TOP_VOLUME_COUNT}, Min Score: ${profile.MIN_CONFIDENCE_SCORE}`);
      
      // 1. Get symbols for this profile
      const symbolsInfo = await getBybitTickersWithTurnover(profile);
      const topSymbols = symbolsInfo.slice(0, profile.TOP_VOLUME_COUNT);
      
      if (topSymbols.length === 0) {
        console.log(`⚠️ No symbols found for ${profile.name} profile, moving to next...`);
        continue;
      }
      
      console.log(`🎯 Scanning ${topSymbols.length} symbols in ${profile.name} mode`);
      
      const stageSignals: ClassicV2Signal[] = [];
      let stageErrors = 0;
      
      // 2. Scan symbols for this stage
      for (const symbolInfo of topSymbols) {
        try {
          const signal = await analyzeSymbolForSignal(symbolInfo.symbol, profile);
          if (signal) {
            stageSignals.push(signal);
            
            // Limit signals per stage
            if (stageSignals.length >= profile.MAX_SIGNALS) {
              console.log(`✅ Reached max ${profile.MAX_SIGNALS} signals for ${profile.name} stage`);
              break;
            }
          }
          totalScanned++;
        } catch (error) {
          stageErrors++;
          totalErrors++;
          console.error(`❌ Error scanning ${symbolInfo.symbol} [${profile.name}]:`, error);
        }
      }
      
      console.log(`📈 ${profile.name.toUpperCase()} STAGE RESULTS: ${stageSignals.length} signals from ${topSymbols.length} symbols (${stageErrors} errors)`);
      
      // Add stage signals to total
      allSignals.push(...stageSignals);
      
      // Only stop early if we have at least 3 good signals from any stage
      // Otherwise, continue to more relaxed stages to guarantee results
      if (allSignals.length >= 5) {
        console.log(`✅ Found ${allSignals.length} signals, sufficient for now`);
        break;
      }
      
      // Always try all profiles to maximize signal generation
    }
    
    // 3. Sort all signals by confidence score
    const sortedSignals = allSignals.sort((a, b) => b.confidence_score - a.confidence_score);
    
    // 4. Convert to TradingSignal format
    const tradingSignals = sortedSignals.map(convertToTradingSignal);
    
    // 5. Log final results
    console.log('\n🎯 === CLASSIC v2 GENERATION COMPLETE ===');
    console.log(`📊 Total Scanned: ${totalScanned} symbols`);
    console.log(`✅ Generated Signals: ${tradingSignals.length}`);
    console.log(`❌ Errors: ${totalErrors}`);
    
    if (tradingSignals.length > 0) {
      console.log('📈 Signal Distribution:');
      const executables = tradingSignals.filter(s => s.confidence >= 0.75).length;
      const balanced = tradingSignals.filter(s => s.confidence >= 0.55 && s.confidence < 0.75).length;
      const watchlist = tradingSignals.filter(s => s.confidence < 0.55).length;
      console.log(`   Executáveis (≥75%): ${executables}`);
      console.log(`   Balanceados (55-74%): ${balanced}`);
      console.log(`   Watchlist (<55%): ${watchlist}`);
      
      tradingSignals.forEach((signal, i) => {
        console.log(`   ${i + 1}. ${signal.symbol} ${signal.direction} - ${Math.round(signal.confidence * 100)}% ${signal.analysis?.slice(0, 50) || ''}`);
      });
    } else {
      console.log('⚠️ No signals generated - market conditions may be unfavorable');
    }
    
    return tradingSignals;
    
  } catch (error) {
    console.error('❌ Fatal error in Classic v2 generation:', error);
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