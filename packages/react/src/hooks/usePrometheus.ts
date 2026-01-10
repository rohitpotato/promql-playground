import { useQuery, useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createPrometheusClient, type TimeRange } from '../services/prometheusClient';
import { usePlayground } from './usePlayground';

// Query keys for caching
export const prometheusKeys = {
  all: ['prometheus'] as const,
  metricNames: (url: string) => [...prometheusKeys.all, url, 'metricNames'] as const,
  labelNames: (url: string) => [...prometheusKeys.all, url, 'labelNames'] as const,
  labelValues: (url: string, labelName: string) => [...prometheusKeys.all, url, 'labelValues', labelName] as const,
  queryRange: (url: string, query: string, start: number, end: number, step: number) => 
    [...prometheusKeys.all, url, 'queryRange', query, start, end, step] as const,
};

// Hook to get a Prometheus client
export function usePrometheusClient() {
  const { promUrl } = usePlayground();
  return useMemo(() => createPrometheusClient(promUrl), [promUrl]);
}

// Fetch all metric names
export function useMetricNames() {
  const { promUrl } = usePlayground();
  const client = usePrometheusClient();

  return useQuery({
    queryKey: prometheusKeys.metricNames(promUrl),
    queryFn: () => client.getMetricNames(),
    staleTime: 60 * 60 * 1000,
  });
}

// Fetch all label names
export function useLabelNames() {
  const { promUrl } = usePlayground();
  const client = usePrometheusClient();

  return useQuery({
    queryKey: prometheusKeys.labelNames(promUrl),
    queryFn: () => client.getLabelNames(),
    staleTime: 60 * 60 * 1000,
  });
}

// Fetch label values for a specific label
export function useLabelValues(labelName: string, enabled = true) {
  const { promUrl } = usePlayground();
  const client = usePrometheusClient();

  return useQuery({
    queryKey: prometheusKeys.labelValues(promUrl, labelName),
    queryFn: () => client.getLabelValues(labelName),
    enabled: enabled && !!labelName,
    staleTime: 60 * 60 * 1000,
  });
}

// Hook for running range queries with caching
export function useQueryRange(query: string, timeRange: TimeRange, enabled = true) {
  const { promUrl } = usePlayground();
  const client = usePrometheusClient();
  const step = client.calculateStep(timeRange);
  
  return useQuery({
    queryKey: prometheusKeys.queryRange(promUrl, query, timeRange.start, timeRange.end, step),
    queryFn: () => client.queryRange(query, timeRange),
    enabled: enabled && !!query.trim(),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });
}

// Mutation hook for executing queries on demand
export function useExecuteQuery() {
  const client = usePrometheusClient();

  return useMutation({
    mutationFn: async ({ query, timeRange }: { query: string; timeRange: TimeRange }) => {
      return client.queryRange(query, timeRange);
    },
  });
}

// Combined metadata hook
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
