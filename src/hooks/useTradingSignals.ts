
import { useState, useEffect, useCallback } from 'react';
import { TradingSignal, SignalStatus, SignalDirection, TradingStrategy } from '@/lib/types';
import { fetchSignals } from '@/lib/signalsApi';
import { mockSignals } from '@/lib/mockData';
import { toast } from 'sonner';

// Define the return type for our hook
export interface UseTradingSignalsReturn {
  signals: TradingSignal[];
  loading: boolean;
  error: Error | null;
  activeStrategy: string;
  strategies: string[];
  fetchSignals: (params?: { symbol?: string; type?: string; days?: number }) => Promise<void>;
  addSignals: (newSignals: TradingSignal[]) => Promise<void>;
  updateSignal: (signalId: string, updates: Partial<TradingSignal>) => void;
  setActiveStrategy: (strategy: string) => void;
}

// Helper functions
const generateId = () => Math.random().toString(36).substring(2, 11);

const generateMockSignal = (type: SignalDirection, symbol: string): TradingSignal => {
  const isLong = type === 'LONG';
  const basePrice = symbol === 'BTCUSDT' ? 65000 : 
                   symbol === 'ETHUSDT' ? 3500 : 
                   symbol === 'BNBUSDT' ? 550 : 
                   symbol === 'ADAUSDT' ? 0.5 : 
                   symbol === 'SOLUSDT' ? 145 : 
                   Math.random() * 1000;
  
  // Calculate entry, stop loss, and targets based on whether it's a long or short
  const entryMin = basePrice * (isLong ? 0.995 : 1.005);
  const entryMax = basePrice * (isLong ? 1.005 : 0.995);
  const entryAvg = (entryMin + entryMax) / 2;
  const stopLoss = basePrice * (isLong ? 0.97 : 1.03);
  
  const target1 = basePrice * (isLong ? 1.02 : 0.98);
  const target2 = basePrice * (isLong ? 1.05 : 0.95);
  const target3 = basePrice * (isLong ? 1.10 : 0.90);
  
  return {
    id: generateId(),
    symbol: symbol.replace('USDT', ''),
    pair: symbol,
    direction: type,
    type, // For backward compatibility
    entryPrice: entryAvg,
    entryMin,
    entryMax,
    entryAvg,
    stopLoss,
    targets: [
      { level: 1, price: target1, hit: false },
      { level: 2, price: target2, hit: false },
      { level: 3, price: target3, hit: false }
    ],
    leverage: 5 + Math.floor(Math.random() * 5), // Random leverage between 5-10
    status: 'ACTIVE' as SignalStatus,
    strategy: 'TREND_FOLLOWING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentPrice: basePrice
  };
};

/**
 * Hook for managing trading signals
 */
export function useTradingSignals(): UseTradingSignalsReturn {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<string>('all');
  const [strategies, setStrategies] = useState<string[]>([]);

  // Function to fetch signals from API
  const fetchSignalsData = useCallback(async (params?: { symbol?: string; type?: string; days?: number }) => {
    setLoading(true);
    setError(null);
    try {
      // Try to fetch from API first
      const data = await fetchSignals(params);
      setSignals(data);
      
      // Extract unique strategies
      const uniqueStrategies = Array.from(
        new Set(data.map(signal => signal.strategy || 'Unknown'))
      ).filter(Boolean) as string[];
      
      setStrategies(['all', ...uniqueStrategies]);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching signals:', err);
      // Fallback to mock data
      setSignals(mockSignals);
      setStrategies(['all', 'TREND_FOLLOWING', 'MEAN_REVERSION', 'BREAKOUT']);
      setError(err instanceof Error ? err : new Error('Unknown error fetching signals'));
      setLoading(false);
      
      // Show toast notification
      toast.error('Failed to fetch signals. Using mock data.');
    }
  }, []);

  // Initial fetch on component mount
  useEffect(() => {
    fetchSignalsData();
  }, [fetchSignalsData]);

  // Function to add new signals (for demo/testing purposes)
  const addSignals = useCallback(async (newSignals: TradingSignal[]) => {
    try {
      // If no signals provided, generate some random ones
      if (!newSignals || newSignals.length === 0) {
        const pairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
        const types: SignalDirection[] = ['LONG', 'SHORT'];
        
        newSignals = Array(5).fill(null).map(() => {
          const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
          const randomType = types[Math.floor(Math.random() * types.length)];
          return generateMockSignal(randomType, randomPair);
        });
      }
      
      // Update the state with new signals
      setSignals(currentSignals => {
        // Make sure the new signals match the TradingSignal type
        const typedNewSignals: TradingSignal[] = newSignals.map(signal => ({
          ...signal,
          status: signal.status as SignalStatus,
          direction: signal.direction as SignalDirection,
          type: signal.type as SignalDirection, // For backward compatibility
        }));
        
        return [...typedNewSignals, ...currentSignals];
      });
      
      // Extract strategies from new signals
      const newStrategies = newSignals
        .map(signal => signal.strategy)
        .filter(Boolean) as string[];
      
      // Update strategies list
      if (newStrategies.length > 0) {
        setStrategies(current => {
          const uniqueStrategies = Array.from(
            new Set([...current, ...newStrategies])
          );
          return uniqueStrategies;
        });
      }
    } catch (err) {
      console.error('Error adding signals:', err);
      setError(err instanceof Error ? err : new Error('Unknown error adding signals'));
    }
  }, []);

  // Function to update a specific signal
  const updateSignal = useCallback((signalId: string, updates: Partial<TradingSignal>) => {
    setSignals(currentSignals => 
      currentSignals.map(signal => 
        signal.id === signalId ? { ...signal, ...updates } : signal
      )
    );
  }, []);

  return {
    signals,
    loading,
    error,
    activeStrategy,
    strategies,
    fetchSignals: fetchSignalsData,
    addSignals,
    updateSignal,
    setActiveStrategy
  };
}

export default useTradingSignals;
