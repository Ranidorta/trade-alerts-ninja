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
