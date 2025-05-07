
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSignalsHistory, canEvaluateSignal } from "@/lib/signalsApi";
import { TradingSignal } from "@/lib/types";
import { getSignalHistory } from "@/lib/signal-storage";
import { useToast } from "@/components/ui/use-toast";

export function useSignalHistory(filters: { symbol?: string; result?: string }) {
  const { toast } = useToast();
  
  const {
    data: signals,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["signalsHistory", filters],
    queryFn: async () => {
      try {
        // Try to fetch from API first
        const apiSignals = await fetchSignalsHistory(filters);
        return apiSignals;
      } catch (apiError) {
        console.error("API error, using local signals:", apiError);
        
        // Fall back to local storage if API fails
        const localSignals = getSignalHistory();
        
        // Apply filters to local signals
        if (filters.symbol || filters.result) {
          return localSignals.filter(signal => {
            const matchesSymbol = !filters.symbol || signal.symbol === filters.symbol;
            
            const matchesResult = !filters.result || 
              (filters.result === 'win' && (signal.result === 'win' || signal.result === 1 || signal.result === 'WINNER')) ||
              (filters.result === 'loss' && (signal.result === 'loss' || signal.result === 0 || signal.result === 'LOSER')) ||
              (filters.result === 'partial' && signal.result === 'partial');
            
            return matchesSymbol && matchesResult;
          });
        }
        
        return localSignals;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Handle API connection errors
  React.useEffect(() => {
    if (isError) {
      console.error("Error fetching signals history:", error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de sinais. Usando dados em cache.",
        variant: "destructive"
      });
    }
  }, [isError, error, toast]);

  // Calculate unique symbols for filter dropdown
  const uniqueSymbols = React.useMemo(() => {
    if (!signals) return [];
    
    const symbolsSet = new Set<string>();
    signals.forEach(signal => {
      if (signal.symbol) {
        symbolsSet.add(signal.symbol);
      }
    });
    
    return Array.from(symbolsSet).sort();
  }, [signals]);

  // Count signals that are eligible for evaluation
  const signalsReadyForEvaluation = React.useMemo(() => {
    if (!signals) return 0;
    return signals.filter(s => {
      const { canEvaluate } = canEvaluateSignal(s);
      return canEvaluate;
    }).length;
  }, [signals]);

  // Count signals waiting for the 15-minute cooldown
  const signalsWaiting = React.useMemo(() => {
    if (!signals) return 0;
    
    return signals.filter(s => {
      if (s.verifiedAt || s.result) return false;
      
      // Check if signal is newer than 15 minutes
      if (s.createdAt) {
        const createdAt = new Date(s.createdAt);
        const now = new Date();
        const fifteenMinutesInMs = 15 * 60 * 1000;
        return now.getTime() - createdAt.getTime() < fifteenMinutesInMs;
      }
      
      return false;
    }).length;
  }, [signals]);

  return { 
    signals, 
    isLoading, 
    isError, 
    error, 
    refetch, 
    uniqueSymbols, 
    signalsReadyForEvaluation, 
    signalsWaiting 
  };
}

export default useSignalHistory;
