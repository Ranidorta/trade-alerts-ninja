import { db } from "./firebase";
import { TradingSignal, StrategyTypePerformance } from "./types";
import { fetchBinanceCandles, checkPriceLevels, getTradeResult } from "./binanceService";
import axios from "axios";

/**
 * Updates the strategy statistics based on trading signal results
 * This is a client-side implementation of functionality similar to Firebase Functions
 * In a production environment, this logic would ideally run in Firebase Functions
 */
export async function updateStrategyStatistics(signal: TradingSignal): Promise<boolean> {
  try {
    // Import these functions here to avoid issues with SSR
    const { doc, getDoc, setDoc, updateDoc } = await import("firebase/firestore");
    
    if (!signal.strategy || signal.result === undefined) {
      console.warn("Signal missing strategy or result data, skipping statistics update");
      return false;
    }
    
    const strategyRef = doc(db, "strategies", signal.strategy);
    
    // Get current strategy data or initialize if not exists
    const strategySnapshot = await getDoc(strategyRef);
    const exists = strategySnapshot.exists();
    
    if (exists) {
      // Strategy exists, update statistics
      const strategyData = strategySnapshot.data();
      const isWin = signal.result === 1 || signal.result === "win" || signal.result === "partial";
      
      await updateDoc(strategyRef, {
        totalTrades: (strategyData.totalTrades || 0) + 1,
        wins: (strategyData.wins || 0) + (isWin ? 1 : 0),
        losses: (strategyData.losses || 0) + (!isWin ? 1 : 0),
        lastUpdated: new Date(),
        totalProfit: (strategyData.totalProfit || 0) + (signal.profit || 0)
      });
    } else {
      // Strategy doesn't exist, create it
      const isWin = signal.result === 1 || signal.result === "win" || signal.result === "partial";
      
      await setDoc(strategyRef, {
        name: signal.strategy,
        totalTrades: 1,
        wins: isWin ? 1 : 0,
        losses: !isWin ? 1 : 0,
        lastUpdated: new Date(),
        totalProfit: signal.profit || 0,
        createdAt: new Date()
      });
    }
    
    console.log(`Strategy statistics updated for ${signal.strategy}`);
    return true;
  } catch (error) {
    console.error("Error updating strategy statistics:", error);
    return false;
  }
}

/**
 * Retrieves strategy performance statistics from Firestore
 */
export async function getStrategiesPerformance(): Promise<StrategyTypePerformance[]> {
  try {
    // Import these functions here to avoid issues with SSR
    const { collection, getDocs } = await import("firebase/firestore");
    
    const strategiesRef = collection(db, "strategies");
    const querySnapshot = await getDocs(strategiesRef);
    
    const strategies: StrategyTypePerformance[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      strategies.push({
        strategy: doc.id,
        count: data.totalTrades || 0, // Add the count property mapped to totalTrades
        totalTrades: data.totalTrades || 0,
        wins: data.wins || 0,
        losses: data.losses || 0,
        winRate: data.totalTrades > 0 ? (data.wins / data.totalTrades) * 100 : 0,
        avgProfit: data.totalProfit || 0,
        sharpeRatio: data.sharpeRatio || undefined,
        maxDrawdown: data.maxDrawdown || undefined
      });
    });
    
    return strategies;
  } catch (error) {
    console.error("Error retrieving strategies performance:", error);
    return [];
  }
}

/**
 * Verifies a trading signal using real market data from Binance
 * This function simulates a Firebase Function that would typically run on the server
 */
