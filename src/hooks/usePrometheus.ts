import { useQuery, useMutation } from '@tanstack/react-query';
import { prometheusClient, type TimeRange } from '../services/prometheusClient';

// Query keys for caching
export const prometheusKeys = {
  all: ['prometheus'] as const,
  metricNames: () => [...prometheusKeys.all, 'metricNames'] as const,
  labelNames: () => [...prometheusKeys.all, 'labelNames'] as const,
  labelValues: (labelName: string) => [...prometheusKeys.all, 'labelValues', labelName] as const,
  query: (query: string, time: number) => [...prometheusKeys.all, 'query', query, time] as const,
  queryRange: (query: string, start: number, end: number, step: number) => 
    [...prometheusKeys.all, 'queryRange', query, start, end, step] as const,
};

// Fetch all metric names
export function useMetricNames() {
  return useQuery({
    queryKey: prometheusKeys.metricNames(),
    queryFn: () => prometheusClient.getMetricNames(),
    // Metric names rarely change, cache for a long time
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Fetch all label names
export function useLabelNames() {
  return useQuery({
    queryKey: prometheusKeys.labelNames(),
    queryFn: () => prometheusClient.getLabelNames(),
    staleTime: 60 * 60 * 1000,
  });
}

// Fetch label values for a specific label
export function useLabelValues(labelName: string, enabled = true) {
  return useQuery({
    queryKey: prometheusKeys.labelValues(labelName),
    queryFn: () => prometheusClient.getLabelValues(labelName),
    enabled: enabled && !!labelName,
    staleTime: 60 * 60 * 1000,
  });
}

// Hook for running queries with caching
export function useQueryRange(
  query: string,
  timeRange: TimeRange,
  enabled = true
) {
  const step = prometheusClient.calculateStep(timeRange);
  
  return useQuery({
    queryKey: prometheusKeys.queryRange(query, timeRange.start, timeRange.end, step),
    queryFn: () => prometheusClient.queryRange(query, timeRange),
    enabled: enabled && !!query.trim(),
    // Query results can be cached for a short time since demo data is relatively static
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1, // Less retries for queries since they might genuinely fail
  });
}

// Mutation hook for executing queries on demand (for the Run button)
export function useExecuteQuery() {
  return useMutation({
    mutationFn: async ({ query, timeRange }: { query: string; timeRange: TimeRange }) => {
      return prometheusClient.queryRange(query, timeRange);
    },
  });
}

// Combined metadata hook - fetches both metrics and labels together
export function usePrometheusMetadata() {
  const metricsQuery = useMetricNames();
  const labelsQuery = useLabelNames();

  return {
    metrics: metricsQuery.data ?? [],
    labels: labelsQuery.data ?? [],
    isLoading: metricsQuery.isLoading || labelsQuery.isLoading,
    isError: metricsQuery.isError || labelsQuery.isError,
    error: metricsQuery.error || labelsQuery.error,
    refetch: async () => {
      await Promise.all([metricsQuery.refetch(), labelsQuery.refetch()]);
    },
  };
}

// Prefetch metadata on app load
export async function prefetchPrometheusMetadata() {
  const { queryClient } = await import('../providers/QueryProvider');
  
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: prometheusKeys.metricNames(),
      queryFn: () => prometheusClient.getMetricNames(),
    }),
    queryClient.prefetchQuery({
      queryKey: prometheusKeys.labelNames(),
      queryFn: () => prometheusClient.getLabelNames(),
    }),
  ]);
}

