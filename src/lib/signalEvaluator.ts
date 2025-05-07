
import { TradingSignal, SignalResult, SignalDirection } from '@/lib/types';
import { fetchCurrentPrice } from './bybitApi';

/**
 * Evaluates a signal based on current price data from Bybit
 * @param signal The trading signal to evaluate
 * @returns The evaluated result (WINNER, LOSER, PARTIAL, FALSE) or null if can't evaluate
 */
export const evaluateSignalRealtime = async (signal: TradingSignal): Promise<SignalResult | null> => {
  if (!signal.symbol) {
    console.error('Signal missing symbol:', signal);
    return null;
  }

  // If signal was created less than 15 minutes ago, don't evaluate
  const createdAt = new Date(signal.createdAt || Date.now());
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  if (createdAt > fifteenMinutesAgo) {
    console.log(`Signal ${signal.id} is too recent (less than 15 minutes old)`);
    return null;
  }

  // Get current price from Bybit
  const currentPrice = await fetchCurrentPrice(signal.symbol);
  
  if (!currentPrice) {
    console.error('Could not fetch current price for', signal.symbol);
    return null;
  }

  // Save current price to signal for display
  signal.currentPrice = currentPrice;

  // Extract take profit targets
  const tp1 = signal.tp1 || (signal.targets && signal.targets.length > 0 ? signal.targets[0].price : undefined);
  const tp2 = signal.tp2 || (signal.targets && signal.targets.length > 1 ? signal.targets[1].price : undefined);
  const tp3 = signal.tp3 || (signal.targets && signal.targets.length > 2 ? signal.targets[2].price : undefined);
  const stopLoss = signal.stopLoss || signal.sl;
  
  if (!tp1 || !stopLoss) {
    console.error('Signal missing TP or SL:', signal);
    return null;
  }

  // Evaluate based on direction and price
  if (signal.direction === 'BUY') {
    if (currentPrice <= stopLoss) {
      return 'LOSER';
    } else if (tp3 && currentPrice >= tp3) {
      return 'WINNER';
    } else if (tp2 && currentPrice >= tp2) {
      return 'PARTIAL';
    } else if (currentPrice >= tp1) {
      return 'PARTIAL';
    }
  } else if (signal.direction === 'SELL') {
    if (currentPrice >= stopLoss) {
      return 'LOSER';
    } else if (tp3 && currentPrice <= tp3) {
      return 'WINNER';
    } else if (tp2 && currentPrice <= tp2) {
      return 'PARTIAL';
    } else if (currentPrice <= tp1) {
      return 'PARTIAL';
    }
  }

  // If signal is more than 15 minutes old and no targets hit, mark as FALSE
  if (createdAt <= fifteenMinutesAgo) {
    return 'FALSE';
  }

  // No conditions met, signal is still active
  return null;
};

/**
 * Gets hit target levels for a signal based on current price
 * @param signal The trading signal
 * @param currentPrice Current price (optional, will be fetched if not provided)
 * @returns Array of boolean values indicating which targets were hit
 */
export const getHitTargets = async (signal: TradingSignal, currentPrice?: number): Promise<boolean[]> => {
  // If current price not provided, fetch it
  const price = currentPrice || await fetchCurrentPrice(signal.symbol);
  if (!price) return [false, false, false];
  
  const tp1 = signal.tp1 || (signal.targets && signal.targets.length > 0 ? signal.targets[0].price : undefined);
  const tp2 = signal.tp2 || (signal.targets && signal.targets.length > 1 ? signal.targets[1].price : undefined);
  const tp3 = signal.tp3 || (signal.targets && signal.targets.length > 2 ? signal.targets[2].price : undefined);
  
  if (signal.direction === 'BUY') {
    return [
      !!tp1 && price >= tp1,
      !!tp2 && price >= tp2, 
      !!tp3 && price >= tp3
    ];
  } else {
    return [
      !!tp1 && price <= tp1,
      !!tp2 && price <= tp2,
      !!tp3 && price <= tp3
    ];
  }
};