export async function verifyTradingSignal(signal: TradingSignal): Promise<TradingSignal> {
  try {
    console.log(`Verifying trading signal for ${signal.symbol || signal.pair}...`);
    
    // Import Firestore functions
    const { doc, updateDoc } = await import("firebase/firestore");
    
    // Extract trading pair symbol
    const symbol = signal.symbol || signal.pair;
    if (!symbol) {
      throw new Error("Signal missing symbol/pair");
    }

    // Determine the timeframe to use (default to 1h if not specified)
    const timeframe = signal.timeframe || "1h";
    
    // Convert string timestamp to milliseconds if needed
    const startTime = new Date(signal.createdAt).getTime();
    
    // Calculate end time (default to current time or 7 days after start)
    const endTime = signal.completedAt 
      ? new Date(signal.completedAt).getTime() 
      : Math.min(Date.now(), startTime + 7 * 24 * 60 * 60 * 1000);
    
    // Fetch historical candles with fallback to multiple APIs
    let candles;
    try {
      // Try Binance API first
      candles = await fetchBinanceCandles(
        symbol,
        timeframe,
        startTime,
        endTime,
        1000 // Get maximum possible candles for this period
      );
    } catch (binanceError) {
      console.error("Binance API error:", binanceError);
      // Fallback to Bybit API
      candles = await fetchBybitCandles(
        symbol,
        timeframe,
        startTime,
        endTime
      );
    }
    
    if (candles.length === 0) {
      throw new Error("No candle data available for this period");
    }

    // Extract take profit levels from signal
    const takeProfits = signal.takeProfit || 
      (signal.targets ? signal.targets.map(t => t.price) : []);
    
    if (takeProfits.length === 0 || !signal.stopLoss) {
      throw new Error("Signal missing take profit or stop loss levels");
    }

    // Check if price targets were hit
    const { hitTargets, hitSL } = checkPriceLevels(
      candles,
      takeProfits,
      signal.stopLoss,
      signal.direction
    );

    // Determine trade result
    const result = getTradeResult(hitTargets, hitSL);
    
    // Calculate profit based on result
    let profit = 0;
    if (result === "loss") {
      // Calculate loss percentage between entry and stop loss
      const entryPrice = signal.entryPrice || signal.entryAvg || 0;
      if (entryPrice > 0) {
        profit = signal.direction === "BUY"
          ? ((signal.stopLoss / entryPrice) - 1) * 100 * (signal.leverage || 1)
          : ((entryPrice / signal.stopLoss) - 1) * 100 * (signal.leverage || 1);
      }
    } else if (result === "win" || result === "partial") {
      // For win/partial, use the highest TP level hit
      const entryPrice = signal.entryPrice || signal.entryAvg || 0;
      if (entryPrice > 0) {
        // Find the highest target hit
        const hitTPIndexes = hitTargets.map((hit, i) => hit ? i : -1).filter(i => i >= 0);
        if (hitTPIndexes.length > 0) {
          const highestHitTP = takeProfits[Math.max(...hitTPIndexes)];
          profit = signal.direction === "BUY"
            ? ((highestHitTP / entryPrice) - 1) * 100 * (signal.leverage || 1)
            : ((entryPrice / highestHitTP) - 1) * 100 * (signal.leverage || 1);
        }
      }
    }
    
    // Update signal with results
    const updatedSignal: TradingSignal = {
      ...signal,
      hitTargets,
      result: result,
      profit: profit,
      status: (result === "win" || result === "loss" || result === "partial") ? "COMPLETED" : signal.status,
      verifiedAt: new Date().toISOString(),
      completedAt: (result === "win" || result === "loss" || result === "partial") 
        ? (signal.completedAt || new Date().toISOString())
        : signal.completedAt
    };
    
    // If this is a real signal in Firestore (has an ID), update the document
    if (signal.id && typeof signal.id === 'string') {
      const signalRef = doc(db, "signals", signal.id);
      await updateDoc(signalRef, {
        hitTargets,
        result,
        profit,
        verifiedAt: new Date(),
        status: updatedSignal.status,
        completedAt: updatedSignal.completedAt ? new Date(updatedSignal.completedAt) : null
      });
      console.log(`Updated signal ${signal.id} with verification result: ${result}`);
    }
    
    return updatedSignal;
  } catch (error) {
    console.error("Error verifying trading signal:", error);
    return {
      ...signal,
      error: error instanceof Error ? error.message : "Unknown error during verification"
    };
  }
}

/**
 * Recalculates all strategy statistics based on signals history
 * This is useful for ensuring statistics accuracy or initializing the statistics
 */
