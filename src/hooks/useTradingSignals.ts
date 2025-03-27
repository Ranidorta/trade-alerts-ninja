
import { useState, useEffect, useCallback } from "react";
import { TradingSignal } from "@/lib/types";

// Use environment variable with fallback
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
                   "https://trade-alerts-backend.onrender.com";

export const useTradingSignals = () => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching signals from: ${BACKEND_URL}/signals`);
      const response = await fetch(`${BACKEND_URL}/signals`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch signals: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Signals data received:", data);
      
      // Ensure data is an array, fallback to empty array if not
      if (Array.isArray(data)) {
        setSignals(data);
      } else {
        console.warn("API returned non-array data:", data);
        setSignals([]);
      }
    } catch (err: any) {
      console.error("Error fetching trading signals:", err);
      setError(err.message || "Unknown error");
      // Always set signals to empty array on error to prevent mapping errors
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return { signals, loading, error, fetchSignals };
};
