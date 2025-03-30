
import { TradingSignal, HistoricalSignal, StrategyTypePerformance } from "./types";
import { db } from "./firebase";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";

/**
 * Formats a numeric or string result to a standard format
 */
export function formatTradeResult(result: number | string | undefined): "win" | "loss" | "partial" | "missed" | undefined {
  if (result === undefined) return undefined;
  
  if (typeof result === "number") {
    return result > 0 ? "win" : "loss";
  } else if (typeof result === "string") {
    // Already a string result, normalize it
    if (["win", "loss", "partial", "missed"].includes(result)) {
      return result as "win" | "loss" | "partial" | "missed";
    }
  }
  
  return undefined;
}

/**
 * Converts a result string to a numeric value for calculations
 */
export function resultToNumber(result: string | number | undefined): number | undefined {
  if (result === undefined) return undefined;
  
  if (typeof result === "number") {
    return result;
  } else if (typeof result === "string") {
    switch (result) {
      case "win": return 1;
      case "partial": return 0.5;
      case "loss": return 0;
      case "missed": return 0;
      default: return undefined;
    }
  }
  
  return undefined;
}

/**
 * Updates strategy statistics based on a new trading signal result
 */
export async function updateStrategyStatistics(signal: TradingSignal): Promise<boolean> {
  try {
    if (!signal.strategy || signal.result === undefined) {
      console.warn("Signal missing strategy or result data, skipping statistics update");
      return false;
    }
    
    const strategyRef = doc(db, "strategies", signal.strategy);
    
    // Get current strategy data or initialize if not exists
    const strategySnapshot = await getDoc(strategyRef);
    const exists = strategySnapshot.exists();
    
    const isWin = 
      signal.result === 1 || signal.result === "win" || signal.result === "partial";
    
    if (exists) {
      // Strategy exists, update statistics
      const strategyData = strategySnapshot.data();
      
      await updateDoc(strategyRef, {
        totalTrades: (strategyData.totalTrades || 0) + 1,
        wins: (strategyData.wins || 0) + (isWin ? 1 : 0),
        losses: (strategyData.losses || 0) + (!isWin ? 1 : 0),
        lastUpdated: new Date(),
        totalProfit: (strategyData.totalProfit || 0) + (signal.profit || 0),
        status: (strategyData.wins || 0) / ((strategyData.totalTrades || 0) + 1) >= 0.6 
          ? "active" : "inactive"
      });
    } else {
      // Strategy doesn't exist, create it
      await setDoc(strategyRef, {
        name: signal.strategy,
        totalTrades: 1,
        wins: isWin ? 1 : 0,
        losses: !isWin ? 1 : 0,
        lastUpdated: new Date(),
        totalProfit: signal.profit || 0,
        createdAt: new Date(),
        status: isWin ? "active" : "inactive",
        description: `${signal.strategy} trading strategy`
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error updating strategy statistics:", error);
    return false;
  }
}

/**
 * Deactivates strategies with win rates below threshold
 */
export async function deactivateLowPerformingStrategies(
  strategies: StrategyTypePerformance[],
  winRateThreshold: number = 0.6
): Promise<number> {
  try {
    let deactivatedCount = 0;
    
    for (const strategy of strategies) {
      if (strategy.winRate < winRateThreshold * 100) {
        const strategyRef = doc(db, "strategies", strategy.strategy);
        await updateDoc(strategyRef, {
          status: "inactive",
          lastUpdated: new Date()
        });
        deactivatedCount++;
      }
    }
    
    return deactivatedCount;
  } catch (error) {
    console.error("Error deactivating low performing strategies:", error);
    return 0;
  }
}