export async function recalculateAllStrategiesStatistics(): Promise<boolean> {
  try {
    const { collection, getDocs, doc, setDoc } = await import("firebase/firestore");
    
    // Get all signals from Firestore
    const signalsRef = collection(db, "signals");
    const querySnapshot = await getDocs(signalsRef);
    
    // Group signals by strategy
    const strategiesMap = new Map<string, {
      totalTrades: number;
      wins: number;
      losses: number;
      totalProfit: number;
    }>();
    
    querySnapshot.forEach((doc) => {
      const signal = doc.data();
      const strategy = signal.strategy || "default";
      
      if (!strategiesMap.has(strategy)) {
        strategiesMap.set(strategy, {
          totalTrades: 0,
          wins: 0,
          losses: 0,
          totalProfit: 0
        });
      }
      
      const stats = strategiesMap.get(strategy)!;
      stats.totalTrades++;
      
      if (signal.result === "win" || signal.result === 1 || signal.result === "partial") {
        stats.wins++;
      } else if (signal.result === "loss" || signal.result === 0 || signal.result === "missed") {
        stats.losses++;
      }
      
      if (typeof signal.profit === 'number') {
        stats.totalProfit += signal.profit;
      }
    });
    
    // Update all strategy documents
    const promises = Array.from(strategiesMap.entries()).map(([strategy, stats]) => {
      const strategyRef = doc(db, "strategies", strategy);
      return setDoc(strategyRef, {
        name: strategy,
        totalTrades: stats.totalTrades,
        wins: stats.wins,
        losses: stats.losses,
        lastUpdated: new Date(),
        totalProfit: stats.totalProfit,
        createdAt: new Date()
      }, { merge: true });
    });
    
    await Promise.all(promises);
    console.log(`Recalculated statistics for ${promises.length} strategies`);
    return true;
  } catch (error) {
    console.error("Error recalculating strategy statistics:", error);
    return false;
  }
}

/**
 * Batch verifies multiple trading signals
 */
export async function batchVerifySignals(signals: TradingSignal[]): Promise<TradingSignal[]> {
  console.log(`Batch verifying ${signals.length} signals...`);
  
  // Process signals in batches to avoid overloading the API
  const batchSize = 5;
  const results: TradingSignal[] = [];
  
  for (let i = 0; i < signals.length; i += batchSize) {
    const batch = signals.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(signal => verifyTradingSignal(signal).catch(err => {
        console.error(`Error verifying signal ${signal.id}:`, err);
        return {
          ...signal,
          error: err instanceof Error ? err.message : "Unknown error during verification"
        };
      }))
    );
    
    results.push(...batchResults);
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < signals.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`Completed batch verification of ${results.length} signals`);
  return results;
}

/**
 * Fetches historical candles from Bybit API as a fallback
 * This provides redundancy if Binance API is unavailable
 */
async function fetchBybitCandles(
  symbol: string,
  timeframe: string,
  startTime: number,
  endTime: number
) {
  console.log(`Fetching Bybit candles for ${symbol}...`);
  
  // Convert timeframe to Bybit format
  const interval = convertTimeframeToBybit(timeframe);
  
  try {
    const response = await axios.get('https://api.bybit.com/v5/market/kline', {
      params: {
        category: 'spot',
        symbol: symbol,
        interval: interval,
        start: startTime,
        end: endTime,
        limit: 1000
      }
    });

    if (response.data.retCode !== 0) {
      throw new Error(`Bybit API error: ${response.data.retMsg}`);
    }

    // Map Bybit response to our candle format
    return response.data.result.list.map((item: any) => ({
      timestamp: parseInt(item[0], 10),
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    })).reverse(); // Bybit returns newest first
  } catch (error) {
    console.error("Error fetching from Bybit:", error);
    throw error;
  }
}

/**
 * Converts standard timeframe format to Bybit specific interval format
 */
function convertTimeframeToBybit(timeframe: string): string {
  const mapping: Record<string, string> = {
    '1m': '1',
    '3m': '3',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '2h': '120',
    '4h': '240',
    '6h': '360',
    '12h': '720',
    '1d': 'D',
    '1w': 'W',
    '1M': 'M'
  };
  
  return mapping[timeframe] || '60'; // Default to 1h
}

/**
 * Triggers the verification of all unverified signals
 * This is meant to be run on a schedule (e.g., every hour)
 */
export async function scheduledVerification(): Promise<number> {
  try {
    console.log("Running scheduled verification of unverified signals...");
    
    // Import Firestore functions
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    
    // Get all unverified signals
    const signalsRef = collection(db, "signals");
    const unverifiedQuery = query(signalsRef, where("verifiedAt", "==", null));
    const snapshot = await getDocs(unverifiedQuery);
    
    if (snapshot.empty) {
      console.log("No unverified signals found");
      return 0;
    }
    
    // Process signals in batches to avoid overloading
    const signals: TradingSignal[] = [];
    snapshot.forEach(doc => {
      const data = doc.data() as TradingSignal;
      data.id = doc.id;
      signals.push(data);
    });
    
    console.log(`Found ${signals.length} unverified signals to process`);
    
    // Use our existing batch verification function
    await batchVerifySignals(signals);
    
    return signals.length;
  } catch (error) {
    console.error("Error in scheduled verification:", error);
    return 0;
  }
}
