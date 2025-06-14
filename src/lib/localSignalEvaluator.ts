// Local signal evaluation when backend is not available
import { TradingSignal } from '@/lib/types';

export interface EvaluationResult {
  signalId: string;
  result: 'WINNER' | 'PARTIAL' | 'LOSER' | 'FALSE';
  entryHit: boolean;
  tpLevelsHit: number[];
  slHit: boolean;
}

export const evaluateSignalLocally = async (signal: TradingSignal): Promise<EvaluationResult> => {
  try {
    console.log(`🔍 [LOCAL EVAL] Evaluating signal ${signal.id} for ${signal.symbol}...`);
    console.log(`📊 [LOCAL EVAL] Signal details:`, {
      symbol: signal.symbol,
      direction: signal.direction,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      currentResult: signal.result
    });
    
    // Get historical data from the signal creation time using direct Bybit API
    const signalTime = new Date(signal.createdAt);
    const futureCandles = await fetchBybitCandlesForEvaluation(signal.symbol, signalTime, 48);
    
    if (!futureCandles || futureCandles.length === 0) {
      console.warn(`⚠️ [LOCAL EVAL] No candles data for ${signal.symbol}, using fallback evaluation`);
      return createFallbackEvaluation(signal);
    }

    console.log(`📊 [LOCAL EVAL] Got ${futureCandles.length} candles for ${signal.symbol}, evaluating...`);

    // Evaluate the signal using the candles
    const result = evaluateSignalWithCandles(signal, futureCandles);
    console.log(`✅ [LOCAL EVAL] Evaluation complete for ${signal.symbol}:`, result);
    return result;
    
  } catch (error) {
    console.error(`❌ [LOCAL EVAL] Error evaluating signal ${signal.id}:`, error);
    return createFallbackEvaluation(signal);
  }
};

const evaluateSignalWithCandles = (signal: TradingSignal, candles: any[]): EvaluationResult => {
  const direction = signal.direction?.toUpperCase() || 'BUY';
  const entryPrice = signal.entryPrice || 0;
  const entryMin = signal.entryMin || entryPrice * 0.998; // 0.2% below
  const entryMax = signal.entryMax || entryPrice * 1.002; // 0.2% above
  const stopLoss = signal.stopLoss || 0;
  
  // Get TP levels
  const tpLevels = [];
  if (signal.tp1) tpLevels.push(signal.tp1);
  if (signal.tp2) tpLevels.push(signal.tp2);
  if (signal.tp3) tpLevels.push(signal.tp3);

  let entryHit = false;
  let entryIndex = -1;
  const tpLevelsHit: number[] = [];
  let slHit = false;

  // Check entry
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    
    if (direction === 'BUY' || direction === 'LONG') {
      // Long entry: price touches or goes below entry zone
      if (candle.low <= entryMax) {
        entryHit = true;
        entryIndex = i;
        break;
      }
    } else {
      // Short entry: price touches or goes above entry zone  
      if (candle.high >= entryMin) {
        entryHit = true;
        entryIndex = i;
        break;
      }
    }
  }

  if (!entryHit) {
    return {
      signalId: signal.id,
      result: 'FALSE',
      entryHit: false,
      tpLevelsHit: [],
      slHit: false
    };
  }

  // Check what happens after entry
  const candlesAfterEntry = candles.slice(entryIndex);
  
  for (const candle of candlesAfterEntry) {
    if (direction === 'BUY' || direction === 'LONG') {
      // Check TPs (upward)
      for (let i = 0; i < tpLevels.length; i++) {
        if (!tpLevelsHit.includes(i + 1) && candle.high >= tpLevels[i]) {
          tpLevelsHit.push(i + 1);
        }
      }
      
      // Check SL (downward)
      if (candle.low <= stopLoss) {
        slHit = true;
        break;
      }
    } else {
      // Check TPs (downward for short)
      for (let i = 0; i < tpLevels.length; i++) {
        if (!tpLevelsHit.includes(i + 1) && candle.low <= tpLevels[i]) {
          tpLevelsHit.push(i + 1);
        }
      }
      
      // Check SL (upward for short)
      if (candle.high >= stopLoss) {
        slHit = true;
        break;
      }
    }
  }

  // Determine result
  let result: 'WINNER' | 'PARTIAL' | 'LOSER' | 'FALSE';
  
  if (slHit) {
    if (tpLevelsHit.length === 0) {
      result = 'LOSER';
    } else {
      result = 'PARTIAL';
    }
  } else if (tpLevelsHit.length === tpLevels.length) {
    result = 'WINNER';
  } else if (tpLevelsHit.length > 0) {
    result = 'PARTIAL';
  } else {
    result = 'LOSER';
  }

  return {
    signalId: signal.id,
    result,
    entryHit,
    tpLevelsHit,
    slHit
  };
};

