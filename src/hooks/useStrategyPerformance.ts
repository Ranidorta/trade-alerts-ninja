
import { useState, useEffect, useCallback } from "react";
import { StrategyTypePerformance } from "@/lib/types";
// Firebase functions removed - using mock data for now
import { useToast } from "@/components/ui/use-toast";

export const useStrategyPerformance = () => {
  const [strategies, setStrategies] = useState<StrategyTypePerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchStrategyPerformance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock data for strategies performance
      const strategiesData: StrategyTypePerformance[] = [
        {
          strategy: "Moving Average Crossover",
          count: 45,
          totalTrades: 45,
          wins: 28,
          losses: 17,
          winRate: 62.2,
          avgProfit: 2.3
        },
        {
          strategy: "RSI Reversal",
          count: 38,
          totalTrades: 38,
          wins: 22,
          losses: 16,
          winRate: 57.9,
          avgProfit: 1.8
        },
        {
          strategy: "MACD Signal",
          count: 32,
          totalTrades: 32,
          wins: 19,
          losses: 13,
          winRate: 59.4,
          avgProfit: 2.1
        }
      ];
      
      setStrategies(strategiesData);
      
      toast({
        title: "Strategy statistics loaded",
        description: `Loaded performance data for ${strategiesData.length} strategies`,
      });
    } catch (err: any) {
      console.error("Error fetching strategy performance:", err);
      setError(err);
      
      toast({
        variant: "destructive",
        title: "Error loading strategy data",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const recalculateStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock recalculation - just refresh the data
      await fetchStrategyPerformance();
      
      toast({
        title: "Statistics recalculated",
        description: "Successfully recalculated all strategy statistics",
      });
    } catch (err: any) {
      console.error("Error recalculating statistics:", err);
      setError(err);
      
      toast({
        variant: "destructive",
        title: "Error recalculating statistics",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchStrategyPerformance]);

  // Fetch strategy performance on mount
  useEffect(() => {
    fetchStrategyPerformance();
  }, [fetchStrategyPerformance]);

  return {
    strategies,
    loading,
    error,
    fetchStrategyPerformance,
    recalculateStatistics
  };
};
