
import { TradingSignal } from "@/lib/types";
import { getSignalHistory, saveSignalsToHistory } from "@/lib/signal-storage";
import { verifyTradingSignal } from "./firebaseFunctions";

/**
 * Verifies a single trading signal against current market data
 */
export async function verifySingleSignal(signal: TradingSignal): Promise<TradingSignal> {
  try {
    // Skip verification if result already exists
    if (signal.result !== undefined) {
      console.log(`Signal ${signal.id} already has a result. Skipping verification.`);
      return signal;
    }
    
    // Verify the signal using Firebase Function (or local simulation)
    const verifiedSignal = await verifyTradingSignal(signal);
    
    // Log the verification result
    console.log(`Signal ${signal.id} verification result: ${verifiedSignal.result}`);
    
    return verifiedSignal;
  } catch (error) {
    console.error(`Error verifying signal ${signal.id}:`, error);
    return {
      ...signal,
      error: error instanceof Error ? error.message : "Unknown error during verification"
    };
  }
}

/**
 * Verifies the status of all signals against current market data
 */
export async function verifyAllSignals(signalsToVerify?: TradingSignal[]): Promise<TradingSignal[]> {
  try {
    // Get signals to verify - either provided signals or from storage
    const signals = signalsToVerify || getSignalHistory();
    
    if (!signals || signals.length === 0) {
      return [];
    }
    
    // Filter to only verify signals that don't have results yet
    const signalsNeedingVerification = signals.filter(
      signal => signal.result === undefined
    );
    
    if (signalsNeedingVerification.length === 0) {
      console.log("No signals need verification - all already have results");
      return signals;
    }
    
    console.log(`Verifying ${signalsNeedingVerification.length} signals without results...`);
    
    // Process signals in small batches to avoid overwhelming the API
    const batchSize = 5;
    const verifiedSignals: TradingSignal[] = [];
    
    for (let i = 0; i < signalsNeedingVerification.length; i += batchSize) {
      const batch = signalsNeedingVerification.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1}/${Math.ceil(signalsNeedingVerification.length/batchSize)}`);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(signal => verifySingleSignal(signal))
      );
      
      verifiedSignals.push(...batchResults);
      
      // Add a small delay between batches to be kind to the API
      if (i + batchSize < signalsNeedingVerification.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Merge verified signals back with original signals list
    const updatedSignals = signals.map(signal => {
      const verifiedSignal = verifiedSignals.find(vs => vs.id === signal.id);
      return verifiedSignal || signal;
    });
    
    // Save the updated signals to local storage
    saveSignalsToHistory(updatedSignals);
    
    // Save validated signals to performance storage
    try {
      const { autoValidateSignal, validateAndSaveSignal } = await import('./performanceStorage');
      
      verifiedSignals.forEach(signal => {
        const validationResult = autoValidateSignal(signal);
        if (validationResult) {
          validateAndSaveSignal(signal, validationResult);
        }
      });
      
      console.log(`💾 Saved ${verifiedSignals.length} verified signals to performance storage`);
    } catch (perfError) {
      console.error('Failed to save verified signals to performance storage:', perfError);
    }
    
    return updatedSignals;
  } catch (error) {
    console.error("Error verifying signals:", error);
    throw error;
  }
}
