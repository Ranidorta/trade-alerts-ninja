import { TradingSignal, SignalResult } from "./types";

interface BybitKlineData {
  start_time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  turnover: string;
}

interface BybitApiResponse {
  retCode: number;
  retMsg: string;
  result: {
    symbol: string;
    category: string;
    list: string[][];
  };
}

/**
 * Fetches historical price data from Bybit API for signal validation
 */
async function fetchBybitHistoricalData(
  symbol: string,
  interval: string = '15',
  category: string = 'linear',
  limit: number = 200
): Promise<BybitKlineData[]> {
  const url = "https://api.bybit.com/v5/market/kline";
  const params = new URLSearchParams({
    category,
    symbol,
    interval,
    limit: limit.toString()
  });

  console.log(`📊 [BYBIT_API] Fetching historical data: ${url}?${params}`);

  try {
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BybitApiResponse = await response.json();

    if (data.retCode !== 0 || data.retMsg !== 'OK') {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }

    if (!data.result?.list || data.result.list.length === 0) {
      console.warn(`⚠️ [BYBIT_API] No data returned for ${symbol}`);
      return [];
    }

    // Convert Bybit response format to structured data
    const klineData: BybitKlineData[] = data.result.list.map(candle => ({
      start_time: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
      turnover: candle[6]
    }));

    console.log(`✅ [BYBIT_API] Retrieved ${klineData.length} candles for ${symbol}`);
    return klineData;

  } catch (error) {
    console.error(`❌ [BYBIT_API] Error fetching data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Validates a trading signal against historical price data from Bybit
 */
export async function validateSignalWithBybitData(signal: TradingSignal): Promise<TradingSignal> {
  try {
    console.log(`🔍 [SIGNAL_VALIDATION] Starting validation for signal ${signal.id} - ${signal.symbol}`);
    
    if (signal.result !== undefined && signal.result !== null && signal.result !== "PENDING") {
      console.log(`⏭️ [SIGNAL_VALIDATION] Signal ${signal.id} already validated: ${signal.result}`);
      return signal;
    }

    // Calculate time range for validation (24 hours from signal creation)
    const signalTime = new Date(signal.createdAt);
    const now = new Date();
    
    console.log(`📅 [SIGNAL_VALIDATION] Signal created: ${signalTime.toISOString()}, Current time: ${now.toISOString()}`);
    
    // Check if signal is from the future (invalid timestamps)
    if (signalTime > now) {
      console.warn(`⚠️ [SIGNAL_VALIDATION] Signal ${signal.id} has future timestamp - cannot validate`);
      return {
        ...signal,
        error: "Cannot validate signal with future timestamp"
      };
    }
    
    // Fetch historical data from Bybit API
    const historicalData = await fetchBybitHistoricalData(
      signal.symbol,
      '15', // 15-minute intervals for better precision
      'linear', // Linear derivatives for most crypto pairs
      200 // Maximum allowed by Bybit API
    );

    if (!historicalData || historicalData.length === 0) {
      console.warn(`❌ [SIGNAL_VALIDATION] No price data available for ${signal.symbol}`);
      return {
        ...signal,
        error: "No price data available for validation"
      };
    }

    // Convert historical data to price points
    const pricePoints = historicalData.map(candle => ({
      time: new Date(parseInt(candle.start_time)),
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close)
    }));

    // Filter price points to validation period (24 hours from signal creation)
    const endTime = new Date(signalTime.getTime() + 24 * 60 * 60 * 1000);
    const actualEndTime = endTime > now ? now : endTime;
    
    const relevantPrices = pricePoints.filter(p => 
      p.time >= signalTime && p.time <= actualEndTime
    );

    if (relevantPrices.length === 0) {
      console.warn(`❌ [SIGNAL_VALIDATION] No relevant price data in validation period for ${signal.symbol}`);
      return {
        ...signal,
        result: "PENDING",
        validationDetails: "No historical price data available for this time period"
      };
    }

    // Extract signal parameters
    const entryPrice = signal.entryPrice || 0;
    const stopLoss = signal.stopLoss || 0;
    const direction = signal.direction?.toUpperCase() || 'BUY';
    
    // Get target prices
    const targets = signal.targets || [];
    const tp1 = signal.tp1 || targets.find(t => t.level === 1)?.price || 0;
    const tp2 = signal.tp2 || targets.find(t => t.level === 2)?.price || 0;
    const tp3 = signal.tp3 || targets.find(t => t.level === 3)?.price || 0;

    console.log(`🎯 [SIGNAL_VALIDATION] Signal parameters:`, {
      symbol: signal.symbol,
      direction,
      entryPrice,
      stopLoss,
      tp1, tp2, tp3,
      validationPeriod: `${signalTime.toISOString()} to ${actualEndTime.toISOString()}`,
      pricePointsCount: relevantPrices.length
    });

    let result: SignalResult = "PENDING";
    let hitTargets: number[] = [];
    let maxPrice = Math.max(...relevantPrices.map(p => p.high));
    let minPrice = Math.min(...relevantPrices.map(p => p.low));
    let validationDetails = "";

    // Validate signal based on direction
    if (direction === 'BUY') {
      // For BUY signals, check if price went up to targets or down to stop loss
      const hitStopLoss = relevantPrices.some(p => p.low <= stopLoss);
      
      if (hitStopLoss) {
        result = "LOSER";
        validationDetails = `Stop Loss hit at ${stopLoss}. Min price: ${minPrice}`;
        console.log(`❌ [SIGNAL_VALIDATION] BUY signal stopped out at ${stopLoss}`);
      } else {
        // Check targets in order
        if (tp3 > 0 && relevantPrices.some(p => p.high >= tp3)) {
          hitTargets = [1, 2, 3];
          result = "WINNER";
          validationDetails = `All targets hit. TP3 reached at ${tp3}. Max price: ${maxPrice}`;
        } else if (tp2 > 0 && relevantPrices.some(p => p.high >= tp2)) {
          hitTargets = [1, 2];
          result = "PARTIAL";
          validationDetails = `TP2 reached at ${tp2}. Max price: ${maxPrice}`;
        } else if (tp1 > 0 && relevantPrices.some(p => p.high >= tp1)) {
          hitTargets = [1];
          result = "PARTIAL";
          validationDetails = `TP1 reached at ${tp1}. Max price: ${maxPrice}`;
        } else {
          // Check if signal expired (24+ hours old)
          if (now.getTime() - signalTime.getTime() > 24 * 60 * 60 * 1000) {
            result = "FALSE";
            validationDetails = `Signal expired after 24h without hitting targets. Max price: ${maxPrice}`;
          } else {
            result = "PENDING";
            validationDetails = `Still pending. Current max price: ${maxPrice}`;
          }
        }
      }
    } else {
      // For SELL signals, check if price went down to targets or up to stop loss
      const hitStopLoss = relevantPrices.some(p => p.high >= stopLoss);
      
      if (hitStopLoss) {
        result = "LOSER";
        validationDetails = `Stop Loss hit at ${stopLoss}. Max price: ${maxPrice}`;
        console.log(`❌ [SIGNAL_VALIDATION] SELL signal stopped out at ${stopLoss}`);
      } else {
        // Check targets (for SELL, targets should be below entry)
        if (tp3 > 0 && relevantPrices.some(p => p.low <= tp3)) {
          hitTargets = [1, 2, 3];
          result = "WINNER";
          validationDetails = `All targets hit. TP3 reached at ${tp3}. Min price: ${minPrice}`;
        } else if (tp2 > 0 && relevantPrices.some(p => p.low <= tp2)) {
          hitTargets = [1, 2];
          result = "PARTIAL";
          validationDetails = `TP2 reached at ${tp2}. Min price: ${minPrice}`;
        } else if (tp1 > 0 && relevantPrices.some(p => p.low <= tp1)) {
          hitTargets = [1];
          result = "PARTIAL";
          validationDetails = `TP1 reached at ${tp1}. Min price: ${minPrice}`;
        } else {
          // Check if signal expired (24+ hours old)
          if (now.getTime() - signalTime.getTime() > 24 * 60 * 60 * 1000) {
            result = "FALSE";
            validationDetails = `Signal expired after 24h without hitting targets. Min price: ${minPrice}`;
          } else {
            result = "PENDING";
            validationDetails = `Still pending. Current min price: ${minPrice}`;
          }
        }
      }
    }

    console.log(`✅ [SIGNAL_VALIDATION] Signal ${signal.id} validation complete:`, {
      result,
      hitTargets,
      validationDetails
    });

    // Update targets with hit status
    const updatedTargets = signal.targets?.map(target => ({
      ...target,
      hit: hitTargets.includes(target.level)
    })) || [];

    // Calculate profit if completed
    let profit = undefined;
    if (result === "WINNER" || result === "PARTIAL") {
      const highestHitTarget = Math.max(...hitTargets);
      const targetPrice = highestHitTarget === 3 ? tp3 : highestHitTarget === 2 ? tp2 : tp1;
      
      if (direction === 'BUY') {
        profit = ((targetPrice - entryPrice) / entryPrice) * 100;
      } else {
        profit = ((entryPrice - targetPrice) / entryPrice) * 100;
      }
    } else if (result === "LOSER") {
      if (direction === 'BUY') {
        profit = ((stopLoss - entryPrice) / entryPrice) * 100;
      } else {
        profit = ((entryPrice - stopLoss) / entryPrice) * 100;
      }
    }

    return {
      ...signal,
      result,
      status: result === "PENDING" ? "ACTIVE" : "COMPLETED",
      targets: updatedTargets,
      profit,
      verifiedAt: new Date().toISOString(),
      validationDetails,
      completedAt: result !== "PENDING" ? new Date().toISOString() : undefined
    };

  } catch (error) {
    console.error(`❌ [SIGNAL_VALIDATION] Error validating signal ${signal.id}:`, error);
    return {
      ...signal,
      error: error instanceof Error ? error.message : "Validation error"
    };
  }
}

/**
 * Validates multiple signals in batches to respect API rate limits
 */
export async function validateMultipleSignalsWithBybit(signals: TradingSignal[]): Promise<TradingSignal[]> {
  console.log(`🚀 [BATCH_VALIDATION] Starting batch validation of ${signals.length} signals using Bybit API`);
  
  const results: TradingSignal[] = [];
  
  // Process signals in small batches to avoid overwhelming the API
  const batchSize = 3;
  for (let i = 0; i < signals.length; i += batchSize) {
    const batch = signals.slice(i, i + batchSize);
    console.log(`📦 [BATCH_VALIDATION] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(signals.length/batchSize)}`);
    
    const batchResults = await Promise.all(
      batch.map(signal => validateSignalWithBybitData(signal))
    );
    
    results.push(...batchResults);
    
    // Add delay between batches to be respectful to the API
    if (i + batchSize < signals.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ [BATCH_VALIDATION] Completed batch validation of ${results.length} signals`);
  return results;
}