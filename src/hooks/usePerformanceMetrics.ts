
import { useQuery } from '@tanstack/react-query';
import { fetchPerformanceMetrics } from '@/lib/signalsApi';
import { PerformanceData } from '@/lib/types';

export function usePerformanceMetrics(days: number = 30, refetchInterval: number = 60000) {
  return useQuery<PerformanceData>({
    queryKey: ['performance', days.toString()],
    queryFn: () => fetchPerformanceMetrics({ queryKey: ['performance', days.toString()] }),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: refetchInterval, // Refetch every x milliseconds (default: 60s)
  });
}
