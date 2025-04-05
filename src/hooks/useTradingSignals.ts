import { useState, useEffect, useCallback, useRef } from "react";
import { TradingSignal } from "@/lib/types";
import { config } from "@/config/env";
import { useToast } from "@/components/ui/use-toast";
import { 
  getSignalsHistory, 
  updateAllSignalsStatus,
  reprocessAllHistory
} from "@/lib/signalHistoryService";
import { logTradeSignal } from "@/lib/firebase";
import { saveSignalToHistory, saveSignalsToHistory } from "@/lib/signal-storage";
import { fetchSignals as fetchSignalsApi } from "@/lib/signalsApi";

// Using a fallback URL for the backend
const BACKEND_URL = config.signalsApiUrl || "https://trade-alerts-backend.onrender.com"; 

// Set up localStorage keys
const SIGNALS_STORAGE_KEY = "archived_trading_signals";
const LAST_ACTIVE_SIGNAL_KEY = "last_active_signal";
const SIGNALS_LAST_FETCH_TIME = "signals_last_fetch_time";

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const isFirstRender = useRef(true);
  const fetchTimeoutRef = useRef<number | null>(null);

  // Load signals from localStorage on initial mount with improved performance
  useEffect(() => {
    if (!isFirstRender.current) return;
    
    // Marcar como não sendo mais o primeiro render
    isFirstRender.current = false;
    
    const loadCachedSignals = () => {
      const cachedSignals = localStorage.getItem(SIGNALS_STORAGE_KEY);
      if (cachedSignals) {
        try {
          const parsedSignals = JSON.parse(cachedSignals);
          setSignals(parsedSignals);
          console.log("Loaded cached signals from localStorage:", parsedSignals.length);
          
          // Salvar no histórico em um timeout para não bloquear a UI
          setTimeout(() => {
            saveSignalsToHistory(parsedSignals);
          }, 1000);
          
          return true;
        } catch (err) {
          console.error("Error parsing cached signals:", err);
          // Invalid data in localStorage, clear it
          localStorage.removeItem(SIGNALS_STORAGE_KEY);
          return false;
        }
      }
      return false;
    };
    
    // Carregar sinais em cache primeiro para exibição imediata
    const hasCachedSignals = loadCachedSignals();
    
    // Verificar se precisamos buscar novos dados do servidor
    const lastFetchTime = localStorage.getItem(SIGNALS_LAST_FETCH_TIME);
    const now = Date.now();
    const shouldFetchNew = !lastFetchTime || (now - parseInt(lastFetchTime, 10)) > 5 * 60 * 1000; // 5 minutos
    
    if (shouldFetchNew) {
      // Usar um timeout para dar tempo à UI de renderizar primeiro
      fetchTimeoutRef.current = window.setTimeout(() => {
        fetchSignals({ forceRefresh: true });
        localStorage.setItem(SIGNALS_LAST_FETCH_TIME, now.toString());
      }, hasCachedSignals ? 2000 : 0); // Se temos dados em cache, atrase a busca para 2s
    }
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
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

  // Versão otimizada do fetchSignals com debounce e cache
  const fetchSignals = useCallback(async (options?: { forceRefresh?: boolean }) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log(`Trying to fetch signals from API...`);
      
      // Usar a função centralizada do signalsApi.ts
      const newSignals = await fetchSignalsApi({ 
        strategy: "CLASSIC", 
        forceRefresh: options?.forceRefresh 
      });
      
      if (newSignals && newSignals.length > 0) {
        // Update state with processed signals
        setSignals(newSignals);
        
        // Save to localStorage
        localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(newSignals));
        localStorage.setItem(SIGNALS_LAST_FETCH_TIME, Date.now().toString());
        
        // Salvar no histórico em um timeout para não bloquear a UI
        setTimeout(() => {
          saveSignalsToHistory(newSignals);
        }, 1000);
        
        console.log("Signals successfully updated:", newSignals.length);
      } else {
        // Se API retornou lista vazia, verificar se temos dados em cache
        const cachedSignals = localStorage.getItem(SIGNALS_STORAGE_KEY);
        
        if (cachedSignals) {
          console.log("API returned empty results, using cached signals");
          
          // Apenas mostrar toast se foi um refresh forçado
          if (options?.forceRefresh) {
            toast({
              title: "Usando dados em cache",
              description: "Não foram encontrados novos sinais no servidor.",
            });
          }
        } else {
          // Se não temos nada em cache, gerar dados fictícios
          const mockSignals = generateMockSignals(20);
          setSignals(mockSignals);
          localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(mockSignals));
          
          if (options?.forceRefresh) {
            toast({
              title: "Usando dados de demonstração",
              description: "Não foi possível obter sinais reais. Exibindo dados de exemplo.",
            });
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching trading signals:", err);
      setError(err);
      
      const cachedSignals = localStorage.getItem(SIGNALS_STORAGE_KEY);
      if (cachedSignals) {
        try {
          const parsedSignals = JSON.parse(cachedSignals);
          setSignals(parsedSignals);
          
          if (options?.forceRefresh) {
            toast({
              variant: "destructive",
              title: "Erro ao atualizar",
              description: `${err.message}. Usando dados em cache.`,
            });
          }
        } catch (parseErr) {
          console.error("Error parsing cached signals:", parseErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [loading, toast]);

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
      
      // Set the last active signal if this is the first signal being added
      if (processedNewSignals.length > 0 && currentSignals.length === 0) {
        setLastActiveSignal(processedNewSignals[0]);
      }
      
      // Combine existing and new signals
      const updatedSignals = [...processedNewSignals, ...currentSignals];
      
      // Save to localStorage and both history systems
      localStorage.setItem(SIGNALS_STORAGE_KEY, JSON.stringify(updatedSignals));
      saveSignalsToHistory(processedNewSignals);
      
      // Log new signals to Firebase for analytics and monitoring
      processedNewSignals.forEach(signal => {
        // Also save each individual signal to our new history system
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
    reprocessHistory,
    getLastActiveSignal,
    setLastActiveSignal
  };
};
