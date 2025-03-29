
import { useState, useEffect, useCallback } from "react";
import { StrategyTypePerformance } from "@/lib/types";
import { getStrategiesPerformance, recalculateAllStrategiesStatistics } from "@/lib/firebaseFunctions";
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
      const strategiesData = await getStrategiesPerformance();
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
      const success = await recalculateAllStrategiesStatistics();
      
      if (success) {
        // Refresh the strategies data
        const strategiesData = await getStrategiesPerformance();
        setStrategies(strategiesData);
        
        toast({
          title: "Statistics recalculated",
          description: "Successfully recalculated all strategy statistics",
        });
      } else {
        throw new Error("Failed to recalculate statistics");
      }
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
  }, [toast]);

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
