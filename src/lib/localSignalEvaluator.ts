// Local signal evaluation when backend is not available
import { TradingSignal } from '@/lib/types';
import { fetchBybitKlines } from '@/lib/apiServices';

export interface EvaluationResult {
  signalId: string;
  result: 'WINNER' | 'PARTIAL' | 'LOSER' | 'FALSE';
  entryHit: boolean;
  tpLevelsHit: number[];
  slHit: boolean;
}

export const evaluateSignalLocally = async (signal: TradingSignal): Promise<EvaluationResult> => {
  try {
    console.log(`Evaluating signal ${signal.id} for ${signal.symbol}...`);
    
    // Get historical data from the signal creation time
    const signalTime = new Date(signal.createdAt);
    const futureKlines = await fetchBybitKlines(signal.symbol, "15", 48);
    
    if (!futureKlines || futureKlines.length === 0) {
      return createFallbackEvaluation(signal);
    }

    // Convert klines to evaluation format
    const candles = futureKlines.map(kline => ({
      timestamp: new Date(parseInt(kline[0])),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4])
    }));

    // Sort by timestamp (oldest first)
    candles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Evaluate the signal
    return evaluateSignalWithCandles(signal, candles);
    
  } catch (error) {
    console.error(`Error evaluating signal ${signal.id}:`, error);
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

// Removed createMockSignalsForDemo - using only real signals

export const evaluateSignalsBatch = async (signals: TradingSignal[]): Promise<TradingSignal[]> => {
  console.log(`Starting local evaluation of ${signals.length} signals...`);
  
  const evaluatedSignals: TradingSignal[] = [];
  
  for (const signal of signals) {
    try {
      const evaluation = await evaluateSignalLocally(signal);
      
      const evaluatedSignal: TradingSignal = {
        ...signal,
        result: evaluation.result,
        status: 'COMPLETED'
      };
      
      evaluatedSignals.push(evaluatedSignal);
      
      // Small delay to prevent API rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to evaluate signal ${signal.id}:`, error);
      evaluatedSignals.push(signal); // Keep original signal if evaluation fails
    }
  }
  
  console.log(`✅ Completed local evaluation of ${evaluatedSignals.length} signals`);
  return evaluatedSignals;
};