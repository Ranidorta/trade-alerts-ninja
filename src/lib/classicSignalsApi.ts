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

// Core parameters - Classic v2 Professional
const CLASSIC_V2_CONFIG = {
  // Timeframes
  TREND_TIMEFRAME: '15',     // 15m for trend analysis
  EXECUTION_TIMEFRAME: '5',  // 5m for execution
  
  // Asset filtering (relaxed for more opportunities)
  MIN_24H_TURNOVER: 5_000_000,   // 5 million USDT minimum (relaxed)
  TOP_VOLUME_COUNT: 100,         // Expanded universe to top 100 by volume
  
  // Volume requirements (flexible for different setups)
  MIN_VOLUME_ZSCORE: 1.0,        // Z-Score ≥ +1.0 (strict for breakouts)
  MIN_VOLUME_MULTIPLE: 1.2,      // Volume ≥ 1.2 × SMA(20) (strict for breakouts)
  PULLBACK_VOLUME_ZSCORE: 0.0,   // Relaxed for pullbacks (≥ 0.0)
  PULLBACK_VOLUME_MULTIPLE: 1.0, // Normal volume OK for pullbacks (≥ 1.0×SMA)
  
  // Risk management
  MIN_RR_RATIO: 1.6,             // Minimum 1.6:1 R/R
  ATR_SL_COEFF: 0.8,             // Stop Loss = 0.8 × ATR(14)
  COOLDOWN_CANDLES: 5,           // 5 candles after STOP or TP2
  
  // Entry validation (slightly relaxed)
  EMA21_TOUCH_TOLERANCE: 0.01,   // 1.0% tolerance for EMA21 touch (relaxed)
  MIN_SR_DISTANCE: 0.4,          // Minimum 0.4×SL distance from S/R (relaxed)
  TREND_TOLERANCE: 0.002,        // 0.2% tolerance for near EMA stack
  
  // Confidence scoring
  MIN_CONFIDENCE_SCORE: 60,      // Minimum score to publish
  EXECUTABLE_SCORE: 75,          // Score for "executável" tag
  
  // Position sizing (2% risk per trade)
  RISK_PER_TRADE: 0.02
};

