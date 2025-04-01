import { getSignalHistory } from "./signal-storage";
import { TradingSignal } from "./types";
import { verifySignal } from "./signalVerification";

/**
 * Analyzes signal history to generate performance metrics
 */
export const analyzeSignalsHistory = () => {
  const signals = getSignalHistory();
  
  // Basic metrics
  const totalSignals = signals.length;
  const winningTrades = signals.filter(s => s.result === 1 || s.result === "win" || s.result === "partial").length;
  const losingTrades = signals.filter(s => s.result === 0 || s.result === "loss").length;
  const winRate = totalSignals > 0 ? (winningTrades / totalSignals) * 100 : 0;
  
  // Calculate average profit
  const profitableSignals = signals.filter(s => typeof s.profit === 'number');
  const avgProfit = profitableSignals.length > 0 
    ? profitableSignals.reduce((sum, s) => sum + (s.profit || 0), 0) / profitableSignals.length 
    : 0;
  
  // Group by symbol
  const symbolsMap = new Map<string, { count: number, wins: number, losses: number }>();
  
  signals.forEach(signal => {
    const symbol = signal.symbol || signal.pair || "unknown";
    if (!symbolsMap.has(symbol)) {
      symbolsMap.set(symbol, { count: 0, wins: 0, losses: 0 });
    }
    
    const data = symbolsMap.get(symbol)!;
    data.count++;
    
    if (signal.result === 1 || signal.result === "win" || signal.result === "partial") {
      data.wins++;
    } else if (signal.result === 0 || signal.result === "loss") {
      data.losses++;
    }
  });
  
  // Convert to array
  const symbolsData = Array.from(symbolsMap.entries()).map(([symbol, data]) => ({
    symbol,
    count: data.count,
    wins: data.wins,
    losses: data.losses,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0
  })).sort((a, b) => b.count - a.count);
  
  // Group by strategy
  const strategyMap = new Map<string, { 
    count: number, 
    wins: number, 
    losses: number,
    totalProfit: number
  }>();
  
  signals.forEach(signal => {
    const strategy = signal.strategy || "unknown";
    if (!strategyMap.has(strategy)) {
      strategyMap.set(strategy, { 
        count: 0, 
        wins: 0, 
        losses: 0,
        totalProfit: 0
      });
    }
    
    const data = strategyMap.get(strategy)!;
    data.count++;
    
    if (signal.result === 1 || signal.result === "win" || signal.result === "partial") {
      data.wins++;
    } else if (signal.result === 0 || signal.result === "loss") {
      data.losses++;
    }
    
    if (typeof signal.profit === 'number') {
      data.totalProfit += signal.profit;
    }
  });
  
  // Convert to array
  const strategyData = Array.from(strategyMap.entries()).map(([strategy, data]) => ({
    strategy,
    count: data.count,
    wins: data.wins,
    losses: data.losses,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    avgProfit: data.count > 0 ? data.totalProfit / data.count : 0
  })).sort((a, b) => b.count - a.count);
  
  // Group by day
  const dailyMap = new Map<string, { 
    total: number, 
    wins: number, 
    losses: number 
  }>();
  
  signals.forEach(signal => {
    const date = new Date(signal.createdAt).toISOString().split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { total: 0, wins: 0, losses: 0 });
    }
    
    const data = dailyMap.get(date)!;
    data.total++;
    
    if (signal.result === 1 || signal.result === "win" || signal.result === "partial") {
      data.wins++;
    } else if (signal.result === 0 || signal.result === "loss") {
      data.losses++;
    }
  });
  
  // Convert to array
  const dailyData = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    total: data.total,
    wins: data.wins,
    losses: data.losses,
    winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0
  })).sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    totalSignals,
    winningTrades,
    losingTrades,
    winRate,
    symbolsData,
    strategyData,
    dailyData,
    avgProfit
  };
};

/**
 * Calculate estimated profit for a signal based on targets hit or stop loss
 */
export const calculateSignalProfit = (signal: TradingSignal): number => {
  if (!signal.entryPrice) return 0;
  
  // If profit is already calculated, return it
  if (typeof signal.profit === 'number') return signal.profit;
  
  const entryPrice = signal.entryPrice;
  const leverage = signal.leverage || 1;
  
  // Check if stop loss was hit
  if (signal.result === 0 || signal.result === "loss") {
    // Calculate loss based on stop loss
    if (signal.stopLoss) {
      const stopLossPct = (signal.direction === "BUY" || signal.type === "LONG")
        ? ((signal.stopLoss / entryPrice) - 1) * 100 * leverage
        : ((entryPrice / signal.stopLoss) - 1) * 100 * leverage;
      return stopLossPct;
    }
    return -5 * leverage; // Default loss if no stop loss
  }
  
  // Check if any targets were hit
  if ((signal.result === 1 || signal.result === "win" || signal.result === "partial") && signal.targets) {
    // Find the highest hit target
    const hitTargets = signal.targets
      .filter(t => t.hit)
      .sort((a, b) => b.level - a.level)[0];
    
    if (hitTargets) {
      const targetPct = (signal.direction === "BUY" || signal.type === "LONG")
        ? ((hitTargets.price / entryPrice) - 1) * 100 * leverage
        : ((entryPrice / hitTargets.price) - 1) * 100 * leverage;
      return targetPct;
    }
  }
  
  return 0; // No profit calculated
};

/**
 * Determines if a signal is a winner or loser based on its targets and current price
 */
