
import { TradingSignal } from "./types";
import { getSignalHistory } from "./signal-storage";

/**
 * Verifies a signal against real market data
 * @param signal The signal to verify
 * @param currentPrice The current price of the symbol
 * @returns The updated signal with verification data
 */
export const verifySignal = (signal: TradingSignal, currentPrice: number): TradingSignal => {
  // Clone the signal to avoid modifying the original
  const updatedSignal = { ...signal };
  
  if (!currentPrice || !signal.entryPrice) {
    return {
      ...updatedSignal,
      verifiedAt: new Date().toISOString(),
      error: "Missing price data for verification"
    };
  }
  
  // Update targets hit status based on current price
  if (updatedSignal.targets) {
    updatedSignal.targets = updatedSignal.targets.map(target => {
      // For BUY signals, target is hit if price rose above target price
      // For SELL signals, target is hit if price fell below target price
      const isHit = signal.direction === "BUY" || signal.type === "LONG"
        ? currentPrice >= target.price
        : currentPrice <= target.price;
        
      return {
        ...target,
        hit: isHit || target.hit === true // Once hit, always hit
      };
    });
    
    // Record which targets were hit (for display purposes)
    updatedSignal.hitTargets = updatedSignal.targets.map(target => !!target.hit);
  }
  
  // Check if stop loss was hit
  const isStopLossHit = signal.direction === "BUY" || signal.type === "LONG"
    ? currentPrice <= signal.stopLoss
    : currentPrice >= signal.stopLoss;
    
  // Update signal status based on verification
  if (isStopLossHit) {
    updatedSignal.status = "COMPLETED";
    updatedSignal.result = 0; // Loss
    updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
    
    // Calculate loss percentage
    const entryPrice = signal.entryPrice || 0;
    updatedSignal.profit = signal.direction === "BUY" || signal.type === "LONG"
      ? ((signal.stopLoss / entryPrice) - 1) * 100
      : ((entryPrice / signal.stopLoss) - 1) * 100;
  } 
  // Check if any targets were hit
  else if (updatedSignal.targets && updatedSignal.targets.some(t => t.hit)) {
    // If all targets hit, mark as completed win
    if (updatedSignal.targets.every(t => t.hit)) {
      updatedSignal.status = "COMPLETED";
      updatedSignal.result = 1; // Win
      updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
    } 
    // If some targets hit, mark as partial win
    else {
      updatedSignal.status = "COMPLETED";
      updatedSignal.result = 1; // Still a win even if partial
      updatedSignal.completedAt = updatedSignal.completedAt || new Date().toISOString();
    }
    
    // Calculate profit based on highest hit target
    const hitTargets = updatedSignal.targets.filter(t => t.hit);
    if (hitTargets.length > 0) {
      const highestHitTarget = hitTargets.reduce((highest, current) => 
        current.level > highest.level ? current : highest, hitTargets[0]);
      
      const entryPrice = signal.entryPrice || 0;
      updatedSignal.profit = signal.direction === "BUY" || signal.type === "LONG"
        ? ((highestHitTarget.price / entryPrice) - 1) * 100
        : ((entryPrice / highestHitTarget.price) - 1) * 100;
    }
  }
  
  // Add verification timestamp
  updatedSignal.verifiedAt = new Date().toISOString();
  
  return updatedSignal;
};

/**
 * Fetches current prices for a list of symbols
 * @param symbols List of symbols to get prices for
 * @returns Object mapping symbols to their current prices
 */
export const fetchCurrentPrices = async (symbols: string[]): Promise<Record<string, number>> => {
  try {
    // Create a unique list of symbols
    const uniqueSymbols = [...new Set(symbols)];
    
    // Fetch prices from Binance API (free, no API key needed for spot prices)
    const results = await Promise.all(
      uniqueSymbols.map(async (symbol) => {
        try {
          // For USDT pairs
          const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
          
          if (response.ok) {
            const data = await response.json();
            return { symbol, price: parseFloat(data.price) };
          }
          
          // Try with BUSD pair if USDT pair fails
          const altResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.replace('USDT', 'BUSD')}`);
          
          if (altResponse.ok) {
            const data = await altResponse.json();
            return { symbol, price: parseFloat(data.price) };
          }
          
          console.warn(`Could not fetch price for ${symbol}`);
          return { symbol, price: null };
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
          return { symbol, price: null };
        }
      })
    );
    
    // Convert results to a symbol -> price map
    const priceMap: Record<string, number> = {};
    results.forEach(result => {
      if (result.price !== null) {
        priceMap[result.symbol] = result.price;
      }
    });
    
    return priceMap;
  } catch (error) {
    console.error("Error fetching current prices:", error);
    return {};
  }
};

/**
 * Verifies all signals in history against current market data
 * @returns Updated list of signals
 */
export const verifyAllSignals = async (): Promise<TradingSignal[]> => {
  // Get all signals from history
  const signals = getSignalHistory();
  
  if (!signals || signals.length === 0) {
    return [];
  }
  
  // Get unique symbols from the signals
  const symbols = [...new Set(signals.map(s => s.symbol))];
  
  // Fetch current prices for all symbols
  const currentPrices = await fetchCurrentPrices(symbols);
  
  // Verify each signal with the current price
  const verifiedSignals = signals.map(signal => {
    const currentPrice = currentPrices[signal.symbol];
    
    // Skip verification if we couldn't get a price
    if (!currentPrice) {
      return {
        ...signal,
        verifiedAt: new Date().toISOString(),
        error: "Could not fetch current price"
      };
    }
    
    // Verify the signal
    return verifySignal(signal, currentPrice);
  });
  
  // Save verified signals back to storage
  localStorage.setItem("trade_signal_history", JSON.stringify(verifiedSignals));
  
  return verifiedSignals;
};
