// Prometheus API Client
// Creates a client for the given Prometheus URL

export interface PrometheusQueryResult {
  status: 'success' | 'error';
  data?: {
    resultType: 'matrix' | 'vector' | 'scalar' | 'string';
    result: PrometheusMetricResult[];
  };
  error?: string;
  errorType?: string;
  warnings?: string[];
}

export interface PrometheusMetricResult {
  metric: Record<string, string>;
  values?: [number, string][]; // [timestamp, value] for matrix
  value?: [number, string]; // [timestamp, value] for vector
}

export interface PrometheusLabelsResult {
  status: 'success' | 'error';
  data?: string[];
  error?: string;
}

export interface PrometheusSeriesResult {
  status: 'success' | 'error';
  data?: Record<string, string>[];
  error?: string;
}

export interface TimeRange {
  start: number;
  end: number;
  step?: number;
}

/**
 * Create a Prometheus client for the given base URL
 * 
 * The baseUrl can be:
 * - Direct Prometheus URL: "https://prometheus.example.com" -> calls https://prometheus.example.com/api/v1/query
 * - Next.js API route: "/api/prometheus" -> calls /api/prometheus?path=/api/v1/query&...params
 */
export function createPrometheusClient(baseUrl: string) {
  const isProxyRoute = baseUrl.startsWith('/') || baseUrl.includes('/api/prometheus');
  
  const buildUrl = (apiPath: string, params: URLSearchParams): string => {
    const cleanBase = baseUrl.replace(/\/$/, '');
    
    if (isProxyRoute) {
      // For proxy routes, pass the Prometheus API path as a query parameter
      params.set('path', apiPath);
      return `${cleanBase}?${params}`;
    } else {
      // Direct Prometheus URL
      return `${cleanBase}${apiPath}?${params}`;
    }
  };

  const calculateStep = (timeRange: TimeRange): number => {
    const duration = timeRange.end - timeRange.start;
    const step = Math.max(1, Math.floor(duration / 250));
    if (step < 15) return 15;
    if (step < 30) return 30;
    if (step < 60) return 60;
    if (step < 300) return 300;
    if (step < 900) return 900;
    if (step < 3600) return 3600;
    return Math.ceil(step / 3600) * 3600;
  };

  return {
    async queryRange(query: string, timeRange: TimeRange): Promise<PrometheusQueryResult> {
      const params = new URLSearchParams({
        query,
        start: timeRange.start.toString(),
        end: timeRange.end.toString(),
        step: (timeRange.step || calculateStep(timeRange)).toString(),
      });

      const url = buildUrl('/api/v1/query_range', params);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Network error';
        return {
          status: 'error',
          error: message.includes('Failed to fetch') 
            ? `Network error: Could not connect to ${baseUrl}`
            : message,
          errorType: 'network',
        };
      }
    },

    async query(query: string, time?: number): Promise<PrometheusQueryResult> {
      const params = new URLSearchParams({ query });
      if (time) params.set('time', time.toString());

      const url = buildUrl('/api/v1/query', params);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        return {
          status: 'error',
          error: error instanceof Error ? error.message : 'Network error',
          errorType: 'network',
        };
      }
    },

    async getMetricNames(): Promise<string[]> {
      const url = buildUrl('/api/v1/label/__name__/values', new URLSearchParams());
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: PrometheusLabelsResult = await response.json();
        return data.status === 'success' ? (data.data || []) : [];
      } catch {
        return [];
      }
    },

    async getLabelNames(): Promise<string[]> {
      const url = buildUrl('/api/v1/labels', new URLSearchParams());
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: PrometheusLabelsResult = await response.json();
        return data.status === 'success' ? (data.data || []) : [];
      } catch {
        return [];
      }
    },

    async getLabelValues(labelName: string): Promise<string[]> {
      const url = buildUrl(`/api/v1/label/${encodeURIComponent(labelName)}/values`, new URLSearchParams());
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: PrometheusLabelsResult = await response.json();
        return data.status === 'success' ? (data.data || []) : [];
      } catch {
        return [];
      }
    },

    async getSeries(match: string, timeRange?: TimeRange): Promise<Record<string, string>[]> {
      const params = new URLSearchParams({ 'match[]': match });
      if (timeRange) {
        params.set('start', timeRange.start.toString());
        params.set('end', timeRange.end.toString());
      }
      const url = buildUrl('/api/v1/series', params);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: PrometheusSeriesResult = await response.json();
        return data.status === 'success' ? (data.data || []) : [];
      } catch {
        return [];
      }
    },

    calculateStep,
  };
}

export type PrometheusClient = ReturnType<typeof createPrometheusClient>;
