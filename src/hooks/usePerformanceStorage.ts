import { useState, useEffect } from 'react';
import { PerformanceData } from '@/lib/types';
import { 
  getPerformanceData, 
  processSignalsHistory, 
  getValidatedSignals,
  getPerformanceBySymbol,
  getPerformanceByDate 
} from '@/lib/performanceStorage';

export const usePerformanceStorage = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load performance data
  const loadPerformanceData = () => {
    try {
      setIsLoading(true);
      
      // Process any new signals from history
      const newValidated = processSignalsHistory();
      
      // Get current performance data
      const data = getPerformanceData();
      
      setPerformanceData(data);
      setLastUpdated(new Date());
      
      console.log(`📊 Loaded performance data: ${data.total} total signals, ${newValidated} newly validated`);
      
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data manually
  const refreshData = () => {
    loadPerformanceData();
  };

  // Get additional analytics
  const getAnalytics = () => {
    try {
      const validatedSignals = getValidatedSignals();
      const bySymbol = getPerformanceBySymbol();
      const byDate = getPerformanceByDate();
      
      return {
        validatedSignals,
        bySymbol,
        byDate
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {
        validatedSignals: [],
        bySymbol: [],
        byDate: []
      };
    }
  };

  // Load data on mount
  useEffect(() => {
    loadPerformanceData();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadPerformanceData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return {
    performanceData,
    isLoading,
    lastUpdated,
    refreshData,
    getAnalytics
  };
};