// Create axios instance for API calls
const classicV2Api = axios.create({
  timeout: 15000,
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
  rr_ratio: number;
  indicators: {
    ema9: number;
    ema14: number;
    ema21: number;
    vwap: number;
    macd: { value: number; signal: number; slope: number };
    atr14: number;
    volume: { current: number; sma20: number; zscore: number };
  };
  context: {
    trend_15m: string;
    vwap_state: string;
    setup_type: string;
    divergence: string;
    nearest_sr: { type: string; price: number; distance: number };
  };
  confidence_score: number;
  is_executable: boolean;
  signal_logic: string;
  cooldown_until: string;
}

// Get Bybit tickers with 24h turnover for prioritization
const getBybitTickersWithTurnover = async (): Promise<SymbolInfo[]> => {
  try {
    console.log('🔍 Fetching Bybit USDT perpetual symbols with turnover data...');
    
    const response = await classicV2Api.get(`${BYBIT_API_BASE}/market/tickers`, {
      params: { category: 'linear' }
    });
    
    if (!response.data?.result?.list) {
      throw new Error('Invalid response format from Bybit tickers API');
    }
    
    const symbols = response.data.result.list
      .filter((ticker: any) => 
        ticker.symbol?.endsWith('USDT') && 
        parseFloat(ticker.turnover24h || '0') >= CLASSIC_V2_CONFIG.MIN_24H_TURNOVER
      )
      .map((ticker: any) => ({
        symbol: ticker.symbol,
        turnover24h: parseFloat(ticker.turnover24h)
      }))
      .sort((a: SymbolInfo, b: SymbolInfo) => b.turnover24h - a.turnover24h)
      .slice(0, CLASSIC_V2_CONFIG.TOP_VOLUME_COUNT); // Take top N by volume
    
    console.log(`✅ Found ${symbols.length} qualifying symbols (turnover >= ${CLASSIC_V2_CONFIG.MIN_24H_TURNOVER.toLocaleString()} USDT)`);
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
    const response = await classicV2Api.get(`${BYBIT_API_BASE}/market/kline`, {
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

// Check if symbol is in cooldown (5 candles = 25 minutes)
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
      getBybitKlines(symbol, CLASSIC_V2_CONFIG.TREND_TIMEFRAME, 200),
      getBybitKlines(symbol, CLASSIC_V2_CONFIG.EXECUTION_TIMEFRAME, 100)
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
    
    // === 1. TREND ANALYSIS (15m timeframe) ===
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
    
    // Determine trend direction (15m) with soft tolerance
    let trendDirection: 'LONG' | 'SHORT' | null = null;
    let trend15mState = '';
    const tol = CLASSIC_V2_CONFIG.TREND_TOLERANCE;
    
    const strictLong = validateEMAStack(currentEMA9_15m, currentEMA14_15m, currentEMA21_15m, 'LONG') && currentPrice15m >= currentEMA9_15m * (1 - tol);
    const strictShort = validateEMAStack(currentEMA9_15m, currentEMA14_15m, currentEMA21_15m, 'SHORT') && currentPrice15m <= currentEMA9_15m * (1 + tol);
    
    // Soft stack: allow slight overlaps within tolerance
    const softLong = (currentEMA9_15m > currentEMA21_15m) && (currentEMA14_15m >= currentEMA21_15m * (1 - tol)) && (currentEMA14_15m <= currentEMA9_15m * (1 + tol)) && currentPrice15m >= currentEMA9_15m * (1 - tol);
    const softShort = (currentEMA9_15m < currentEMA21_15m) && (currentEMA14_15m <= currentEMA21_15m * (1 + tol)) && (currentEMA14_15m >= currentEMA9_15m * (1 - tol)) && currentPrice15m <= currentEMA9_15m * (1 + tol);
    
    if (strictLong || softLong) {
      trendDirection = 'LONG';
      trend15mState = 'LONG: EMA stack (soft/strict) + preço ~ EMA9';
    } else if (strictShort || softShort) {
      trendDirection = 'SHORT';
      trend15mState = 'SHORT: EMA stack (soft/strict) + preço ~ EMA9';
    }
    
    if (!trendDirection) {
      console.log(`❌ ${symbol}: trend not established on 15m`);
      return null;
    }
    
    // === 2. EXECUTION TIMEFRAME ANALYSIS (5m) ===
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
    
    // Check if 5m follows 15m trend
    const mtfAlignment = validateEMAStack(currentEMA9_5m, currentEMA14_5m, currentEMA21_5m, trendDirection);
    
    // === 3. VWAP ANALYSIS ===
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
    
    // MTF rule: 5m must follow 15m direction OR be on correct VWAP side (reclaim/reject or position)
    if (!mtfAlignment && !vwapCondition) {
      console.log(`❌ ${symbol}: 5m diverges and VWAP not favorable`);
      return null;
    }
    
    // === 4. MACD ANALYSIS ===
    const macdData = calculateMACD(prices5m);
    const macdFavor = trendDirection === 'LONG' ? macdData.slope > 0 : macdData.slope < 0;
    
    // === 5. VOLUME ANALYSIS ===
    const volumes5m = data5m.map(k => k.volume);
    const volumeMetrics = calculateVolumeMetrics(volumes5m);
    
    // Volume validation will be checked per setup type (more flexible approach)
    
    // === 6. ENTRY TRIGGERS ===
    let setupType = '';
    let entryValid = false;
    
    // A) Pullback entry (preferred) - relaxed volume requirements
    const lastKline5m = data5m[data5m.length - 1];
    if (trendDirection === 'LONG') {
      const touchTol = CLASSIC_V2_CONFIG.EMA21_TOUCH_TOLERANCE;
      const emaTouchRef = Math.max(currentEMA21_5m * (1 + touchTol), currentEMA14_5m * (1 + touchTol));
      const touchedPullback = lastKline5m.low <= emaTouchRef; // allow EMA21 or EMA14 zone
      const closedAboveEMA9 = lastKline5m.close > currentEMA9_5m;
      const pullbackVolumeOk = volumeMetrics.zScore >= CLASSIC_V2_CONFIG.PULLBACK_VOLUME_ZSCORE || 
                               volumeMetrics.current >= volumeMetrics.sma20 * CLASSIC_V2_CONFIG.PULLBACK_VOLUME_MULTIPLE;
      
      if (touchedPullback && closedAboveEMA9 && macdFavor && pullbackVolumeOk) {
        setupType = 'Pullback EMA21/EMA14 + fechamento acima EMA9';
        entryValid = true;
      }
    } else {
      const touchTol = CLASSIC_V2_CONFIG.EMA21_TOUCH_TOLERANCE;
      const emaTouchRef = Math.min(currentEMA21_5m * (1 - touchTol), currentEMA14_5m * (1 - touchTol));
      const touchedPullback = lastKline5m.high >= emaTouchRef; // allow EMA21 or EMA14 zone
      const closedBelowEMA9 = lastKline5m.close < currentEMA9_5m;
      const pullbackVolumeOk = volumeMetrics.zScore >= CLASSIC_V2_CONFIG.PULLBACK_VOLUME_ZSCORE || 
                               volumeMetrics.current >= volumeMetrics.sma20 * CLASSIC_V2_CONFIG.PULLBACK_VOLUME_MULTIPLE;
      
      if (touchedPullback && closedBelowEMA9 && macdFavor && pullbackVolumeOk) {
        setupType = 'Pullback EMA21/EMA14 + fechamento abaixo EMA9';
        entryValid = true;
      }
    }
    
    // B) Breakout + Retest (if pullback not found) - strict volume requirements
    if (!entryValid) {
      // Strict volume validation for breakouts
      const breakoutVolumeOk = volumeMetrics.zScore >= CLASSIC_V2_CONFIG.MIN_VOLUME_ZSCORE || 
                               volumeMetrics.current >= volumeMetrics.sma20 * CLASSIC_V2_CONFIG.MIN_VOLUME_MULTIPLE;
      
      if (!breakoutVolumeOk) {
        console.log(`❌ ${symbol}: volume requirements not met for breakout (z-score: ${volumeMetrics.zScore.toFixed(2)}, multiple: ${(volumeMetrics.current / volumeMetrics.sma20).toFixed(2)})`);
        return null;
      }
      
      // Look for range breakout with volume confirmation
      const recentHighs = data5m.slice(-10).map(k => k.high);
      const recentLows = data5m.slice(-10).map(k => k.low);
      const rangeHigh = Math.max(...recentHighs.slice(0, -2));
      const rangeLow = Math.min(...recentLows.slice(0, -2));
      
      if (trendDirection === 'LONG' && currentPrice5m > rangeHigh && macdFavor) {
        setupType = 'Rompimento + Reteste (Alta)';
        entryValid = true;
      } else if (trendDirection === 'SHORT' && currentPrice5m < rangeLow && macdFavor) {
        setupType = 'Rompimento + Reteste (Baixa)';
        entryValid = true;
      }
    }
    
    if (!entryValid) {
      console.log(`❌ ${symbol}: entry conditions not met`);
      return null;
    }
    
    // === 7. DIVERGENCE CHECK ===
    const macdValues = data5m.map((_, i) => {
      if (i < 12) return 0;
      const slicePrices = data5m.slice(Math.max(0, i - 25), i + 1).map(k => k.close);
      return calculateMACD(slicePrices).value;
    });
    
    const divergence = detectDivergence(prices5m.slice(-20), macdValues.slice(-20));
    let divergenceState = 'none';
    
    // Block signal if divergence is against the trend
    if ((trendDirection === 'LONG' && divergence.bearish) || (trendDirection === 'SHORT' && divergence.bullish)) {
      console.log(`❌ ${symbol}: divergence against trend`);
      return null;
    }
    
    if (divergence.bullish) divergenceState = 'bullish';
    if (divergence.bearish) divergenceState = 'bearish';
    
    // === 8. SUPPORT/RESISTANCE CHECK ===
    const pivots = calculatePivots(data5m);
    const allSRLevels = [...pivots.resistance, ...pivots.support];
    const atr = calculateATR(data5m);
    
    const dynamicSL = trendDirection === 'LONG'
      ? Math.max(
          data5m.slice(-5).reduce((min, k) => Math.min(min, k.low), Infinity),
          currentEMA21_5m - (CLASSIC_V2_CONFIG.ATR_SL_COEFF * atr)
        )
      : Math.min(
          data5m.slice(-5).reduce((max, k) => Math.max(max, k.high), -Infinity),
          currentEMA21_5m + (CLASSIC_V2_CONFIG.ATR_SL_COEFF * atr)
        );
    
    const minSRDistance = Math.abs(currentPrice5m - dynamicSL) * CLASSIC_V2_CONFIG.MIN_SR_DISTANCE;
    const srCheck = checkSRProximity(currentPrice5m, allSRLevels, minSRDistance);
    
    if (srCheck.tooClose) {
      console.log(`❌ ${symbol}: too close to S/R level at ${srCheck.nearestLevel}`);
      return null;
    }
    
    // === 9. RISK/REWARD CALCULATION ===
    const entryPrice = currentPrice5m;
    const entryZone: [number, number] = [entryPrice * 0.999, entryPrice * 1.001]; // Tight entry zone
    
    // Take Profits: TP1=1R, TP2=2R, TP3=3R ou próxima S/R
    const riskAmount = Math.abs(entryPrice - dynamicSL);
    const tp1 = trendDirection === 'LONG' ? entryPrice + riskAmount : entryPrice - riskAmount;
    const tp2 = trendDirection === 'LONG' ? entryPrice + (2 * riskAmount) : entryPrice - (2 * riskAmount);
    const tp3 = trendDirection === 'LONG' ? entryPrice + (3 * riskAmount) : entryPrice - (3 * riskAmount);
    
    // Check minimum R/R ratio using TP2 (FIXED BUG)
    const rewardTP2 = Math.abs(tp2 - entryPrice); // TP2 = 2R
    const rrRatio = riskAmount > 0 ? rewardTP2 / riskAmount : 0; // Should be 2:1 for TP2
    
    if (riskAmount <= 0 || rrRatio < CLASSIC_V2_CONFIG.MIN_RR_RATIO) {
      console.log(`❌ ${symbol}: R/R ratio ${rrRatio.toFixed(2)} below minimum ${CLASSIC_V2_CONFIG.MIN_RR_RATIO}`);
      return null;
    }
    
    // === 10. CONFIDENCE SCORING (0-100) ===
    let score = 0;
    const reasons: string[] = [];
    
    // +25 EMA stack alignment (15m and 5m)
    if (mtfAlignment) {
      score += 25;
      reasons.push(`Stack EMA alinhado em 15m/5m`);
    }
    
    // +15 VWAP position or reclaim/reject
    if (vwapCondition) {
      score += 15;
      reasons.push(`VWAP ${vwapState}`);
    }
    
    // +15 MACD slope + histogram favorable
    if (macdFavor && Math.abs(macdData.histogram) > 0) {
      score += 15;
      reasons.push(`MACD slope ${trendDirection === 'LONG' ? 'positivo' : 'negativo'}`);
    }
    
    // +15 Volume conditions met (adjusted for setup type)
    const volumeScore = setupType.includes('Pullback') ? 
      (volumeMetrics.zScore >= CLASSIC_V2_CONFIG.PULLBACK_VOLUME_ZSCORE || 
       volumeMetrics.current >= volumeMetrics.sma20 * CLASSIC_V2_CONFIG.PULLBACK_VOLUME_MULTIPLE) :
      (volumeMetrics.zScore >= CLASSIC_V2_CONFIG.MIN_VOLUME_ZSCORE || 
       volumeMetrics.current >= volumeMetrics.sma20 * CLASSIC_V2_CONFIG.MIN_VOLUME_MULTIPLE);
       
    if (volumeScore) {
      score += 15;
      const volType = volumeMetrics.zScore >= 1.0 ? 
        `alto (z-score: ${volumeMetrics.zScore.toFixed(1)})` : 
        `adequado (${(volumeMetrics.current / volumeMetrics.sma20).toFixed(1)}x SMA)`;
      reasons.push(`Volume ${volType}`);
    }
    
    // +15 Setup quality (pullback is preferred)
    if (setupType.includes('Pullback')) {
      score += 15;
      reasons.push(`Setup ideal: ${setupType}`);
    } else if (setupType.includes('Rompimento')) {
      score += 10;
      reasons.push(`Setup válido: ${setupType}`);
    }
    
    // +15 R/R ≥ 2.0
    const overallRR = Math.abs(tp2 - entryPrice) / riskAmount;
    if (overallRR >= 2.0) {
      score += 15;
      reasons.push(`R/R favorável (${overallRR.toFixed(1)}:1)`);
    }
    
    // Penalizations
    if (divergence.bearish || divergence.bullish) {
      score -= 10;
      reasons.push(`Divergência detectada`);
    }
    
    if (srCheck.distance < minSRDistance * 2) {
      score -= 5;
      reasons.push(`Próximo a S/R em ${srCheck.nearestLevel.toFixed(6)}`);
    }
    
    // Final validation
    if (score < CLASSIC_V2_CONFIG.MIN_CONFIDENCE_SCORE) {
      console.log(`❌ ${symbol}: confidence score ${score} below minimum ${CLASSIC_V2_CONFIG.MIN_CONFIDENCE_SCORE}`);
      return null;
    }
    
    // === 11. BUILD SIGNAL ===
    const isExecutable = score >= CLASSIC_V2_CONFIG.EXECUTABLE_SCORE;
    const cooldownUntil = new Date(Date.now() + (25 * 60 * 1000)).toISOString(); // 25 minutes
    
    const signalLogic = [
      `Tendência 15m: ${trend15mState}`,
      `Setup 5m: ${setupType}`,
      `MACD slope: ${macdData.slope > 0 ? 'positivo' : 'negativo'}`,
      `Volume: z-score ${volumeMetrics.zScore.toFixed(1)}`,
      `VWAP: ${vwapState}`,
      `R/R: ${overallRR.toFixed(1)}:1`
    ].join(' | ');
    
    const signal: ClassicV2Signal = {
      symbol,
      side: trendDirection,
      timeframes: { 
        trend: `${CLASSIC_V2_CONFIG.TREND_TIMEFRAME}m`, 
        execution: `${CLASSIC_V2_CONFIG.EXECUTION_TIMEFRAME}m` 
      },
      entry_zone: entryZone,
      stop_loss: dynamicSL,
      take_profits: [tp1, tp2, tp3],
      rr_ratio: overallRR,
      indicators: {
        ema9: currentEMA9_5m,
        ema14: currentEMA14_5m,
        ema21: currentEMA21_5m,
        vwap: vwapData.vwap,
        macd: { 
          value: macdData.value, 
          signal: macdData.signal, 
          slope: macdData.slope 
        },
        atr14: atr,
        volume: { 
          current: volumeMetrics.current, 
          sma20: volumeMetrics.sma20, 
          zscore: volumeMetrics.zScore 
        }
      },
      context: {
        trend_15m: trend15mState,
        vwap_state: vwapState,
        setup_type: setupType,
        divergence: divergenceState,
        nearest_sr: { 
          type: srCheck.nearestLevel > currentPrice5m ? 'resistance' : 'support',
          price: srCheck.nearestLevel,
          distance: srCheck.distance
        }
      },
      confidence_score: score,
      is_executable: isExecutable,
      signal_logic: signalLogic,
      cooldown_until: cooldownUntil
    };
    
    console.log(`✅ ${symbol}: Classic v2 signal generated (Score: ${score}, ${isExecutable ? 'EXECUTÁVEL' : 'WATCHLIST'})`);
    return signal;
    
  } catch (error) {
    console.error(`❌ Error analyzing ${symbol}:`, error);
    return null;
  }
};

// Convert ClassicV2Signal to TradingSignal format
const convertToTradingSignal = (signal: ClassicV2Signal): TradingSignal => {
  const now = new Date();
  
  return {
    id: `classic-v2-${signal.symbol}-${now.getTime()}`,
    symbol: signal.symbol,
    type: signal.side, // LONG or SHORT
    direction: signal.side === 'LONG' ? 'BUY' : 'SELL',
    strategy: 'classic_v2',
    
    // Entry and targets
    entryMin: signal.entry_zone[0],
    entryMax: signal.entry_zone[1],
    entryPrice: (signal.entry_zone[0] + signal.entry_zone[1]) / 2,
    stopLoss: signal.stop_loss,
    targets: signal.take_profits.map((price, index) => ({
      level: index + 1,
      price: price,
      hit: false
    })),
    
    // Technical indicators
    technicalIndicators: {
      rsi: 50, // Neutral for Classic v2
      macd: signal.indicators.macd.value,
      macdSignal: signal.indicators.macd.signal,
      shortMa: signal.indicators.ema9,
      longMa: signal.indicators.ema21,
      signal: signal.side === 'LONG' ? 1 : -1
    },
    
    // Additional technical data
    atr: signal.indicators.atr14,
    
    // Signal metadata
    confidence: signal.confidence_score / 100,
    reason: signal.signal_logic,
    timeframe: signal.timeframes.execution,
    
    // Status
    status: 'ACTIVE',
    createdAt: now.toISOString(),
    
    // Risk management
    risk_reward_ratio: signal.rr_ratio,
    
    // Analysis details
    analysis: [
      `Tendência: ${signal.context.trend_15m}`,
      `Setup: ${signal.context.setup_type}`,
      `VWAP: ${signal.context.vwap_state}`,
      `Score: ${signal.confidence_score}`,
      signal.is_executable ? '✅ EXECUTÁVEL' : '📋 WATCHLIST'
    ].join(' | '),
    
    // Additional notes
    notes: [
      'Classic v2',
      signal.is_executable ? 'Executável' : 'Watchlist',
      signal.side,
      signal.context.setup_type
    ].join(', ')
  };
};

// Main function to generate Classic v2 signals
export const generateClassicV2Signals = async (): Promise<TradingSignal[]> => {
  try {
    console.log('🚀 Starting Classic v2 signal generation...');
    console.log(`📊 Targeting top ${CLASSIC_V2_CONFIG.TOP_VOLUME_COUNT} USDT perpetuals by volume`);
    
    // Get prioritized symbols
    const symbols = await getBybitTickersWithTurnover();
    
    if (symbols.length === 0) {
      console.log('❌ No qualifying symbols found');
      return [];
    }
    
    console.log(`🔍 Analyzing ${symbols.length} symbols for Classic v2 signals...`);
    
    // Analyze symbols in parallel (but limit concurrency)
    const maxConcurrent = 5;
    const signals: ClassicV2Signal[] = [];
    
    for (let i = 0; i < symbols.length; i += maxConcurrent) {
      const batch = symbols.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(({ symbol }) => analyzeSymbolForSignal(symbol));
      const batchResults = await Promise.all(batchPromises);
      
      // Filter out null results and add to signals
      const validSignals = batchResults.filter((signal): signal is ClassicV2Signal => signal !== null);
      signals.push(...validSignals);
      
      // Respect rate limits
      if (i + maxConcurrent < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (signals.length === 0) {
      console.log('❌ No Classic v2 signals generated this cycle');
      return [];
    }
    
    // Sort by confidence score (highest first)
    signals.sort((a, b) => b.confidence_score - a.confidence_score);
    
    console.log(`✅ Generated ${signals.length} Classic v2 signals`);
    console.log(`📈 Executable signals: ${signals.filter(s => s.is_executable).length}`);
    console.log(`📋 Watchlist signals: ${signals.filter(s => !s.is_executable).length}`);
    
    // Convert to TradingSignal format
    return signals.map(convertToTradingSignal);
    
  } catch (error) {
    console.error('❌ Error in Classic v2 signal generation:', error);
    return [];
  }
};

// Health check for Classic v2 agent
export const classicV2HealthCheck = async (): Promise<{ status: string; message: string }> => {
  try {
    console.log('🏥 Classic v2 health check...');
    
    // Test Bybit API connectivity
    const response = await classicV2Api.get(`${BYBIT_API_BASE}/market/tickers`, {
      params: { category: 'linear', limit: 1 }
    });
    
    if (response.data?.result?.list?.length > 0) {
      return {
        status: 'healthy',
        message: `Classic v2 agent operational. Bybit API accessible. Config: ${CLASSIC_V2_CONFIG.TOP_VOLUME_COUNT} symbols, min turnover ${CLASSIC_V2_CONFIG.MIN_24H_TURNOVER.toLocaleString()} USDT`
      };
    } else {
      return {
        status: 'degraded',
        message: 'Bybit API response format unexpected'
      };
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Classic v2 agent error: ${error}`
    };
  }
};

// Export configuration for debugging/monitoring
export const getClassicV2Config = () => CLASSIC_V2_CONFIG;