import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
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
      // For now, just use localStorage - can be replaced with Supabase later
      setSignals(getSignalHistory());
    } catch (error) {
      console.error('Error loading signals:', error);
      setSignals(getSignalHistory());
    } finally {
      setIsLoading(false);
    }
  };

  const saveSignal = async (signal: TradingSignal) => {
    try {
      // For now, just save to localStorage - can be replaced with Supabase later
      saveSignalToHistory(signal);
      setSignals(getSignalHistory());
    } catch (error) {
      console.error('Error saving signal:', error);
      saveSignalToHistory(signal);
      setSignals(getSignalHistory());
    }
  };

  const updateSignal = async (signalId: string, updates: Partial<TradingSignal>) => {
    try {
      // Update in localStorage
      const localSignals = getSignalHistory();
      const updatedSignals = localSignals.map(signal =>
        signal.id === signalId ? { ...signal, ...updates } : signal
      );
      localStorage.setItem('trade_signal_history', JSON.stringify(updatedSignals));
      setSignals(updatedSignals);
    } catch (error) {
      console.error('Error updating signal:', error);
    }
  };

  const updateMultipleSignals = async (updatedSignals: TradingSignal[]) => {
    try {
      // Update localStorage immediately
      localStorage.setItem('trade_signal_history', JSON.stringify(updatedSignals));
      setSignals(updatedSignals);
      
      // Log each signal's result for verification
      updatedSignals.forEach(signal => {
        if (signal.result && signal.result !== "PENDING") {
          console.log(`✅ [SYNC] Signal ${signal.id} (${signal.symbol}) result saved: ${signal.result}`);
        }
      });
      
      console.log('✅ [SYNC] Multiple signals updated and results persisted in localStorage');
    } catch (error) {
      console.error('❌ [SYNC] Error updating multiple signals:', error);
    }
  };

  return {
    signals,
    isLoading,
    saveSignal,
    updateSignal,
    updateMultipleSignals,
    loadSignals,
  };
};