
import { getSignalHistory } from "./signal-storage";
import { TradingSignal } from "./types";

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
    dailyData
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
      const stopLossPct = signal.direction === "BUY" || signal.direction === "LONG"
        ? ((signal.stopLoss / entryPrice) - 1) * 100 * leverage
        : ((entryPrice / signal.stopLoss) - 1) * 100 * leverage;
      return stopLossPct;
    }
    return -5 * leverage; // Default loss if no stop loss
  }
  
  // Check if any targets were hit
  if ((signal.result === 1 || signal.result === "win" || signal.result === "partial") && signal.targets) {
    // Find the highest hit target
    const highestHitTarget = signal.targets
      .filter(t => t.hit)
      .sort((a, b) => b.level - a.level)[0];
    
    if (highestHitTarget) {
      const targetPct = signal.direction === "BUY" || signal.direction === "LONG"
        ? ((highestHitTarget.price / entryPrice) - 1) * 100 * leverage
        : ((entryPrice / highestHitTarget.price) - 1) * 100 * leverage;
      return targetPct;
    }
  }
  
  return 0; // No profit calculated
};

export default {
  analyzeSignalsHistory,
  calculateSignalProfit
};
