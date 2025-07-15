import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { syncSignals, saveSignalToSupabase, updateSignalInSupabase } from '@/lib/supabase-signal-storage';
import { getSignalHistory, saveSignalToHistory } from '@/lib/signal-storage';
import { TradingSignal } from '@/lib/types';

export const useSignalSync = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [signals, setSignals] = useState<TradingSignal[]>([]);

  // Load and sync signals when user changes
  useEffect(() => {
    if (user) {
      loadSignals();
    } else {
      // Load from localStorage if not authenticated
      setSignals(getSignalHistory());
    }
  }, [user]);

  const loadSignals = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const syncedSignals = await syncSignals();
      setSignals(syncedSignals);
    } catch (error) {
      console.error('Error loading signals:', error);
      // Fallback to localStorage
      setSignals(getSignalHistory());
    } finally {
      setIsLoading(false);
    }
  };

  const saveSignal = async (signal: TradingSignal) => {
    try {
      if (user) {
        // Save to Supabase if authenticated
        await saveSignalToSupabase(signal);
        await loadSignals(); // Reload to get updated data
      } else {
        // Save to localStorage if not authenticated
        saveSignalToHistory(signal);
        setSignals(getSignalHistory());
      }
    } catch (error) {
      console.error('Error saving signal:', error);
      // Fallback to localStorage
      saveSignalToHistory(signal);
      setSignals(getSignalHistory());
    }
  };

  const updateSignal = async (signalId: string, updates: Partial<TradingSignal>) => {
    try {
      if (user) {
        // Update in Supabase if authenticated
        await updateSignalInSupabase(signalId, updates);
        await loadSignals(); // Reload to get updated data
      } else {
        // Update in localStorage if not authenticated
        const localSignals = getSignalHistory();
        const updatedSignals = localSignals.map(signal =>
          signal.id === signalId ? { ...signal, ...updates } : signal
        );
        localStorage.setItem('trade_signal_history', JSON.stringify(updatedSignals));
        setSignals(updatedSignals);
      }
    } catch (error) {
      console.error('Error updating signal:', error);
      // Fallback to localStorage update
      const localSignals = getSignalHistory();
      const updatedSignals = localSignals.map(signal =>
        signal.id === signalId ? { ...signal, ...updates } : signal
      );
      localStorage.setItem('trade_signal_history', JSON.stringify(updatedSignals));
      setSignals(updatedSignals);
    }
  };

  return {
    signals,
    isLoading,
    saveSignal,
    updateSignal,
    loadSignals,
  };
};