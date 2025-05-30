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
      console.log('Trying to fetch signals...');
      
      // First try to fetch from any available API
      let newSignals: TradingSignal[] = [];
      let fetchedFromRemote = false;
      
      try {
        // Try multiple backend URLs if configured
        const backendUrls = [
          config.signalsApiUrl,
          'https://trade-alerts-backend.onrender.com',
          'http://localhost:5000'
        ].filter(Boolean);

        for (const backendUrl of backendUrls) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
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
        
        // If no backend worked, check localStorage
        if (!fetchedFromRemote) {
          const cachedSignals = localStorage.getItem(SIGNALS_STORAGE_KEY);
          if (cachedSignals) {
            newSignals = JSON.parse(cachedSignals);
            console.log("Using cached signals:", newSignals.length);
            
            toast({
              title: "Using cached signals",
              description: "Backend unavailable. Using locally stored signals.",
            });
          }
        }
        
        // If we still have no signals, generate demo data
        if (newSignals.length === 0) {
          newSignals = generateMockSignals(15);
          console.log("Generated demo signals:", newSignals.length);
          
          toast({
            title: "Using demo data",
            description: "No backend available. Using generated demo signals.",
          });
        }
        
      } catch (fetchError) {
        console.warn(`Could not fetch from any API: ${fetchError.message}`);
        
        // Try to use cached signals
        const cachedSignals = localStorage.getItem(SIGNALS_STORAGE_KEY);
        if (cachedSignals) {
          newSignals = JSON.parse(cachedSignals);
          console.log("Using cached signals:", newSignals.length);
        } else {
          // Generate demo data as last resort
          newSignals = generateMockSignals(10);
          console.log("Generated fallback demo signals:", newSignals.length);
        }
        
        toast({
          title: "Backend unavailable",
          description: "Using cached or demo data. Backend connection will be retried automatically.",
        });
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
        description: "Failed to load signals from any source. Please check your connection.",
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
      const updatedSignals = await updateAllSignalsStatus(currentPrices);
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
