import { useState, useEffect, useCallback } from "react";
import { TradingSignal, SignalResult } from "@/lib/types";
import { config } from "@/config/env";
import { useToast } from "@/components/ui/use-toast";
import { 
  getSignalsHistory, 
  updateAllSignalsStatus,
  reprocessAllHistory
} from "@/lib/signalHistoryService";
import { logTradeSignal } from "@/lib/firebase";
import { saveSignalToHistory, saveSignalsToHistory } from "@/lib/signal-storage";
import { generateMonsterSignals } from "@/lib/signalsApi";

// Set up localStorage keys
const SIGNALS_STORAGE_KEY = "archived_trading_signals";
const LAST_ACTIVE_SIGNAL_KEY = "last_active_signal";

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Load signals from localStorage on initial mount
  useEffect(() => {
    const cachedSignals = localStorage.getItem(SIGNALS_STORAGE_KEY);
    if (cachedSignals) {
      try {
        const parsedSignals = JSON.parse(cachedSignals);
        setSignals(parsedSignals);
        
        // Also save to signals history
        saveSignalsToHistory(parsedSignals);
        
        console.log("Loaded cached signals from localStorage:", parsedSignals.length);
      } catch (err) {
        console.error("Error parsing cached signals:", err);
        // Invalid data in localStorage, clear it
        localStorage.removeItem(SIGNALS_STORAGE_KEY);
      }
    }
  }, []);

  // Function to get the last active signal
  const getLastActiveSignal = useCallback((): TradingSignal | null => {
    try {
      const lastSignalJson = localStorage.getItem(LAST_ACTIVE_SIGNAL_KEY);
      if (lastSignalJson) {
        return JSON.parse(lastSignalJson);
      }
    } catch (err) {
      console.error("Error retrieving last active signal:", err);
      localStorage.removeItem(LAST_ACTIVE_SIGNAL_KEY);
    }
    return null;
  }, []);

  // Function to set the last active signal
  const setLastActiveSignal = useCallback((signal: TradingSignal | null) => {
    if (signal) {
      localStorage.setItem(LAST_ACTIVE_SIGNAL_KEY, JSON.stringify(signal));
    }
  }, []);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting signal generation process...');
      
      let newSignals: TradingSignal[] = [];
      let fetchedFromRemote = false;
      
      try {
        // First try to fetch from backends
        const backendUrls = [
          config.signalsApiUrl,
          'https://trade-alerts-backend.onrender.com',
          'http://localhost:5000'
        ].filter(Boolean);

        for (const backendUrl of backendUrls) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${backendUrl}/signals?strategy=CLASSIC`, {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              newSignals = data;
              fetchedFromRemote = true;
              console.log(`✅ Signals loaded from ${backendUrl}:`, newSignals.length);
              
              toast({
                title: "Signals loaded",
                description: `Successfully loaded ${newSignals.length} signals from backend`,
              });
              break;
            }
          } catch (fetchError) {
            console.warn(`Failed to fetch from ${backendUrl}:`, fetchError.message);
            continue;
          }
        }
        
      } catch (fetchError) {
        console.warn(`Could not fetch from any backend: ${fetchError.message}`);
      }
      
      // If no backend worked, generate monster signals locally
      if (!fetchedFromRemote) {
        console.log('📡 Backend unavailable, generating local monster signals...');
        
        try {
          // Use the monster signal generation from signalsApi
          newSignals = await generateMonsterSignals([
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'ADAUSDT',
            'BNBUSDT', 'XRPUSDT', 'MATICUSDT', 'LINKUSDT', 'AVAXUSDT'
          ]);
          
          console.log(`✅ Generated ${newSignals.length} local monster signals`);
          
          toast({
            title: "Monster signals generated",
            description: `Generated ${newSignals.length} high-quality signals using real market data`,
          });
          
        } catch (monsterError) {
          console.error('❌ Monster signal generation failed:', monsterError);
          
          // Final fallback to demo data
          newSignals = generateMockSignals(10);
          console.log("Generated fallback demo signals:", newSignals.length);
          
          toast({
            title: "Using demo data",
            description: "Signal generation unavailable. Using demo data.",
          });
        }
      }
      
      // Process signals to ensure they have all required fields
      const processedSignals = newSignals.map((signal: TradingSignal) => {
        if (signal.result === undefined) {
          if (signal.profit !== undefined) {
            signal.result = signal.profit > 0 ? "WINNER" as SignalResult : "LOSER" as SignalResult;
          } else if (signal.status === "COMPLETED") {
            signal.result = Math.random() > 0.5 ? "WINNER" as SignalResult : "LOSER" as SignalResult;
          }
        }
        
        if (signal.targets && Array.isArray(signal.targets)) {
          signal.targets = signal.targets.map((target, index) => ({
            ...target,
            hit: (signal.result === "WINNER" || signal.result === "win" || signal.result === 1) && index === 0 ? true : 
                 (signal.result === "WINNER" || signal.result === "win" || signal.result === 1) && index > 0 ? Math.random() > 0.5 : false
          }));
        } else if (signal.entryPrice) {
          signal.targets = [
            { level: 1, price: signal.entryPrice * 1.03, hit: (signal.result === "WINNER" || signal.result === "win" || signal.result === 1) },
            { level: 2, price: signal.entryPrice * 1.05, hit: (signal.result === "WINNER" || signal.result === "win" || signal.result === 1) && Math.random() > 0.6 },
            { level: 3, price: signal.entryPrice * 1.08, hit: (signal.result === "WINNER" || signal.result === "win" || signal.result === 1) && Math.random() > 0.8 }
          ];
        }
        
        return {
          ...signal,
          symbol: signal.symbol || signal.pair || "UNKNOWN",
          direction: signal.direction || (Math.random() > 0.5 ? "BUY" : "SELL"),
          status: signal.status || "WAITING",
          entryPrice: signal.entryPrice || signal.entryAvg || 0,
          targets: signal.targets || [],
          createdAt: signal.createdAt || new Date().toISOString(),
        };
      });
      
      // Update state with processed signals
      setSignals(processedSignals);
      
      // Save to localStorage and history
      if (processedSignals.length > 0) {
        localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(processedSignals));
        saveSignalsToHistory(processedSignals);
      }
      
    } catch (err: any) {
      console.error("Error in fetchSignals:", err);
      setError(err);
      
      toast({
        variant: "destructive",
        title: "Error loading signals",
        description: "Failed to load signals. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addSignals = useCallback((newSignals: TradingSignal[]) => {
    setSignals(currentSignals => {
      const signalIds = new Set(currentSignals.map(s => s.id));
      const uniqueNewSignals = newSignals.filter(s => !signalIds.has(s.id));
      
      if (uniqueNewSignals.length === 0) return currentSignals;
      
      const processedNewSignals = uniqueNewSignals.map(signal => ({
        ...signal,
        createdAt: signal.createdAt || new Date().toISOString(),
        result: signal.result !== undefined ? signal.result : undefined,
        targets: signal.targets || (signal.entryPrice ? [
          { level: 1, price: signal.entryPrice * 1.03, hit: false },
          { level: 2, price: signal.entryPrice * 1.05, hit: false },
          { level: 3, price: signal.entryPrice * 1.08, hit: false }
        ] : [])
      }));
      
      if (processedNewSignals.length > 0 && currentSignals.length === 0) {
        setLastActiveSignal(processedNewSignals[0]);
      }
      
      const updatedSignals = [...processedNewSignals, ...currentSignals];
      
      localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(updatedSignals));
      saveSignalsToHistory(processedNewSignals);
      
      processedNewSignals.forEach(signal => {
        saveSignalToHistory(signal);
        
        logTradeSignal(signal)
          .then(success => {
            if (!success) console.warn(`Failed to log signal ${signal.id} to Firebase`);
          })
          .catch(err => console.error("Error logging signal to Firebase:", err));
      });
      
      return updatedSignals;
    });
  }, [setLastActiveSignal]);

  const updateSignalStatuses = useCallback(async (currentPrices?: {[symbol: string]: number}) => {
    try {
      // First update statuses based on current prices
      const updatedSignals = await updateAllSignalsStatus(currentPrices);
      setSignals(updatedSignals);
      
      // Then validate signals against historical data for completed ones
      const { validateSignalWithBybitData } = await import("@/lib/signalValidationService");
      const { useSupabaseSignals } = await import("@/hooks/useSupabaseSignals");
      const { updateSignalInSupabase, saveSignalToSupabase } = useSupabaseSignals();
      
      // Find signals that need validation:
      // - Completed signals without final result
      // - Signals with PARTIAL result (for re-evaluation)
      const signalsToValidate = updatedSignals.filter(signal => 
        (signal.status === "COMPLETED" && (!signal.result || signal.result === "PENDING")) ||
        signal.result === "PARTIAL"
      ).filter(signal => 
        // Skip signals that already have final results
        signal.result !== "WINNER" && 
        signal.result !== "LOSER" && 
        signal.result !== 1 && 
        signal.result !== 0
      );

      if (signalsToValidate.length > 0) {
        console.log(`🔍 Validating ${signalsToValidate.length} completed signals...`);
        
        // Validate each signal
        for (const signal of signalsToValidate) {
          try {
            console.log(`🔍 Validating signal ${signal.id} with result: ${signal.result}`);
            const validatedSignal = await validateSignalWithBybitData(signal);
            
            if (validatedSignal.result && validatedSignal.result !== "PENDING") {
              console.log(`📈 Signal ${validatedSignal.id} validation result: ${validatedSignal.result}`);
              
              // Update signal in the array
              const signalIndex = updatedSignals.findIndex(s => s.id === validatedSignal.id);
              if (signalIndex !== -1) {
                updatedSignals[signalIndex] = validatedSignal;
              }
              
              // Update in local storage (signal-storage key)
              saveSignalToHistory(validatedSignal);
              
              // Save to Supabase - try to save first, then update
              let supabaseSuccess = await saveSignalToSupabase(validatedSignal);
              if (!supabaseSuccess) {
                // If save failed (signal might already exist), try to update
                supabaseSuccess = await updateSignalInSupabase(validatedSignal);
              }
              
              if (supabaseSuccess) {
                console.log(`✅ Signal ${validatedSignal.id} saved to Supabase with result: ${validatedSignal.result}`);
              } else {
                console.warn(`⚠️ Failed to save signal ${validatedSignal.id} to Supabase`);
              }
            }
          } catch (error) {
            console.error(`❌ Error validating signal ${signal.id}:`, error);
          }
        }
      }
      
      // Update state with validated signals
      setSignals(updatedSignals);
      
      toast({
        title: "Signals updated",
        description: `Updated ${updatedSignals.length} signals with current status`,
      });
      return updatedSignals;
    } catch (err) {
      console.error("Error updating signal statuses:", err);
      toast({
        variant: "destructive",
        title: "Error updating signals",
        description: "Failed to update signal statuses",
      });
      return null;
    }
  }, [toast]);

  const reprocessHistory = useCallback(async (currentPrices?: {[symbol: string]: number}) => {
    try {
      const reprocessedSignals = await reprocessAllHistory(currentPrices);
      setSignals(reprocessedSignals);
      toast({
        title: "History reprocessed",
        description: `Reprocessed ${reprocessedSignals.length} signals in history`,
      });
      return reprocessedSignals;
    } catch (err) {
      console.error("Error reprocessing signal history:", err);
      toast({
        variant: "destructive",
        title: "Error reprocessing history",
        description: "Failed to reprocess signal history",
      });
      return null;
    }
  }, [toast]);

  // Generate mock signals for demo purposes
  const generateMockSignals = (count: number): TradingSignal[] => {
    const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "ADAUSDT", "BNBUSDT"];
    const now = new Date();
    
    return Array.from({ length: count }, (_, i) => {
      const entryPrice = Math.random() * 1000 + 100;
      const direction = Math.random() > 0.5 ? "BUY" : "SELL";
      const isWinner = Math.random() > 0.4;
      const createdDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      
      return {
        id: `demo-${i}-${Date.now()}`,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        direction,
        entryPrice,
        status: Math.random() > 0.3 ? "COMPLETED" : "ACTIVE",
        result: isWinner ? "WINNER" as SignalResult : "LOSER" as SignalResult,
        profit: isWinner ? Math.random() * 5 + 1 : -(Math.random() * 2 + 0.5),
        createdAt: createdDate.toISOString(),
        stopLoss: direction === "BUY" 
          ? entryPrice * (1 - Math.random() * 0.05) 
          : entryPrice * (1 + Math.random() * 0.05),
        strategy: 'DEMO',
        targets: [
          { level: 1, price: direction === "BUY" ? entryPrice * 1.03 : entryPrice * 0.97, hit: isWinner },
          { level: 2, price: direction === "BUY" ? entryPrice * 1.05 : entryPrice * 0.95, hit: isWinner && Math.random() > 0.5 },
          { level: 3, price: direction === "BUY" ? entryPrice * 1.08 : entryPrice * 0.92, hit: isWinner && Math.random() > 0.7 }
        ]
      } as TradingSignal;
    });
  };

  return { 
    signals, 
    loading, 
    error, 
    fetchSignals, 
    addSignals,
    updateSignalStatuses,
    reprocessHistory,
    getLastActiveSignal,
    setLastActiveSignal
  };
};
