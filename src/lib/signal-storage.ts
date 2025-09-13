
import { TradingSignal } from "./types";

// Key for localStorage
const SIGNAL_HISTORY_KEY = "trade_signal_history";

// Saves or updates a signal in history
export const saveSignalToHistory = (signal: TradingSignal) => {
  const existing = JSON.parse(localStorage.getItem(SIGNAL_HISTORY_KEY) || "[]");

  // Remove the existing signal with the same ID if it exists
  const updatedHistory = existing.filter((s: TradingSignal) => s.id !== signal.id);
  
  // Add the new/updated signal at the top
  updatedHistory.unshift(signal);

  // Save all signals without limit
  localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(updatedHistory));
  
  console.log(`Signal ${signal.id} saved to history. Total signals: ${updatedHistory.length}`);
};

// Saves multiple signals to history at once
export const saveSignalsToHistory = (signals: TradingSignal[]) => {
  if (!signals || signals.length === 0) return;
  
  const existing = JSON.parse(localStorage.getItem(SIGNAL_HISTORY_KEY) || "[]");
  
  // Get existing IDs for quick lookup
  const existingIds = new Set(existing.map((s: TradingSignal) => s.id));
  
  // Combine existing and new signals, avoiding duplicates
  let combined = [...existing];
  
  signals.forEach(signal => {
    if (existingIds.has(signal.id)) {
      // Update existing signal
      const index = combined.findIndex((s: TradingSignal) => s.id === signal.id);
      if (index !== -1) {
        combined[index] = signal;
      }
    } else {
      // Add new signal
      combined.unshift(signal);
    }
  });
  
  // Save all signals without limit
  
  localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(combined));
  
  console.log(`Saved ${signals.length} signals to history. Total signals: ${combined.length}`);
};

// Retrieves all signals from history
export const getSignalHistory = (): TradingSignal[] => {
  return JSON.parse(localStorage.getItem(SIGNAL_HISTORY_KEY) || "[]");
};

/**
 * Updates a single signal in the signal history and saves to localStorage
 */
export function updateSignalInHistory(signalId: string, updates: Partial<TradingSignal>): void {
  try {
    const signals = getSignalHistory();
    const updatedSignals = signals.map(signal =>
      signal.id === signalId ? { ...signal, ...updates } : signal
    );
    
    localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(updatedSignals));
    console.log(`✅ [STORAGE] Signal ${signalId} updated with:`, updates);
  } catch (error) {
    console.error('❌ [STORAGE] Error updating signal in history:', error);
  }
}

/**
 * Forces immediate save of evaluation results to localStorage
 */
export function saveEvaluationResults(results: Array<{ signalId: string; result: string | number; profit?: number }>): void {
  try {
    const signals = getSignalHistory();
    const updatedSignals = signals.map(signal => {
      const result = results.find(r => r.signalId === signal.id);
      if (result) {
        return {
          ...signal,
          result: result.result,
          profit: result.profit,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString()
        };
      }
      return signal;
    });
    
    localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(updatedSignals));
    console.log(`✅ [STORAGE] Saved ${results.length} evaluation results to localStorage`);
    
    // Log each saved result for verification
    results.forEach(r => {
      console.log(`✅ [STORAGE] Result saved - Signal ${r.signalId}: ${r.result}`);
    });
    
  } catch (error) {
    console.error('❌ [STORAGE] Error saving evaluation results:', error);
  }
}

// Updates a signal's targets with current price information
export const updateSignalTargets = (signal: TradingSignal, currentPrice: number): TradingSignal => {
  if (!signal || !signal.targets || !currentPrice) return signal;
  
  const updatedSignal = { ...signal };
  
  // Update targets hit status based on current price
  updatedSignal.targets = signal.targets.map(target => {
    // For BUY signals, target is hit if price goes above target price
    // For SELL signals, target is hit if price goes below target price
    const isTargetHit = signal.direction === "BUY" 
      ? currentPrice >= target.price 
      : currentPrice <= target.price;
      
    return {
      ...target,
      hit: isTargetHit || target.hit === true // Once hit, always hit
    };
  });
  
  // Check if stop loss was hit
  const isStopLossHit = signal.direction === "BUY"
    ? currentPrice <= signal.stopLoss
    : currentPrice >= signal.stopLoss;
    
  // Update signal status based on targets and stop loss
  if (isStopLossHit) {
    updatedSignal.status = "COMPLETED";
    updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
    updatedSignal.result = 0; // Loss
    
    // Calculate negative profit (loss)
    const entryPrice = signal.entryPrice || 0;
    updatedSignal.profit = signal.direction === "BUY"
      ? ((signal.stopLoss / entryPrice) - 1) * 100
      : ((entryPrice / signal.stopLoss) - 1) * 100;
  } 
  // Check if any targets were hit
  else if (updatedSignal.targets.some(t => t.hit)) {
    // Get the highest hit target
    const hitTargets = updatedSignal.targets.filter(t => t.hit);
    const highestHitTarget = hitTargets.reduce(
      (highest, current) => current.level > highest.level ? current : highest,
      hitTargets[0]
    );
    
    // If all targets hit, mark as completed
    if (updatedSignal.targets.every(t => t.hit)) {
      updatedSignal.status = "COMPLETED";
      updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
    }
    
    // Calculate profit based on highest hit target
    const entryPrice = signal.entryPrice || 0;
    updatedSignal.profit = signal.direction === "BUY"
      ? ((highestHitTarget.price / entryPrice) - 1) * 100
      : ((entryPrice / highestHitTarget.price) - 1) * 100;
      
    // If any target was hit, it's a win (even partial)
    updatedSignal.result = 1;
  }
  
  // Add verification timestamp
  updatedSignal.verifiedAt = new Date().toISOString();
  
  return updatedSignal;
};

// Processes the entire signal history with current prices
export const processSignalHistory = (currentPrices: Record<string, number>): TradingSignal[] => {
  const signals = getSignalHistory();
  
  const updatedSignals = signals.map(signal => {
    // Only process active signals or those without a definitive result
    if (signal.status !== "COMPLETED" || signal.result === undefined) {
      const currentPrice = currentPrices[signal.symbol];
      if (currentPrice) {
        return updateSignalTargets(signal, currentPrice);
      }
    }
    return signal;
  });
  
  // Save the updated signals back to history
  localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(updatedSignals));
  
  return updatedSignals;
};

// Export the functions for verification
export { verifyAllSignals } from "./signalVerification";
