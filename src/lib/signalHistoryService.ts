
import { TradingSignal, PerformanceMetrics } from "@/lib/types";
import { logTradeSignal } from "./firebase";
import { verifyTradingSignal, batchVerifySignals } from "./firebaseFunctions";
import { toast } from "sonner";

// Local storage key for saved signals
const SIGNALS_HISTORY_KEY = "trading_signals_history";

/**
 * Saves signals to local storage history
 */
export const saveSignalsToHistory = (signals: TradingSignal[]): void => {
  let existingData: TradingSignal[] = [];
  
  try {
    const storedData = localStorage.getItem(SIGNALS_HISTORY_KEY);
    if (storedData) {
      existingData = JSON.parse(storedData);
    }
  } catch (e) {
    console.error("Error reading signals history from localStorage:", e);
  }
  
  // Filter out duplicate signals based on ID
  const existingIds = new Set(existingData.map(signal => signal.id));
  const newSignals = signals.filter(signal => !existingIds.has(signal.id));
  
  if (newSignals.length === 0) {
    return; // No new signals to save
  }
  
  const updated = [...existingData, ...newSignals];
  
  try {
    localStorage.setItem(SIGNALS_HISTORY_KEY, JSON.stringify(updated));
    console.log(`Saved ${newSignals.length} new signals to history. Total: ${updated.length}`);
  } catch (e) {
    console.error("Error saving signals history to localStorage:", e);
  }
};

/**
 * Get all signals from history
 */
