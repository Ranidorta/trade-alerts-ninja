
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
      setSignals(data);
    } catch (err: any) {
      console.error("Error fetching trading signals:", err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return { signals, loading, error, fetchSignals };
};
