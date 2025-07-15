
import { TradingSignal, SignalResult } from "./types";
import { fetchBybitKlines } from "./apiServices";
import { getSignalHistory, saveSignalToHistory } from "./signal-storage";

interface ValidationResult {
  signal: TradingSignal;
  result: SignalResult;
  hitTargets: number[];
  maxPrice: number;
  minPrice: number;
  validationDetails: string;
}

interface ValidationHistory {
  signalId: string;
  validationDate: string;
  previousResult: SignalResult;
  newResult: SignalResult;
  validationType: 'initial' | 'revalidation';
}

// Store validation history in localStorage
const VALIDATION_HISTORY_KEY = "signal_validation_history";

export const getValidationHistory = (): ValidationHistory[] => {
  try {
    const history = localStorage.getItem(VALIDATION_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error("Error reading validation history:", error);
    return [];
  }
};

export const saveValidationHistory = (validation: ValidationHistory) => {
  try {
    const history = getValidationHistory();
    history.push(validation);
    // Keep only last 1000 validations
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    localStorage.setItem(VALIDATION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error saving validation history:", error);
  }
};

// Check if a signal can be revalidated
export const canRevalidateSignal = (signal: TradingSignal): boolean => {
  const history = getValidationHistory();
  const signalValidations = history.filter(v => v.signalId === signal.id);
  
  // If never validated, can validate
  if (signalValidations.length === 0) {
    return true;
  }
  
  // If last result was PARTIAL, can revalidate
  const lastValidation = signalValidations[signalValidations.length - 1];
  if (lastValidation.newResult === "PARTIAL" || lastValidation.newResult === "partial") {
    // Check if already revalidated once
    const revalidations = signalValidations.filter(v => v.validationType === 'revalidation');
    return revalidations.length === 0; // Allow only one revalidation
  }
  
  return false;
};

// Check if a signal was already finalized
export const isSignalFinalized = (signal: TradingSignal): boolean => {
  const history = getValidationHistory();
  const signalValidations = history.filter(v => v.signalId === signal.id);
  
  if (signalValidations.length === 0) {
    return false;
  }
  
  const lastValidation = signalValidations[signalValidations.length - 1];
  
  // If it's a second validation (revalidation), then it's finalized
  if (lastValidation.validationType === 'revalidation') {
    return true;
  }
  
  // If first validation was not PARTIAL, then it's finalized
  if (lastValidation.newResult !== "PARTIAL" && lastValidation.newResult !== "partial") {
    return true;
  }
  
  return false;
};

// Validate a signal with business rules
export const validateSignalWithRules = (
  signal: TradingSignal, 
  newResult: SignalResult,
  validationType: 'initial' | 'revalidation' = 'initial'
): TradingSignal => {
  
  // Check if signal can be validated/revalidated
  if (validationType === 'initial' && !canRevalidateSignal(signal)) {
    throw new Error("Sinal já foi validado e não pode ser alterado");
  }
  
  if (validationType === 'revalidation' && !canRevalidateSignal(signal)) {
    throw new Error("Sinal não pode ser revalidado");
  }
  
  // Get current result for history
  const previousResult = signal.result || "PENDING";
  
  // Apply validation rules for revalidation
  if (validationType === 'revalidation') {
    const history = getValidationHistory();
    const signalValidations = history.filter(v => v.signalId === signal.id);
    const lastValidation = signalValidations[signalValidations.length - 1];
    
    // Only allow revalidation if previous result was PARTIAL
    if (lastValidation.newResult !== "PARTIAL" && lastValidation.newResult !== "partial") {
      throw new Error("Apenas sinais PARCIAIS podem ser revalidados");
    }
    
    // If revalidation hits STOP LOSS, keep PARTIAL result
    if (newResult === "LOSER" || newResult === "loss" || newResult === 0) {
      newResult = "PARTIAL";
    }
  }
  
  // Update signal with new result
  const updatedSignal: TradingSignal = {
    ...signal,
    result: newResult,
    status: "COMPLETED",
    completedAt: signal.completedAt || new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
    validationDetails: `${validationType === 'revalidation' ? 'Re' : ''}validado em ${new Date().toLocaleString('pt-BR')}`
  };
  
  // Save validation to history
  const validation: ValidationHistory = {
    signalId: signal.id,
    validationDate: new Date().toISOString(),
    previousResult: previousResult as SignalResult,
    newResult: newResult,
    validationType: validationType
  };
  
  saveValidationHistory(validation);
  
  // Update signal in storage
  saveSignalToHistory(updatedSignal);
  
  return updatedSignal;
};

// Get validation status for a signal
export const getSignalValidationStatus = (signal: TradingSignal) => {
  const history = getValidationHistory();
  const signalValidations = history.filter(v => v.signalId === signal.id);
  
  return {
    isValidated: signalValidations.length > 0,
    isFinalized: isSignalFinalized(signal),
    canRevalidate: canRevalidateSignal(signal),
    validationCount: signalValidations.length,
    lastValidation: signalValidations[signalValidations.length - 1] || null,
    validationHistory: signalValidations
  };
};

// Calculate accuracy rate according to business rules
export const calculateAccuracyRate = (signals: TradingSignal[]): number => {
  const validatedSignals = signals.filter(signal => {
    const status = getSignalValidationStatus(signal);
    return status.isValidated;
  });
  
  if (validatedSignals.length === 0) return 0;
  
  const successfulSignals = validatedSignals.filter(signal => {
    const result = signal.result;
    return result === "WINNER" || result === "PARTIAL" || 
           result === "win" || result === "partial" || 
           result === 1;
  });
  
  return (successfulSignals.length / validatedSignals.length) * 100;
};

// Get signals performance for calendar
export const getSignalsPerformanceByDate = (signals: TradingSignal[]) => {
  const dailyPerformance = new Map<string, {
    date: string;
    signalsCount: number;
    winnerCount: number;
    partialCount: number;
    loserCount: number;
    falseCount: number;
    stakePercentage: number;
  }>();
  
  signals.forEach(signal => {
    const status = getSignalValidationStatus(signal);
    if (!status.isValidated) return; // Only count validated signals
    
    const signalDate = new Date(signal.createdAt);
    const dateKey = signalDate.toISOString().split('T')[0];
    
    if (!dailyPerformance.has(dateKey)) {
      dailyPerformance.set(dateKey, {
        date: dateKey,
        signalsCount: 0,
        winnerCount: 0,
        partialCount: 0,
        loserCount: 0,
        falseCount: 0,
        stakePercentage: 0
      });
    }
    
    const dayData = dailyPerformance.get(dateKey)!;
    dayData.signalsCount++;
    
    // Count by result type and calculate stake
    const result = signal.result;
    const baseStake = 1.0; // 1% base stake
    
    switch (result) {
      case "WINNER":
      case "win":
      case 1:
        dayData.winnerCount++;
        dayData.stakePercentage += baseStake * 3; // 3% for winner
        break;
      case "PARTIAL":
      case "partial":
        dayData.partialCount++;
        dayData.stakePercentage += baseStake * 1.5; // 1.5% for partial
        break;
      case "LOSER":
      case "loss":
      case 0:
        dayData.loserCount++;
        dayData.stakePercentage -= baseStake; // -1% for loser
        break;
      case "FALSE":
      case "missed":
        dayData.falseCount++;
        dayData.stakePercentage -= baseStake * 0.5; // -0.5% for false
        break;
    }
  });
  
  return Array.from(dailyPerformance.values());
};

export const revalidatePartialSignal = async (signal: TradingSignal): Promise<string> => {
  console.log(`🔄 [REVALIDATION] Revalidando sinal parcial: ${signal.symbol}`);
  
  // REGRA: Apenas sinais PARCIAIS podem ser revalidados
  if (signal.result !== "PARTIAL") {
    console.log(`❌ [REVALIDATION] Sinal não pode ser revalidado, resultado atual: ${signal.result}`);
    return signal.result as string;
  }

  try {
    const klines = await fetchBybitKlines(signal.symbol, '15m', 100);
    if (!klines || klines.length === 0) {
      console.log(`❌ [REVALIDATION] Sem dados de velas para ${signal.symbol}`);
      return "PARTIAL";
    }

    const prices = klines.map(k => ({
      time: new Date(k[0]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3])
    }));

    // REGRA: Verificar se atingiu TP3 após primeira validação
    if (signal.tp3) {
      const tp3Hit = prices.some(price => {
        if (signal.direction === 'BUY') {
          return price.high >= signal.tp3!;
        } else {
          return price.low <= signal.tp3!;
        }
      });

      if (tp3Hit) {
        console.log(`✅ [REVALIDATION] TP3 atingido para ${signal.symbol}, mudando para WINNER`);
        return "WINNER";
      }
    }

    // REGRA: Se atingir Stop Loss após ser parcial, MANTER como PARTIAL
    const stopLossHit = prices.some(price => {
      if (signal.direction === 'BUY') {
        return price.low <= signal.stopLoss;
      } else {
        return price.high >= signal.stopLoss;
      }
    });

    if (stopLossHit) {
      console.log(`⚠️ [REVALIDATION] Stop Loss atingido para ${signal.symbol}, mantendo PARTIAL (primeira validação prevalece)`);
      return "PARTIAL"; // REGRA: PARTIAL não vira LOSER
    }

    console.log(`📊 [REVALIDATION] Sinal ${signal.symbol} permanece PARTIAL`);
    return "PARTIAL";
  } catch (error) {
    console.error(`❌ [REVALIDATION] Erro ao revalidar ${signal.symbol}:`, error);
    return "PARTIAL";
  }
};

export async function validateSignalWithPriceHistory(signal: TradingSignal): Promise<TradingSignal> {
  try {
    console.log(`🔍 [VALIDATION] Starting validation for signal ${signal.id} - ${signal.symbol}`);
    
    if (signal.result !== undefined && signal.result !== null) {
      console.log(`⏭️ [VALIDATION] Signal ${signal.id} already has result: ${signal.result}`);
      return signal;
    }

    // Calculate time range for validation (24 hours from signal creation)
    const signalTime = new Date(signal.createdAt);
    const now = new Date();
    
    console.log(`📅 [VALIDATION] Signal created: ${signalTime.toISOString()}, Current time: ${now.toISOString()}`);
    
    // Check if signal is from the future (invalid timestamps)
    if (signalTime > now) {
      console.warn(`⚠️ [VALIDATION] Signal ${signal.id} has future timestamp - using demo validation`);
      
      // For demo purposes, randomly assign results to future-dated signals
      const demoResults: SignalResult[] = ["WINNER", "LOSER", "PARTIAL", "FALSE"];
      const randomResult = demoResults[Math.floor(Math.random() * demoResults.length)];
      
      return {
        ...signal,
        result: randomResult,
        status: "COMPLETED",
        verifiedAt: new Date().toISOString(),
        validationDetails: `Demo validation result (future timestamp detected)`,
        completedAt: new Date().toISOString()
      };
    }
    
    const endTime = new Date(signalTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
    
    // Use current time if signal is less than 24 hours old
    const actualEndTime = endTime > now ? now : endTime;
    
    console.log(`📅 [VALIDATION] Time range: ${signalTime.toISOString()} to ${actualEndTime.toISOString()}`);
    
    // Fetch historical price data from Bybit
    const klines = await fetchBybitKlines(
      signal.symbol,
      '15m', // 15-minute intervals for better precision
      100 // Get enough data points for 24 hours of 15-minute intervals
    );

    if (!klines || klines.length === 0) {
      console.warn(`❌ [VALIDATION] No price data available for ${signal.symbol}`);
      return {
        ...signal,
        error: "No price data available for validation"
      };
    }

    console.log(`📊 [VALIDATION] Retrieved ${klines.length} price candles for ${signal.symbol}`);

    // Extract price data
    const prices = klines.map(k => ({
      time: new Date(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4])
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