export const determineSignalResult = (signal: TradingSignal, currentPrice?: number): TradingSignal => {
  // If already has result and status completed, don't alter
  if (signal.status === "COMPLETED" && 
      (signal.result === 1 || signal.result === 0 || 
       signal.result === "win" || signal.result === "loss" || 
       signal.result === "partial") && 
      typeof signal.profit === 'number') {
    return signal;
  }
  
  // Clone the signal to not modify the original
  const updatedSignal = { ...signal };
  
  // If no current price or entry price, can't calculate
  if (!currentPrice && !updatedSignal.currentPrice) {
    return updatedSignal;
  }
  
  const price = currentPrice || updatedSignal.currentPrice || 0;
  const entryPrice = updatedSignal.entryPrice || updatedSignal.entryAvg || 0;
  
  if (!entryPrice) return updatedSignal;
  
  // Check if stop loss was hit
  if (updatedSignal.stopLoss) {
    const isStopLossHit = updatedSignal.direction === "BUY" || updatedSignal.type === "LONG"
      ? price <= updatedSignal.stopLoss
      : price >= updatedSignal.stopLoss;
      
    if (isStopLossHit) {
      updatedSignal.result = "loss";
      updatedSignal.status = "COMPLETED";
      updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
      updatedSignal.profit = calculateSignalProfit(updatedSignal);
      return updatedSignal;
    }
  }
  
  // Check if any targets were hit
  if (updatedSignal.targets && updatedSignal.targets.length > 0) {
    let anyTargetHit = false;
    let allTargetsHit = true;
    
    updatedSignal.targets = updatedSignal.targets.map(target => {
      const isTargetHit = updatedSignal.direction === "BUY" || updatedSignal.type === "LONG"
        ? price >= target.price
        : price <= target.price;
        
      if (isTargetHit && !target.hit) {
        anyTargetHit = true;
        return { ...target, hit: true };
      } else if (!isTargetHit) {
        allTargetsHit = false;
      }
      
      return target;
    });
    
    if (anyTargetHit) {
      if (allTargetsHit) {
        updatedSignal.result = "win";
        updatedSignal.status = "COMPLETED";
        updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
      } else {
        updatedSignal.result = "partial";
        
        // If at least the first target was hit but not all
        const firstTargetHit = updatedSignal.targets[0].hit;
        if (firstTargetHit) {
          updatedSignal.status = "COMPLETED";
          updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
        }
      }
      
      updatedSignal.profit = calculateSignalProfit(updatedSignal);
    }
  }
  
  return updatedSignal;
};

/**
 * Update all signals status based on current prices
 */
export const updateAllSignalsStatus = (currentPrices?: {[symbol: string]: number}) => {
  const signals = getSignalHistory();
  
  const updatedSignals = signals.map(signal => {
    // Get current price for this symbol if available
    const currentPrice = currentPrices?.[signal.symbol || signal.pair || ""];
    
    // Evaluate signal based on current price
    const updatedSignal = determineSignalResult(signal, currentPrice);
    
    // Calculate profit if not already calculated
    if (updatedSignal.status === "COMPLETED" && typeof updatedSignal.profit !== 'number') {
      updatedSignal.profit = calculateSignalProfit(updatedSignal);
    }
    
    return updatedSignal;
  });
  
  // Save updated signals back to storage
  localStorage.setItem("trade_signal_history", JSON.stringify(updatedSignals));
  
  return updatedSignals;
};

/**
 * Reprocess all history and update signal statuses
 */
export const reprocessAllHistory = (currentPrices?: {[symbol: string]: number}) => {
  return updateAllSignalsStatus(currentPrices);
};

/**
 * Get signals history
 */
export const getSignalsHistory = () => {
  return getSignalHistory();
};

/**
 * Save signals to history
 */
export const saveSignalsToHistory = (signals: TradingSignal[]) => {
  if (!signals || signals.length === 0) return;
  
  // Get existing signals
  const existing = getSignalHistory();
  
  // Create a Set of existing IDs for quick lookup
  const existingIds = new Set(existing.map(s => s.id));
  
  // Add new signals and update existing ones
  signals.forEach(signal => {
    // Process signal to ensure it has result information
    const processedSignal = determineSignalResult(signal);
    
    if (existingIds.has(signal.id)) {
      // Find and update the existing signal
      const index = existing.findIndex(s => s.id === signal.id);
      if (index !== -1) {
        existing[index] = processedSignal;
      }
    } else {
      // Add the new signal
      existing.unshift(processedSignal);
    }
  });
  
  // Save back to localStorage
  localStorage.setItem("trade_signal_history", JSON.stringify(existing.slice(0, 100)));
  
  return existing;
};

/**
 * Verify all signals with Binance API
 */
export const verifyAllSignalsWithBinance = async () => {
  try {
    // Import the verification function to avoid circular imports
    const { verifyAllSignals } = await import('./signalVerification');
    return await verifyAllSignals();
  } catch (error) {
    console.error("Error verifying signals:", error);
    throw error;
  }
};

/**
 * Update a specific signal in the history
 */
export const updateSignalInHistory = (signalId: string, updates: Partial<TradingSignal>) => {
  const signals = getSignalHistory();
  const signalIndex = signals.findIndex(s => s.id === signalId);
  
  if (signalIndex === -1) return null;
  
  // Apply updates to the signal
  const updatedSignal = { ...signals[signalIndex], ...updates };
  
  // Process the signal to ensure result is correctly set
  const processedSignal = determineSignalResult(updatedSignal);
  
  // Update the signal in the array
  signals[signalIndex] = processedSignal;
  
  // Save back to localStorage
  localStorage.setItem("trade_signal_history", JSON.stringify(signals));
  
  return processedSignal;
};

export default {
  analyzeSignalsHistory,
  calculateSignalProfit,
  getSignalsHistory,
  updateAllSignalsStatus,
  reprocessAllHistory,
  saveSignalsToHistory,
  verifyAllSignalsWithBinance,
  determineSignalResult,
  updateSignalInHistory
};
