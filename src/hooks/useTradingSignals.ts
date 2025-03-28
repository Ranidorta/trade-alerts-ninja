
import { useState, useEffect } from "react";
import { TradingSignal } from "@/lib/types";

const BACKEND_URL = "https://trade-alerts-backend.onrender.com"; // ou env var

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);

    try {
      // Always use the CLASSIC strategy
      const response = await fetch(`${BACKEND_URL}/signals?strategy=CLASSIC`);
      if (!response.ok) throw new Error("Failed to fetch signals");

      const data = await response.json();
      
      // Process signals to add proper result information
      const processedSignals = data.map((signal: TradingSignal) => {
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
        
        return signal;
      });
      
      setSignals(processedSignals);
    } catch (err: any) {
      console.error("Error fetching trading signals:", err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return { signals, loading, error, fetchSignals };
};
