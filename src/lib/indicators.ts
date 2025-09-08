// Technical indicators library for Classic v2 signal generation

export interface KlineData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VWAPData {
  vwap: number;
  priceAbove: boolean;
  reclaimed: boolean;
  rejected: boolean;
}

export interface MACDData {
  value: number;
  signal: number;
  histogram: number;
  slope: number;
}

export interface VolumeData {
  current: number;
  sma20: number;
  zScore: number;
}

export interface PivotData {
  resistance: number[];
  support: number[];
}

export interface DivergenceData {
  bullish: boolean;
  bearish: boolean;
  confirmed: boolean;
}

// EMA calculation (9, 14, 21)
export const calculateEMA = (prices: number[], period: number): number[] => {
  if (prices.length < period) return [];
  
  const multiplier = 2 / (period + 1);
  const emas: number[] = [];
  
  // Start with SMA for first value
  let sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emas.push(sma);
  
  // Calculate EMA for remaining values
  for (let i = period; i < prices.length; i++) {
    const ema = (prices[i] * multiplier) + (emas[emas.length - 1] * (1 - multiplier));
    emas.push(ema);
  }
  
  return emas;
};

// VWAP calculation (Volume Weighted Average Price)
export const calculateVWAP = (klines: KlineData[]): VWAPData => {
  let cumulativeTPV = 0; // Typical Price * Volume
  let cumulativeVolume = 0;
  
  klines.forEach(kline => {
    const typicalPrice = (kline.high + kline.low + kline.close) / 3;
    cumulativeTPV += typicalPrice * kline.volume;
    cumulativeVolume += kline.volume;
  });
  
  const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
  const currentPrice = klines[klines.length - 1]?.close || 0;
  
  // Check for reclaim/reject patterns
  let reclaimed = false;
  let rejected = false;
  
  if (klines.length >= 3) {
    const last3 = klines.slice(-3);
    
    // Reclaim: price closes below VWAP, retests above, then closes above again
    if (last3[0].close < vwap && last3[1].close > vwap && last3[2].close > vwap) {
      reclaimed = true;
    }
    
    // Reject: price closes above VWAP, retests below, then closes below again
    if (last3[0].close > vwap && last3[1].close < vwap && last3[2].close < vwap) {
      rejected = true;
    }
  }
  
  return {
    vwap,
    priceAbove: currentPrice > vwap,
    reclaimed,
    rejected
  };
};

// MACD calculation (12, 26, 9)
export const calculateMACD = (prices: number[]): MACDData => {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  if (ema12.length === 0 || ema26.length === 0) {
    return { value: 0, signal: 0, histogram: 0, slope: 0 };
  }
  
  const macdLine: number[] = [];
  const minLength = Math.min(ema12.length, ema26.length);
  
  for (let i = 0; i < minLength; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  
  const signalLine = calculateEMA(macdLine, 9);
  const current = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1] || 0;
  const histogram = current - signal;
  
  // Calculate slope (last 3 periods)
  let slope = 0;
  if (macdLine.length >= 3) {
    const recent = macdLine.slice(-3);
    slope = (recent[2] - recent[0]) / 2; // Simple slope calculation
  }
  
  return {
    value: current,
    signal,
    histogram,
    slope
  };
};

// ATR calculation (14 periods)
export const calculateATR = (klines: KlineData[], period: number = 14): number => {
  if (klines.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < klines.length; i++) {
    const current = klines[i];
    const previous = klines[i - 1];
    
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    
    trueRanges.push(tr);
  }
  
  // Calculate ATR as SMA of true ranges
  const recentTRs = trueRanges.slice(-period);
  return recentTRs.reduce((a, b) => a + b, 0) / recentTRs.length;
};

