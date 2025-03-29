import { useState, useEffect, useCallback } from "react";
import { TradingSignal } from "@/lib/types";
import { config } from "@/config/env";
import { useToast } from "@/components/ui/use-toast";
import { 
  saveSignalsToHistory, 
  getSignalsHistory,
  updateAllSignalsStatus,
  reprocessAllHistory
} from "@/lib/signalHistoryService";

// Using a fallback URL for the backend
const BACKEND_URL = config.signalsApiUrl || "https://trade-alerts-backend.onrender.com"; 

// Set up localStorage key for cached signals
const SIGNALS_STORAGE_KEY = "archived_trading_signals";

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

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Trying to fetch signals from: ${BACKEND_URL}/signals?strategy=CLASSIC`);
      
      // First try to fetch from the API with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      let newSignals: TradingSignal[] = [];
      let fetchedFromRemote = false;
      
      try {
        const response = await fetch(`${BACKEND_URL}/signals?strategy=CLASSIC`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          // If remote API is available, use that data
          const data = await response.json();
          newSignals = data;
          fetchedFromRemote = true;
          console.log("Signals successfully loaded from API:", newSignals.length);
          
          // Show success toast
          toast({
            title: "Signals loaded",
            description: `Successfully loaded ${newSignals.length} signals from API`,
          });
        } else {
          throw new Error(`API returned status ${response.status}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.warn(`Could not fetch from API: ${fetchError.message}. Trying to use cached signals.`);
        
        // If remote API fails, check if we have signals in localStorage
        const cachedSignals = localStorage.getItem(SIGNALS_STORAGE_KEY);
        if (cachedSignals) {
          newSignals = JSON.parse(cachedSignals);
          console.log("Using cached signals:", newSignals.length);
          
          // Show fallback toast
          toast({
            title: "Using cached signals",
            description: "Could not connect to the API. Using locally stored signals instead.",
          });
        }
        
        // If we still have no signals, generate mock data for demo purposes
        if (newSignals.length === 0) {
          newSignals = generateMockSignals(20);
          console.log("Generated mock signals for demo:", newSignals.length);
          
          // Show mock data toast
          toast({
            title: "Using demo data",
            description: "Using generated demo data since no signals are available.",
          });
        }
      }
      
      // Process signals to add proper result information
      const processedSignals = newSignals.map((signal: TradingSignal) => {
        // If result is explicitly defined, use it
        // Otherwise determine from profit or status
        if (signal.result === undefined) {
          if (signal.profit !== undefined) {
            signal.result = signal.profit > 0 ? 1 : 0;
          } else if (signal.status === "COMPLETED") {
            // For completed signals without result info, assume based on status
            signal.result = Math.random() > 0.5 ? 1 : 0; // Random for demo (server should provide this)
          }
        }
        
        // Ensure targets are properly formatted with hit information
        if (signal.targets && Array.isArray(signal.targets)) {
          // Populate target hit information based on result
          signal.targets = signal.targets.map((target, index) => ({
            ...target,
            hit: signal.result === 1 && index === 0 ? true : 
                 signal.result === 1 && index > 0 ? Math.random() > 0.5 : false
          }));
        } else if (signal.entryPrice) {
          // Create dummy targets based on entry price if none exist
          signal.targets = [
            { level: 1, price: signal.entryPrice * 1.03, hit: signal.result === 1 },
            { level: 2, price: signal.entryPrice * 1.05, hit: signal.result === 1 && Math.random() > 0.6 },
            { level: 3, price: signal.entryPrice * 1.08, hit: signal.result === 1 && Math.random() > 0.8 }
          ];
        }
        
        // Ensure all the required fields exist
        return {
          ...signal,
          // Make sure we have a symbol
          symbol: signal.symbol || signal.pair || "UNKNOWN",
          // Ensure direction is set
          direction: signal.direction || (Math.random() > 0.5 ? "BUY" : "SELL"),
          // Ensure status is set
          status: signal.status || "WAITING",
          // Ensure entryPrice exists
          entryPrice: signal.entryPrice || signal.entryAvg || 0,
          // Ensure targets are complete
          targets: signal.targets || [],
          // Ensure we have a timestamp
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
      
      // If we succeeded in fetching from remote but there are no signals,
      // don't overwrite the localStorage cache
      if (fetchedFromRemote && processedSignals.length === 0) {
        toast({
          title: "No signals available",
          description: "The API returned no signals. This might indicate an issue with the API.",
        });
      }
    } catch (err: any) {
      console.error("Error fetching trading signals:", err);
      setError(err);
      
      toast({
        variant: "destructive",
        title: "Error loading signals",
        description: `${err.message}. Using cached data if available.`,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Function to add new signals (called from SignalsDashboard)
  const addSignals = useCallback((newSignals: TradingSignal[]) => {
    setSignals(currentSignals => {
      // Filter out duplicates based on ID
      const signalIds = new Set(currentSignals.map(s => s.id));
      const uniqueNewSignals = newSignals.filter(s => !signalIds.has(s.id));
      
      if (uniqueNewSignals.length === 0) return currentSignals;
      
      // Process new signals to ensure they have all required fields
      const processedNewSignals = uniqueNewSignals.map(signal => ({
        ...signal,
        // Ensure we have a timestamp
        createdAt: signal.createdAt || new Date().toISOString(),
        // Add default result if not provided
        result: signal.result !== undefined ? signal.result : undefined,
        // Ensure targets are properly formatted
        targets: signal.targets || (signal.entryPrice ? [
          { level: 1, price: signal.entryPrice * 1.03, hit: false },
          { level: 2, price: signal.entryPrice * 1.05, hit: false },
          { level: 3, price: signal.entryPrice * 1.08, hit: false }
        ] : [])
      }));
      
      // Combine existing and new signals
      const updatedSignals = [...processedNewSignals, ...currentSignals];
      
      // Save to localStorage and history
      localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(updatedSignals));
      saveSignalsToHistory(processedNewSignals);
      
      return updatedSignals;
    });
  }, []);

  // Update signal statuses based on current prices
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

  // Reprocess all signals in history
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
        id: `mock-${i}-${Date.now()}`,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        direction,
        entryPrice,
        status: Math.random() > 0.3 ? "COMPLETED" : "ACTIVE",
        result: isWinner ? 1 : 0,
        profit: isWinner ? Math.random() * 5 + 1 : -(Math.random() * 2 + 0.5),
        createdAt: createdDate.toISOString(),
        stopLoss: direction === "BUY" 
          ? entryPrice * (1 - Math.random() * 0.05) 
          : entryPrice * (1 + Math.random() * 0.05),
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
    reprocessHistory
  };
};
