import { db } from "./firebase";
import { TradingSignal, StrategyPerformance } from "./types";

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
      const isWin = signal.result === 1;
      
      await updateDoc(strategyRef, {
        totalTrades: (strategyData.totalTrades || 0) + 1,
        wins: (strategyData.wins || 0) + (isWin ? 1 : 0),
        losses: (strategyData.losses || 0) + (!isWin ? 1 : 0),
        lastUpdated: new Date(),
        totalProfit: (strategyData.totalProfit || 0) + (signal.profit || 0)
      });
    } else {
      // Strategy doesn't exist, create it
      const isWin = signal.result === 1;
      
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
export async function getStrategiesPerformance(): Promise<StrategyPerformance[]> {
  try {
    // Import these functions here to avoid issues with SSR
    const { collection, getDocs } = await import("firebase/firestore");
    
    const strategiesRef = collection(db, "strategies");
    const querySnapshot = await getDocs(strategiesRef);
    
    const strategies: StrategyPerformance[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      strategies.push({
        strategy: doc.id,
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
      
      if (signal.result === "win" || signal.result === 1) {
        stats.wins++;
      } else if (signal.result === "loss" || signal.result === 0) {
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
