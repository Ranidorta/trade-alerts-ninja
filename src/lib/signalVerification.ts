
import { TradingSignal } from "@/lib/types";
import { getSignalHistory, saveSignalsToHistory } from "@/lib/signal-storage";
// Removed Firebase dependency - using mock verification

/**
 * Verifies a single trading signal against current market data
 */
export async function verifySingleSignal(signal: TradingSignal): Promise<TradingSignal> {
  try {
    // Skip verification if result is WINNER or LOSER (definitivos)
    if (signal.result === "WINNER" || signal.result === "LOSER" || signal.result === 1 || signal.result === 0) {
      console.log(`Signal ${signal.id} already has a final result (${signal.result}). Skipping verification.`);
      return signal;
    }
    
    // Only re-verify PARTIAL results or undefined/pending results
    if (signal.result !== undefined && signal.result !== "PARTIAL" && signal.result !== "PENDING") {
      console.log(`Signal ${signal.id} has result ${signal.result} but not PARTIAL/PENDING. Skipping verification.`);
      return signal;
    }
    
    // Mock verification - just return the signal for now
    const verifiedSignal = { ...signal, result: signal.result || "PENDING" };
    
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
    
    // Filter to only verify signals that need verification:
    // - Signals without result (undefined/PENDING)
    // - Signals with PARTIAL result (para reavaliar)
    // - Skip WINNER/LOSER definitivos
    const signalsNeedingVerification = signals.filter(
      signal => signal.result === undefined || 
                signal.result === "PENDING" || 
                signal.result === "PARTIAL"
    ).filter(
      signal => signal.result !== "WINNER" && 
                signal.result !== "LOSER" && 
                signal.result !== 1 && 
                signal.result !== 0
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
    
    return updatedSignals;
  } catch (error) {
    console.error("Error verifying signals:", error);
    throw error;
  }
}
