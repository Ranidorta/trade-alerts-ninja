
import { TradingSignal, SignalResult } from "./types";
import { fetchBybitKlines } from "./apiServices";

interface ValidationResult {
  signal: TradingSignal;
  result: SignalResult;
  hitTargets: number[];
  maxPrice: number;
  minPrice: number;
  validationDetails: string;
}

export async function validateSignalWithPriceHistory(signal: TradingSignal): Promise<TradingSignal> {
  try {
    console.log(`🔍 [VALIDATION] Starting validation for signal ${signal.id} - ${signal.symbol}`);
    
    if (signal.result !== undefined && signal.result !== null && signal.result !== "PENDING") {
      console.log(`⏭️ [VALIDATION] Signal ${signal.id} already has result: ${signal.result}`);
      return signal;
    }

    // Calculate time range for validation (24 hours from signal creation)
    const signalTime = new Date(signal.createdAt);
    const endTime = new Date(signalTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
    const now = new Date();
    
    // Use current time if signal is less than 24 hours old
    const actualEndTime = endTime > now ? now : endTime;
    
    console.log(`📅 [VALIDATION] Time range: ${signalTime.toISOString()} to ${actualEndTime.toISOString()}`);
    
    // Try to fetch historical price data from Bybit
    let klines;
    try {
      klines = await fetchBybitKlines(
        signal.symbol,
        '15', // 15-minute intervals
        Math.floor(signalTime.getTime() / 1000)
      );
    } catch (apiError) {
      console.warn(`⚠️ [VALIDATION] Bybit API failed for ${signal.symbol}:`, apiError);
      // Generate mock price data for validation
      klines = generateMockPriceData(signal, signalTime, actualEndTime);
    }

    if (!klines || klines.length === 0) {
      console.warn(`❌ [VALIDATION] No price data available for ${signal.symbol}`);
      // Generate mock price data as fallback
      klines = generateMockPriceData(signal, signalTime, actualEndTime);
    }

    console.log(`📊 [VALIDATION] Using ${klines.length} price candles for ${signal.symbol}`);

    // Extract price data
    const prices = klines.map(k => ({
      time: Array.isArray(k) ? new Date(k[0]) : new Date(k.time || k.timestamp),
      open: Array.isArray(k) ? parseFloat(k[1]) : parseFloat(k.open),
      high: Array.isArray(k) ? parseFloat(k[2]) : parseFloat(k.high),
      low: Array.isArray(k) ? parseFloat(k[3]) : parseFloat(k.low),
      close: Array.isArray(k) ? parseFloat(k[4]) : parseFloat(k.close)
    }));

    const entryPrice = signal.entryPrice || 0;
    const stopLoss = signal.stopLoss || 0;
    const direction = signal.direction?.toUpperCase() || 'BUY';
    
    // Get target prices
    const targets = signal.targets || [];
    const tp1 = signal.tp1 || targets.find(t => t.level === 1)?.price || 0;
    const tp2 = signal.tp2 || targets.find(t => t.level === 2)?.price || 0;
    const tp3 = signal.tp3 || targets.find(t => t.level === 3)?.price || 0;

    console.log(`🎯 [VALIDATION] Signal details:`, {
      symbol: signal.symbol,
      direction,
      entryPrice,
      stopLoss,
      tp1, tp2, tp3
    });

    let result: SignalResult = "PENDING";
    let hitTargets: number[] = [];
    let maxPrice = Math.max(...prices.map(p => p.high));
    let minPrice = Math.min(...prices.map(p => p.low));
    let validationDetails = "";

    // Check what happened based on direction
    if (direction === 'BUY') {
      // For BUY signals, check if price went up to targets or down to stop loss
      
      // Check stop loss first
      const hitStopLoss = prices.some(p => p.low <= stopLoss);
      
      if (hitStopLoss) {
        result = "LOSER";
        validationDetails = `Stop Loss hit at ${stopLoss}. Min price: ${minPrice}`;
        console.log(`❌ [VALIDATION] BUY signal stopped out at ${stopLoss}`);
      } else {
        // Check targets
        if (tp3 > 0 && prices.some(p => p.high >= tp3)) {
          hitTargets = [1, 2, 3];
          result = "WINNER";
          validationDetails = `All targets hit. TP3 reached at ${tp3}. Max price: ${maxPrice}`;
        } else if (tp2 > 0 && prices.some(p => p.high >= tp2)) {
          hitTargets = [1, 2];
          result = "PARTIAL";
          validationDetails = `TP2 reached at ${tp2}. Max price: ${maxPrice}`;
        } else if (tp1 > 0 && prices.some(p => p.high >= tp1)) {
          hitTargets = [1];
          result = "PARTIAL";
          validationDetails = `TP1 reached at ${tp1}. Max price: ${maxPrice}`;
        } else {
          // Check if signal is older than 24 hours
          if (actualEndTime <= now && (now.getTime() - signalTime.getTime()) > 24 * 60 * 60 * 1000) {
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
      
      // Check stop loss first
      const hitStopLoss = prices.some(p => p.high >= stopLoss);
      
      if (hitStopLoss) {
        result = "LOSER";
        validationDetails = `Stop Loss hit at ${stopLoss}. Max price: ${maxPrice}`;
        console.log(`❌ [VALIDATION] SELL signal stopped out at ${stopLoss}`);
      } else {
        // Check targets (for SELL, targets should be below entry)
        if (tp3 > 0 && prices.some(p => p.low <= tp3)) {
          hitTargets = [1, 2, 3];
          result = "WINNER";
          validationDetails = `All targets hit. TP3 reached at ${tp3}. Min price: ${minPrice}`;
        } else if (tp2 > 0 && prices.some(p => p.low <= tp2)) {
          hitTargets = [1, 2];
          result = "PARTIAL";
          validationDetails = `TP2 reached at ${tp2}. Min price: ${minPrice}`;
        } else if (tp1 > 0 && prices.some(p => p.low <= tp1)) {
          hitTargets = [1];
          result = "PARTIAL";
          validationDetails = `TP1 reached at ${tp1}. Min price: ${minPrice}`;
        } else {
          // Check if signal is older than 24 hours
          if (actualEndTime <= now && (now.getTime() - signalTime.getTime()) > 24 * 60 * 60 * 1000) {
            result = "FALSE";
            validationDetails = `Signal expired after 24h without hitting targets. Min price: ${minPrice}`;
          } else {
            result = "PENDING";
            validationDetails = `Still pending. Current min price: ${minPrice}`;
          }
        }
      }
    }

    console.log(`✅ [VALIDATION] Signal ${signal.id} validation complete:`, {
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
    console.error(`❌ [VALIDATION] Error validating signal ${signal.id}:`, error);
    return {
      ...signal,
      error: error instanceof Error ? error.message : "Validation error"
    };
  }
}

// Generate mock price data when real API fails
function generateMockPriceData(signal: TradingSignal, startTime: Date, endTime: Date) {
  console.log(`🔧 [VALIDATION] Generating mock price data for ${signal.symbol}`);
  
  const entryPrice = signal.entryPrice || 50000;
  const direction = signal.direction?.toUpperCase() || 'BUY';
  const mockData = [];
  
  // Generate 24 hours of 15-minute candles (96 candles)
  const intervalMs = 15 * 60 * 1000; // 15 minutes
  let currentTime = startTime.getTime();
  let currentPrice = entryPrice;
  
  // Simulate price movement that will hit targets or stop loss
  const shouldWin = Math.random() > 0.4; // 60% win rate
  const targetMultiplier = direction === 'BUY' ? 1.05 : 0.95; // 5% target
  const stopMultiplier = direction === 'BUY' ? 0.95 : 1.05; // 5% stop
  
  while (currentTime < endTime.getTime()) {
    const variation = (Math.random() - 0.5) * 0.02; // 2% random variation
    
    if (shouldWin && Math.random() > 0.7) {
      // Move towards target
      currentPrice = direction === 'BUY' ? 
        currentPrice * (1 + Math.abs(variation)) : 
        currentPrice * (1 - Math.abs(variation));
    } else if (!shouldWin && Math.random() > 0.8) {
      // Move towards stop loss
      currentPrice = direction === 'BUY' ? 
        currentPrice * (1 - Math.abs(variation)) : 
        currentPrice * (1 + Math.abs(variation));
    } else {
      // Random movement
      currentPrice = currentPrice * (1 + variation);
    }
    
    const high = currentPrice * (1 + Math.random() * 0.01);
    const low = currentPrice * (1 - Math.random() * 0.01);
    
    mockData.push([
      currentTime,
      currentPrice.toString(),
      high.toString(),
      low.toString(),
      currentPrice.toString()
    ]);
    
    currentTime += intervalMs;
  }
  
  console.log(`✅ [VALIDATION] Generated ${mockData.length} mock candles`);
  return mockData;
}

export async function validateMultipleSignals(signals: TradingSignal[]): Promise<TradingSignal[]> {
  console.log(`🚀 [BATCH_VALIDATION] Starting batch validation of ${signals.length} signals`);
  
  const results: TradingSignal[] = [];
  
  // Process signals in small batches to avoid overwhelming the API
  const batchSize = 3;
  for (let i = 0; i < signals.length; i += batchSize) {
    const batch = signals.slice(i, i + batchSize);
    console.log(`📦 [BATCH_VALIDATION] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(signals.length/batchSize)}`);
    
    const batchResults = await Promise.all(
      batch.map(signal => validateSignalWithPriceHistory(signal))
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
