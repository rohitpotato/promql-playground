export interface MetricSample {
  timestamp: number; // Unix timestamp in seconds
  value: number;
}

export interface MetricSeries {
  metric: Record<string, string>; // Labels
  values: MetricSample[];
}

export interface QueryResult {
  resultType: 'vector' | 'matrix' | 'scalar' | 'string';
  result: MetricSeries[] | MetricSample[] | number | string;
}

export interface QueryResponse {
  status: 'success' | 'error';
  data?: QueryResult;
  error?: string;
  errorType?: string;
}

export interface TimeRange {
  start: number; // Unix timestamp
  end: number; // Unix timestamp
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  learningObjectives: string[];
  sampleQueries: {
    query: string;
    description: string;
    explanation?: string;
  }[];
}

