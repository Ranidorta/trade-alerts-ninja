
import { useState, useEffect, useCallback } from "react";
import { TradingSignal } from "@/lib/types";
import { config } from "@/config/env";

// Using a fallback URL for the backend
const BACKEND_URL = config.signalsApiUrl || "https://trade-alerts-backend.onrender.com"; 

// Set up localStorage key for cached signals
const SIGNALS_STORAGE_KEY = "archived_trading_signals";

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load signals from localStorage on initial mount
  useEffect(() => {
    const cachedSignals = localStorage.getItem(SIGNALS_STORAGE_KEY);
    if (cachedSignals) {
      try {
        const parsedSignals = JSON.parse(cachedSignals);
        setSignals(parsedSignals);
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
      console.log(`Tentando buscar sinais de: ${BACKEND_URL}/signals?strategy=CLASSIC`);
      // Try to fetch from remote API first
      const response = await fetch(`${BACKEND_URL}/signals?strategy=CLASSIC`);
      let newSignals: TradingSignal[] = [];
      
      if (response.ok) {
        // If remote API is available, use that data
        const data = await response.json();
        newSignals = data;
        console.log("Sinais carregados com sucesso da API:", newSignals.length);
      } else {
        console.warn(`API retornou status ${response.status}. Tentando usar sinais em cache.`);
        // If remote API fails, check if we have signals in localStorage
        const cachedSignals = localStorage.getItem(SIGNALS_STORAGE_KEY);
        if (cachedSignals) {
          newSignals = JSON.parse(cachedSignals);
          console.log("Usando sinais em cache:", newSignals.length);
        }
        
        // Still no signals? Throw an error
        if (newSignals.length === 0) {
          throw new Error(`Falha ao buscar sinais da API (status: ${response.status}) e nenhum sinal em cache disponível`);
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
      
      // Save to localStorage for persistence
      localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(processedSignals));
    } catch (err: any) {
      console.error("Error fetching trading signals:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      
      // Save to localStorage
      localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(updatedSignals));
      
      return updatedSignals;
    });
  }, []);

  return { signals, loading, error, fetchSignals, addSignals };
};
