// Prometheus API Client
// Connects to the official Prometheus demo server

// In development, Vite proxy handles CORS (/prometheus -> https://demo.promlabs.com)
// In production, Vercel serverless function proxies requests

const isDev = import.meta.env.DEV;

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
  start: number; // Unix timestamp in seconds
  end: number;
  step?: number; // Step in seconds
}

// Build URL based on environment
function buildUrl(apiPath: string, params: URLSearchParams): string {
  if (isDev) {
    // Development: Use Vite proxy
    return `/prometheus${apiPath}?${params}`;
  } else {
    // Production: Use Vercel serverless function with path as query param
    params.set('path', apiPath);
    return `/api/prometheus?${params}`;
  }
}

class PrometheusClient {
  // Execute a range query (returns matrix data for graphing)
  async queryRange(query: string, timeRange: TimeRange): Promise<PrometheusQueryResult> {
    const params = new URLSearchParams({
      query,
      start: timeRange.start.toString(),
      end: timeRange.end.toString(),
      step: (timeRange.step || this.calculateStep(timeRange)).toString(),
    });

    const url = buildUrl('/api/v1/query_range', params);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return {
          status: 'error',
          error: isDev 
            ? `Network error: Check if the dev server is running.`
            : `Network error: Could not connect to the proxy server.`,
          errorType: 'cors_error',
        };
      }
      
      return {
        status: 'error',
        error: message,
        errorType: 'network',
      };
    }
  }

  // Execute an instant query (returns vector data)
  async query(query: string, time?: number): Promise<PrometheusQueryResult> {
    const params = new URLSearchParams({ query });
    if (time) {
      params.set('time', time.toString());
    }

    const url = buildUrl('/api/v1/query', params);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Network error',
        errorType: 'network',
      };
    }
  }

  // Get all metric names
  async getMetricNames(): Promise<string[]> {
    const params = new URLSearchParams();
    const url = buildUrl('/api/v1/label/__name__/values', params);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: PrometheusLabelsResult = await response.json();
      return data.status === 'success' ? (data.data || []) : [];
    } catch {
      return [];
    }
  }

  // Get all label names
  async getLabelNames(): Promise<string[]> {
    const params = new URLSearchParams();
    const url = buildUrl('/api/v1/labels', params);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: PrometheusLabelsResult = await response.json();
      return data.status === 'success' ? (data.data || []) : [];
    } catch {
      return [];
    }
  }

  // Get values for a specific label
  async getLabelValues(labelName: string): Promise<string[]> {
    const params = new URLSearchParams();
    const url = buildUrl(`/api/v1/label/${encodeURIComponent(labelName)}/values`, params);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: PrometheusLabelsResult = await response.json();
      return data.status === 'success' ? (data.data || []) : [];
    } catch {
      return [];
    }
  }

  // Get series matching a selector
  async getSeries(match: string, timeRange?: TimeRange): Promise<Record<string, string>[]> {
    const params = new URLSearchParams({ 'match[]': match });
    if (timeRange) {
      params.set('start', timeRange.start.toString());
      params.set('end', timeRange.end.toString());
    }

    const url = buildUrl('/api/v1/series', params);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: PrometheusSeriesResult = await response.json();
      return data.status === 'success' ? (data.data || []) : [];
    } catch {
      return [];
    }
  }

  // Get metadata for metrics
  async getMetricMetadata(metric?: string): Promise<Record<string, Array<{ type: string; help: string; unit: string }>>> {
    const params = new URLSearchParams();
    if (metric) {
      params.set('metric', metric);
    }

    const url = buildUrl('/api/v1/metadata', params);

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.status === 'success' ? (data.data || {}) : {};
    } catch {
      return {};
    }
  }

  // Calculate appropriate step based on time range
  calculateStep(timeRange: TimeRange): number {
    const duration = timeRange.end - timeRange.start;
    const step = Math.max(1, Math.floor(duration / 250));
    if (step < 15) return 15;
    if (step < 30) return 30;
    if (step < 60) return 60;
    if (step < 300) return 300;
    if (step < 900) return 900;
    if (step < 3600) return 3600;
    return Math.ceil(step / 3600) * 3600;
  }

  // Get default time range (last 1 hour)
  getDefaultTimeRange(): TimeRange {
    const now = Math.floor(Date.now() / 1000);
    return {
      start: now - 3600,
      end: now,
    };
  }

  // Get time range for common intervals
  getTimeRangeForInterval(interval: '15m' | '1h' | '3h' | '6h' | '12h' | '24h' | '7d'): TimeRange {
    const now = Math.floor(Date.now() / 1000);
    const intervals: Record<string, number> = {
      '15m': 15 * 60,
      '1h': 60 * 60,
      '3h': 3 * 60 * 60,
      '6h': 6 * 60 * 60,
      '12h': 12 * 60 * 60,
      '24h': 24 * 60 * 60,
      '7d': 7 * 24 * 60 * 60,
    };
    return {
      start: now - intervals[interval],
      end: now,
    };
  }
}

// Singleton instance
export const prometheusClient = new PrometheusClient();

// Export the class for custom configurations
export { PrometheusClient };
