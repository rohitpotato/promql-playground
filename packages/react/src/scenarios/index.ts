import type { Scenario } from '../types/promql';

// Template tokens for replacement
const M = '{{METRIC}}'; // Metric name
const I = '{{IDENTIFIER}}'; // Identifier label (job, app, etc.)
const V = '{{IDENTIFIER_VALUE}}'; // Identifier value

// Label tokens - can be remapped via labelMappings prop
const STATUS = '{{LABEL_STATUS}}';
const METHOD = '{{LABEL_METHOD}}';
const PATH = '{{LABEL_PATH}}';
const INSTANCE = '{{LABEL_INSTANCE}}';
const LE = '{{LABEL_LE}}';

// Built-in scenarios with template tokens
export const builtInScenarios: Scenario[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of PromQL by exploring real metrics.',
    learningObjectives: [
      'Understand what metrics and labels are',
      'Write your first PromQL query',
      'Filter metrics using label selectors',
      'View raw metric data vs computed rates',
    ],
    sampleQueries: [
      {
        query: 'up',
        description: 'Target health status',
        explanation: 'The "up" metric is a special metric that shows whether Prometheus can scrape a target. 1 means up, 0 means down.',
      },
      {
        query: `${M}_count{${I}="${V}"}`,
        description: 'Request count with filter',
        explanation: 'Label selectors in curly braces filter which time series are returned. Here we only get metrics from the specified job.',
      },
      {
        query: `rate(${M}_count[5m])`,
        description: 'Request rate (req/s)',
        explanation: 'The rate() function calculates per-second average rate of increase over a time window. [5m] means "look at the last 5 minutes".',
      },
      {
        query: `rate(${M}_count{${I}="${V}"}[5m])`,
        description: 'Filtered request rate',
        explanation: 'Combine label filters with rate() to see the per-second request rate for a specific job.',
      },
    ],
  },
  {
    id: 'error-tracking',
    title: 'Error Rate Tracking',
    description: 'Learn to monitor and analyze error rates, a critical skill for maintaining service reliability.',
    learningObjectives: [
      'Calculate error rates from request metrics',
      'Filter by HTTP status codes using regex',
      'Build error ratio queries for SLIs',
      'Group errors by different dimensions',
    ],
    sampleQueries: [
      {
        query: `rate(${M}_count{${STATUS}=~"5.."}[5m])`,
        description: 'Server errors (5xx) per second',
        explanation: 'Filters for HTTP 5xx status codes using regex (=~). The "5.." pattern matches 500, 501, 502, etc.',
      },
      {
        query: `sum(rate(${M}_count{${STATUS}=~"5.."}[5m]))`,
        description: 'Total 5xx errors/sec',
        explanation: 'Sums all 5xx errors across all endpoints and instances.',
      },
      {
        query: `sum by (${STATUS}) (rate(${M}_count{${STATUS}=~"[45].."}[5m]))`,
        description: 'Error rate by status code',
        explanation: 'Groups both 4xx and 5xx errors by exact status code.',
      },
      {
        query: `sum(rate(${M}_count{${STATUS}=~"5.."}[5m])) / sum(rate(${M}_count[5m])) * 100`,
        description: 'Error percentage (SLI)',
        explanation: 'Calculates errors as a percentage of total requests. This is a standard Service Level Indicator.',
      },
      {
        query: `sum by (${PATH}) (rate(${M}_count{${STATUS}=~"5.."}[5m]))`,
        description: 'Errors by endpoint/path',
        explanation: 'Groups errors by the path label to identify which endpoints are failing.',
      },
    ],
  },
  {
    id: 'http-metrics',
    title: 'HTTP Request Analysis',
    description: 'Analyze HTTP request patterns using API metrics.',
    learningObjectives: [
      'Understand gauge vs counter metrics',
      'Calculate rates from counter metrics',
      'Group results by different dimensions',
      'Use aggregation functions',
    ],
    sampleQueries: [
      {
        query: `rate(${M}_count[5m])`,
        description: 'Request rate (req/s)',
        explanation: 'The _count metric from a histogram tracks total observations. Rate of this gives you requests per second.',
      },
      {
        query: `sum(rate(${M}_count[5m]))`,
        description: 'Total request throughput',
        explanation: 'Sums all request rates to give total throughput across all instances and endpoints.',
      },
      {
        query: `sum by (${METHOD}) (rate(${M}_count[5m]))`,
        description: 'Request rate by HTTP method',
        explanation: 'Groups by method (GET, POST, PUT, DELETE) to see traffic breakdown by operation type.',
      },
      {
        query: `topk(5, sum by (${INSTANCE}) (rate(${M}_count[5m])))`,
        description: 'Top 5 instances by traffic',
        explanation: 'topk() returns only the k highest values. Shows which instances are handling the most requests.',
      },
    ],
  },
  {
    id: 'latency',
    title: 'Latency Analysis',
    description: 'Master histogram metrics to understand request latency distributions and percentiles.',
    learningObjectives: [
      'Understand histogram bucket metrics',
      'Calculate percentile latencies with histogram_quantile',
      'Compare latency across dimensions',
      'Analyze latency distributions',
    ],
    sampleQueries: [
      {
        query: `histogram_quantile(0.95, rate(${M}_bucket[5m]))`,
        description: '95th percentile latency',
        explanation: 'histogram_quantile calculates percentiles from histogram buckets. 0.95 means 95th percentile.',
      },
      {
        query: `histogram_quantile(0.50, rate(${M}_bucket[5m]))`,
        description: 'Median latency (p50)',
        explanation: 'The 50th percentile is the median - half of requests are faster, half are slower.',
      },
      {
        query: `histogram_quantile(0.99, rate(${M}_bucket[5m]))`,
        description: '99th percentile latency',
        explanation: 'p99 shows the "worst case" for most users.',
      },
      {
        query: `histogram_quantile(0.95, sum by (${LE}) (rate(${M}_bucket[5m])))`,
        description: 'Overall p95 latency',
        explanation: 'By summing all buckets while keeping the "le" label, you get the overall system latency.',
      },
      {
        query: `histogram_quantile(0.95, sum by (${PATH}, ${LE}) (rate(${M}_bucket[5m])))`,
        description: 'p95 latency by endpoint',
        explanation: 'Groups by path to compare latency across different endpoints.',
      },
      {
        query: `rate(${M}_sum[5m]) / rate(${M}_count[5m])`,
        description: 'Average request duration',
        explanation: 'Dividing the sum of durations by the count gives you the average.',
      },
    ],
  },
  {
    id: 'aggregations',
    title: 'Aggregation Deep Dive',
    description: 'Master PromQL aggregation operators and understand when to use each one.',
    learningObjectives: [
      'Use sum, avg, max, min, count effectively',
      'Understand "by" vs "without" grouping',
      'Combine aggregations with rate functions',
      'Build meaningful aggregated metrics',
    ],
    sampleQueries: [
      {
        query: `sum(rate(${M}_count[5m]))`,
        description: 'Total request rate',
        explanation: 'sum() adds up all values. This gives total throughput across all instances.',
      },
      {
        query: `sum by (${INSTANCE}) (rate(${M}_count[5m]))`,
        description: 'Request rate per instance',
        explanation: '"by (instance)" keeps only the instance label in results.',
      },
      {
        query: `avg(rate(${M}_count[5m]))`,
        description: 'Average request rate',
        explanation: 'avg() calculates the mean across all series.',
      },
      {
        query: `max(rate(${M}_count[5m]))`,
        description: 'Peak request rate',
        explanation: 'max() returns the highest value.',
      },
      {
        query: `count(rate(${M}_count[5m]))`,
        description: 'Count of time series',
        explanation: 'count() returns the number of time series, not the sum of values.',
      },
    ],
  },
  {
    id: 'topk-analysis',
    title: 'Top/Bottom Analysis',
    description: 'Use topk and bottomk to focus on the most important time series.',
    learningObjectives: [
      'Find highest and lowest values',
      'Combine with aggregations for rankings',
      'Identify outliers',
      'Build "top offenders" queries',
    ],
    sampleQueries: [
      {
        query: `topk(3, rate(${M}_count[5m]))`,
        description: 'Top 3 by request rate',
        explanation: 'topk(3, ...) returns only the 3 highest values.',
      },
      {
        query: `bottomk(3, rate(${M}_count[5m]))`,
        description: 'Bottom 3 by request rate',
        explanation: 'bottomk() returns the lowest values.',
      },
      {
        query: `topk(5, sum by (${PATH}) (rate(${M}_count[5m])))`,
        description: 'Top 5 endpoints by traffic',
        explanation: 'Combines sum by path with topk to find busiest endpoints.',
      },
      {
        query: `topk(3, histogram_quantile(0.95, sum by (${INSTANCE}, ${LE}) (rate(${M}_bucket[5m]))))`,
        description: 'Top 3 slowest instances',
        explanation: 'Combines histogram_quantile with topk to find instances with highest p95 latency.',
      },
    ],
  },
  {
    id: 'time-comparisons',
    title: 'Time Comparisons',
    description: 'Compare metrics across time using the offset modifier to detect changes.',
    learningObjectives: [
      'Use offset to look at historical data',
      'Calculate period-over-period changes',
      'Detect traffic pattern changes',
      'Build comparison queries',
    ],
    sampleQueries: [
      {
        query: `rate(${M}_count[5m])`,
        description: 'Current request rate',
        explanation: 'Baseline query showing current request rate.',
      },
      {
        query: `rate(${M}_count[5m] offset 1h)`,
        description: 'Request rate 1 hour ago',
        explanation: 'The "offset 1h" modifier shifts the query window back in time.',
      },
      {
        query: `rate(${M}_count[5m]) / rate(${M}_count[5m] offset 1h)`,
        description: 'Request rate ratio vs 1h ago',
        explanation: 'The ratio shows relative change. A value of 1.5 means 50% more than an hour ago.',
      },
    ],
  },
  {
    id: 'rate-windows',
    title: 'Rate Windows Explained',
    description: 'Understand how different rate() window sizes affect your metrics.',
    learningObjectives: [
      'Understand rate window behavior',
      'Choose appropriate window sizes',
      'Balance sensitivity vs smoothing',
      'Know the 4x scrape interval rule',
    ],
    sampleQueries: [
      {
        query: `rate(${M}_count[1m])`,
        description: '1 minute window (sensitive)',
        explanation: 'Short windows (1m) are more sensitive to brief changes but also noisier.',
      },
      {
        query: `rate(${M}_count[5m])`,
        description: '5 minute window (balanced)',
        explanation: 'The 5-minute window is the most common choice.',
      },
      {
        query: `rate(${M}_count[15m])`,
        description: '15 minute window (smooth)',
        explanation: 'Longer windows produce smoother graphs. Use for trend analysis.',
      },
      {
        query: `irate(${M}_count[5m])`,
        description: 'Instant rate (last 2 points)',
        explanation: 'irate() calculates rate using only the last two data points.',
      },
      {
        query: `increase(${M}_count[1h])`,
        description: 'Total requests in 1 hour',
        explanation: 'increase() returns the total increase over the window. Useful when you want counts.',
      },
    ],
  },
];

export function getScenarioById(scenarios: Scenario[], id: string): Scenario | undefined {
  return scenarios.find(s => s.id === id);
}
