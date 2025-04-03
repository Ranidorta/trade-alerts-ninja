
import { useQuery } from '@tanstack/react-query';
import { fetchPerformanceMetrics } from '@/lib/signalsApi';

export function usePerformanceMetrics(days: number = 30, refetchInterval: number = 60000) {
  return useQuery({
    queryKey: ['performance', days.toString()],
    queryFn: () => fetchPerformanceMetrics(days),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: refetchInterval, // Refetch every x milliseconds (default: 60s)
  });
}