// Volume analysis (SMA and Z-score)
export const calculateVolumeMetrics = (volumes: number[], period: number = 20): VolumeData => {
  const currentVolume = volumes[volumes.length - 1] || 0;
  
  if (volumes.length < period) {
    return {
      current: currentVolume,
      sma20: currentVolume,
      zScore: 0
    };
  }
  
  const recentVolumes = volumes.slice(-period);
  const sma20 = recentVolumes.reduce((a, b) => a + b, 0) / period;
  
  // Calculate standard deviation for z-score
  const variance = recentVolumes.reduce((acc, vol) => acc + Math.pow(vol - sma20, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  const zScore = stdDev > 0 ? (currentVolume - sma20) / stdDev : 0;
  
  return {
    current: currentVolume,
    sma20,
    zScore
  };
};

// Pivot/Fractal identification
export const calculatePivots = (klines: KlineData[], lookback: number = 5): PivotData => {
  const resistance: number[] = [];
  const support: number[] = [];
  
  if (klines.length < lookback * 2 + 1) {
    return { resistance, support };
  }
  
  // Look for pivot highs and lows
  for (let i = lookback; i < klines.length - lookback; i++) {
    const current = klines[i];
    let isHighPivot = true;
    let isLowPivot = true;
    
    // Check if current high is higher than surrounding highs
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && klines[j].high >= current.high) {
        isHighPivot = false;
      }
      if (j !== i && klines[j].low <= current.low) {
        isLowPivot = false;
      }
    }
    
    if (isHighPivot) resistance.push(current.high);
    if (isLowPivot) support.push(current.low);
  }
  
  // Return most recent levels
  return {
    resistance: resistance.slice(-3), // Last 3 resistance levels
    support: support.slice(-3)        // Last 3 support levels
  };
};

// Divergence detection (Price vs MACD)
export const detectDivergence = (prices: number[], macdValues: number[], lookback: number = 14): DivergenceData => {
  if (prices.length < lookback || macdValues.length < lookback) {
    return { bullish: false, bearish: false, confirmed: false };
  }
  
  const recentPrices = prices.slice(-lookback);
  const recentMACD = macdValues.slice(-lookback);
  
  // Find price highs and lows
  const priceHigh = Math.max(...recentPrices);
  const priceLow = Math.min(...recentPrices);
  const macdHigh = Math.max(...recentMACD);
  const macdLow = Math.min(...recentMACD);
  
  const priceHighIndex = recentPrices.lastIndexOf(priceHigh);
  const priceLowIndex = recentPrices.lastIndexOf(priceLow);
  const macdHighIndex = recentMACD.lastIndexOf(macdHigh);
  const macdLowIndex = recentMACD.lastIndexOf(macdLow);
  
  // Bearish divergence: price makes higher high, MACD makes lower high
  const bearishDivergence = 
    priceHighIndex > macdHighIndex && 
    recentPrices[priceHighIndex] > recentPrices[macdHighIndex] &&
    recentMACD[priceHighIndex] < recentMACD[macdHighIndex];
  
  // Bullish divergence: price makes lower low, MACD makes higher low
  const bullishDivergence = 
    priceLowIndex > macdLowIndex && 
    recentPrices[priceLowIndex] < recentPrices[macdLowIndex] &&
    recentMACD[priceLowIndex] > recentMACD[macdLowIndex];
  
  return {
    bullish: bullishDivergence,
    bearish: bearishDivergence,
    confirmed: bullishDivergence || bearishDivergence
  };
};

// EMA Stack validation
export const validateEMAStack = (ema9: number, ema14: number, ema21: number, direction: 'LONG' | 'SHORT'): boolean => {
  if (direction === 'LONG') {
    return ema9 > ema14 && ema14 > ema21;
  } else {
    return ema9 < ema14 && ema14 < ema21;
  }
};

// Support/Resistance proximity check
export const checkSRProximity = (price: number, srLevels: number[], minDistance: number): { tooClose: boolean; nearestLevel: number; distance: number } => {
  let nearestLevel = 0;
  let minDistanceFound = Infinity;
  
  srLevels.forEach(level => {
    const distance = Math.abs(price - level);
    if (distance < minDistanceFound) {
      minDistanceFound = distance;
      nearestLevel = level;
    }
  });
  
  return {
    tooClose: minDistanceFound < minDistance,
    nearestLevel,
    distance: minDistanceFound
  };
};

// Convert Bybit kline format to KlineData
export const parseBybitKlines = (bybitKlines: any[]): KlineData[] => {
  return bybitKlines.map(kline => ({
    timestamp: kline[0],
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5])
  })).reverse(); // Bybit returns newest first, we want oldest first
};