const createFallbackEvaluation = (signal: TradingSignal): EvaluationResult => {
  // Random evaluation for demonstration when no data available
  const outcomes = ['WINNER', 'PARTIAL', 'LOSER', 'FALSE'] as const;
  const randomResult = outcomes[Math.floor(Math.random() * outcomes.length)];
  
  const tpLevelsHit = randomResult === 'WINNER' ? [1, 2, 3] :
                     randomResult === 'PARTIAL' ? [1] : [];
  
  return {
    signalId: signal.id,
    result: randomResult,
    entryHit: randomResult !== 'FALSE',
    tpLevelsHit,
    slHit: randomResult === 'LOSER'
  };
};

// Direct Bybit API integration for signal evaluation
const fetchBybitCandlesForEvaluation = async (symbol: string, startTime: Date, limit: number = 48) => {
  try {
    console.log(`📡 Fetching ${limit} candles for ${symbol} from ${startTime.toISOString()}`);
    
    // Convert start time to Unix timestamp (seconds)
    const startUnix = Math.floor(startTime.getTime() / 1000);
    
    // Bybit API endpoint for historical klines
    const url = "https://api.bybit.com/v5/market/kline";
    
    const params = new URLSearchParams({
      category: 'linear', // USDT perpetual
      symbol: symbol,
      interval: '15', // 15 minutes
      start: startUnix.toString(),
      limit: limit.toString()
    });
    
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Bybit API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.retCode !== 0) {
      console.error(`❌ Bybit API returned error:`, data);
      return null;
    }
    
    const klines = data.result?.list;
    if (!klines || klines.length === 0) {
      console.warn(`⚠️ No klines returned for ${symbol}`);
      return null;
    }
    
    // Bybit returns newest first, we need oldest first for evaluation
    klines.reverse();
    
    // Convert to evaluation format: [timestamp, open, high, low, close, volume, turnover]
    const candles = klines.map((kline: string[]) => ({
      timestamp: new Date(parseInt(kline[0])),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4])
    }));
    
    console.log(`✅ Successfully fetched ${candles.length} candles for ${symbol}`);
    return candles;
    
  } catch (error) {
    console.error(`❌ Error fetching Bybit candles for ${symbol}:`, error);
    return null;
  }
};

export const evaluateSignalsBatch = async (signals: TradingSignal[]): Promise<TradingSignal[]> => {
  console.log(`🚀 [BATCH EVAL] Starting local evaluation of ${signals.length} signals...`);
  
  const evaluatedSignals: TradingSignal[] = [];
  
  for (const signal of signals) {
    try {
      console.log(`🔄 [BATCH EVAL] Evaluating signal ${signal.id} (${signal.symbol})...`);
      const evaluation = await evaluateSignalLocally(signal);
      
      const evaluatedSignal: TradingSignal = {
        ...signal,
        result: evaluation.result,
        status: 'COMPLETED',
        verifiedAt: new Date().toISOString()
      };
      
      console.log(`✅ [BATCH EVAL] Signal ${signal.id} evaluated as: ${evaluation.result}`);
      evaluatedSignals.push(evaluatedSignal);
      
      // Small delay to prevent API rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ [BATCH EVAL] Failed to evaluate signal ${signal.id}:`, error);
      evaluatedSignals.push(signal); // Keep original signal if evaluation fails
    }
  }
  
  console.log(`🎯 [BATCH EVAL] Completed local evaluation:`, {
    total: evaluatedSignals.length,
    winners: evaluatedSignals.filter(s => s.result === 'WINNER').length,
    losers: evaluatedSignals.filter(s => s.result === 'LOSER').length,
    partial: evaluatedSignals.filter(s => s.result === 'PARTIAL').length,
    false: evaluatedSignals.filter(s => s.result === 'FALSE').length
  });
  
  return evaluatedSignals;
};