export const getSignalsHistory = (): TradingSignal[] => {
  try {
    const storedData = localStorage.getItem(SIGNALS_HISTORY_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (e) {
    console.error("Error reading signals history from localStorage:", e);
  }
  
  return [];
};

/**
 * Updates a signal's outcome based on profit and target information
 */
export const updateSignalOutcome = async (
  signal: TradingSignal
): Promise<TradingSignal> => {
  // Clone the signal to avoid modifying the original object
  const updatedSignal: TradingSignal = {...signal};
  
  // Update signal status based on current state
  if (updatedSignal.status === "COMPLETED" && updatedSignal.profit !== undefined) {
    // Determine result from profit
    if (typeof updatedSignal.result !== "string") {
      updatedSignal.result = updatedSignal.profit > 0 ? 1 : 0; // 1 for win, 0 for loss
    }
    // Count how many targets were hit
    updatedSignal.tpHit = updatedSignal.targets?.filter(t => t.hit).length || 0;
    
    // Also log updated signal to Firebase for tracking
    try {
      await logTradeSignal(updatedSignal);
    } catch (err) {
      console.error("Error updating signal in Firebase:", err);
    }
  } else {
    // Signal is still active or waiting
    updatedSignal.result = undefined;
    updatedSignal.tpHit = 0;
  }
  
  return updatedSignal;
};

/**
 * Updates a signal's status based on current price and target information
 */
export const updateSignalStatus = async (
  signal: TradingSignal, 
  currentPrice?: number
): Promise<TradingSignal> => {
  // Clone the signal to avoid modifying the original object
  const updatedSignal: TradingSignal = {...signal};
  
  // If we don't have a current price, use the signal's current price if available
  const price = currentPrice || updatedSignal.currentPrice;
  
  // If we don't have price information, we can't update the status
  if (!price) {
    return updatedSignal;
  }
  
  // Update targets hit status based on current price
  if (updatedSignal.targets && updatedSignal.targets.length > 0) {
    updatedSignal.targets = updatedSignal.targets.map(target => {
      // For BUY signals, target is hit if price goes above target price
      // For SELL signals, target is hit if price goes below target price
      const isTargetHit = updatedSignal.direction === "BUY" 
        ? price >= target.price 
        : price <= target.price;
        
      return {
        ...target,
        hit: isTargetHit || target.hit === true // Once hit, always hit
      };
    });
  }
  
  // Check if stop loss was hit
  const isStopLossHit = updatedSignal.direction === "BUY"
    ? price <= updatedSignal.stopLoss
    : price >= updatedSignal.stopLoss;
    
  // Check if all targets were hit
  const allTargetsHit = updatedSignal.targets && 
    updatedSignal.targets.length > 0 && 
    updatedSignal.targets.every(t => t.hit);
    
  // Determine signal status
  if (isStopLossHit) {
    updatedSignal.status = "COMPLETED";
    updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
    // Calculate profit as negative (loss)
    const entryPrice = updatedSignal.entryPrice || 0;
    updatedSignal.profit = updatedSignal.direction === "BUY"
      ? ((updatedSignal.stopLoss / entryPrice) - 1) * 100
      : ((entryPrice / updatedSignal.stopLoss) - 1) * 100;
    updatedSignal.result = 0; // 0 for loss
  } else if (allTargetsHit) {
    updatedSignal.status = "COMPLETED";
    updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
    // Calculate average profit from targets
    if (updatedSignal.targets && updatedSignal.targets.length > 0) {
      const hitTargets = updatedSignal.targets.filter(t => t.hit);
      const entryPrice = updatedSignal.entryPrice || 0;
      // Use the highest target hit for profit calculation
      const highestTargetHit = hitTargets.reduce(
        (max, target) => target.level > max.level ? target : max, 
        hitTargets[0]
      );
      
      updatedSignal.profit = updatedSignal.direction === "BUY"
        ? ((highestTargetHit.price / entryPrice) - 1) * 100
        : ((entryPrice / highestTargetHit.price) - 1) * 100;
    }
    updatedSignal.result = 1; // 1 for win
  }
  
  return updatedSignal;
};

/**
 * Updates all signals in history with current status
 */
export const updateAllSignalsStatus = async (
  currentPrices?: {[symbol: string]: number}
): Promise<TradingSignal[]> => {
  const signals = getSignalsHistory();
  
  const updatedSignals = await Promise.all(
    signals.map(async signal => {
      // Only update signals that aren't already completed
      if (signal.status !== "COMPLETED") {
        const currentPrice = currentPrices?.[signal.symbol];
        return await updateSignalStatus(signal, currentPrice);
      }
      return signal;
    })
  );
  
  // Save updated signals back to storage
  localStorage.setItem(SIGNALS_HISTORY_KEY, JSON.stringify(updatedSignals));
  
  return updatedSignals;
};

/**
 * Reprocesses all signals in history
 */
export const reprocessAllHistory = async (
  currentPrices?: {[symbol: string]: number}
): Promise<TradingSignal[]> => {
  const signals = getSignalsHistory();
  
  const updatedSignals = await Promise.all(
    signals.map(async signal => {
      const currentPrice = currentPrices?.[signal.symbol];
      
      // First update the signal status based on price
      const statusUpdated = await updateSignalStatus(signal, currentPrice);
      
      // Then update the outcome based on the new status
      return await updateSignalOutcome(statusUpdated);
    })
  );
  
  // Save updated signals back to storage
  localStorage.setItem(SIGNALS_HISTORY_KEY, JSON.stringify(updatedSignals));
  console.log(`Reprocessed ${updatedSignals.length} signals in history`);
  
  return updatedSignals;
};

/**
 * Analyzes signal history and returns performance metrics
 */
export const analyzeSignalsHistory = (): PerformanceMetrics => {
  const signals = getSignalsHistory();
  
  // Count wins and losses
  const wins = signals.filter(s => s.result === 1 || s.result === "win" || s.result === "partial").length;
  const losses = signals.filter(s => s.result === 0 || s.result === "loss" || s.result === "missed").length;
  const total = signals.length;
  const completed = signals.filter(s => s.status === "COMPLETED").length;
  
  // Calculate win rate
  const winRate = completed > 0 ? (wins / completed) * 100 : 0;
  
  // Calculate average profit
  const profitSignals = signals.filter(s => s.profit !== undefined);
  const avgProfit = profitSignals.length > 0
    ? profitSignals.reduce((sum, s) => sum + (s.profit || 0), 0) / profitSignals.length
    : 0;
    
  // Analyze performance by symbol
  const symbolPerformance = signals.reduce((acc, signal) => {
    const symbol = signal.symbol;
    
    if (!acc[symbol]) {
      acc[symbol] = { total: 0, wins: 0, losses: 0 };
    }
    
    acc[symbol].total += 1;
    if (signal.result === 1 || signal.result === "win" || signal.result === "partial") acc[symbol].wins += 1;
    if (signal.result === 0 || signal.result === "loss" || signal.result === "missed") acc[symbol].losses += 1;
    
    return acc;
  }, {} as {[symbol: string]: {total: number, wins: number, losses: number}});
  
  // Analyze strategy performance
  const strategyPerformance = signals.reduce((acc, signal) => {
    const strategy = signal.strategy || 'Unknown';
    
    if (!acc[strategy]) {
      acc[strategy] = { total: 0, wins: 0, losses: 0, profit: 0 };
    }
    
    acc[strategy].total += 1;
    if (signal.result === 1 || signal.result === "win" || signal.result === "partial") acc[strategy].wins += 1;
    if (signal.result === 0 || signal.result === "loss" || signal.result === "missed") acc[strategy].losses += 1;
    if (signal.profit !== undefined) acc[strategy].profit += signal.profit;
    
    return acc;
  }, {} as {[strategy: string]: {total: number, wins: number, losses: number, profit: number}});
  
  // Transform the symbolPerformance object into an array
  const symbolsData = Object.entries(symbolPerformance).map(([symbol, data]) => ({
    symbol,
    count: data.total,
    wins: data.wins,
    losses: data.losses,
    winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0
  }));
  
  // Transform the strategyPerformance object into an array
  const strategyData = Object.entries(strategyPerformance).map(([strategy, data]) => ({
    strategy,
    count: data.total,
    wins: data.wins,
    losses: data.losses,
    winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
    profit: data.profit,
    avgTradeProfit: data.total > 0 ? data.profit / data.total : 0
  }));
  
  return {
    totalSignals: total,
    winningTrades: wins,
    losingTrades: losses,
    winRate,
    avgProfit,
    symbolsData,
    strategyData,
    signalTypesData: [], // Placeholder for now
    dailyData: [] // Placeholder for now
  };
};

/**
 * Verifies all signals using Binance API data
 */
export const verifyAllSignalsWithBinance = async (): Promise<TradingSignal[]> => {
  const signals = getSignalsHistory();
  
  // Only process signals that haven't been verified yet or are unresolved
  const signalsToVerify = signals.filter(signal => 
    !signal.verifiedAt || 
    (signal.status !== "COMPLETED" && signal.result !== "win" && signal.result !== "loss")
  );
  
  if (signalsToVerify.length === 0) {
    toast.info("Não há sinais pendentes para verificação");
    return signals;
  }
  
  try {
    toast.info(`Verificando ${signalsToVerify.length} sinais com dados reais da Binance...`);
    const verifiedSignals = await batchVerifySignals(signalsToVerify);
    
    // Update only the signals that were verified
    const updatedSignals = signals.map(signal => {
      const verifiedSignal = verifiedSignals.find(vs => vs.id === signal.id);
      return verifiedSignal || signal;
    });
    
    // Save updated signals back to storage
    localStorage.setItem(SIGNALS_HISTORY_KEY, JSON.stringify(updatedSignals));
    
    toast.success(`Verificação concluída para ${signalsToVerify.length} sinais`);
    return updatedSignals;
  } catch (error) {
    console.error("Error verifying signals with Binance:", error);
    toast.error("Erro ao verificar sinais: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    return signals;
  }
};
