// Prometheus API Client
// Connects to the official Prometheus demo server

// In development, Vite proxy handles CORS (/prometheus -> https://demo.promlabs.com)
// In production, you have several options:
// 1. Deploy with a backend proxy (recommended)
// 2. Use Vercel/Netlify serverless functions
// 3. Self-host Prometheus with CORS headers enabled
// 4. Use a CORS proxy service (not recommended for production)

const isDev = import.meta.env.DEV;

// Configuration - modify these for your deployment
const PROMETHEUS_ENDPOINTS = {
  // Development: Use Vite proxy
  development: '/prometheus',
  // Production: Use Vercel serverless function proxy
  // If deploying elsewhere, update this to your proxy endpoint
  production: '/api/prometheus',
};

const PROMETHEUS_URL = isDev 
  ? PROMETHEUS_ENDPOINTS.development 
  : PROMETHEUS_ENDPOINTS.production;

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

class PrometheusClient {
  private baseUrl: string;

  constructor(baseUrl: string = PROMETHEUS_URL) {
    this.baseUrl = baseUrl;
  }

  // Change the Prometheus endpoint (useful for custom deployments)
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Execute a range query (returns matrix data for graphing)
  async queryRange(query: string, timeRange: TimeRange): Promise<PrometheusQueryResult> {
    const params = new URLSearchParams({
      query,
      start: timeRange.start.toString(),
      end: timeRange.end.toString(),
      step: (timeRange.step || this.calculateStep(timeRange)).toString(),
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/query_range?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      // Provide helpful error messages
      const message = error instanceof Error ? error.message : 'Network error';
      
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return {
          status: 'error',
          error: isDev 
            ? `Network error: Check if the dev server proxy is configured correctly.`
            : `CORS error: The Prometheus server doesn't allow cross-origin requests. You need to set up a proxy server. See the README for deployment options.`,
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

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/query?${params}`);
      
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
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/label/__name__/values`);
      
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
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/labels`);
      
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
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/label/${encodeURIComponent(labelName)}/values`);
      
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

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/series?${params}`);
      
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

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/metadata?${params}`);
      
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
    // Aim for ~250 data points
    const step = Math.max(1, Math.floor(duration / 250));
    // Round to nice intervals
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
