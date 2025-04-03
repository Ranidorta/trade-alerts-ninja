
import { useQuery } from '@tanstack/react-query';
import { fetchPerformanceMetrics } from '@/lib/signalsApi';

export function usePerformanceMetrics(days: number = 30) {
  return useQuery({
    queryKey: ['performance', days.toString()],
    queryFn: fetchPerformanceMetrics,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
