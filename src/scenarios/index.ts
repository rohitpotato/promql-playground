import type { Scenario } from '../types/promql';

// Scenarios using real metrics from demo.promlabs.com
// Key demo metrics available:
// - demo_api_request_duration_seconds_bucket/count/sum (histogram with status/method/path labels)
// - demo_api_http_requests_in_progress (gauge)
// - demo_cpu_usage_seconds_total (counter)
// - demo_disk_usage_bytes, demo_disk_total_bytes (gauge)
// - demo_memory_usage_bytes (gauge)
// - demo_num_cpus (gauge)
// - demo_batch_last_run_* (gauges)
// - demo_items_shipped_total (counter)

export const scenarios: Scenario[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of PromQL by exploring real metrics from the Prometheus demo server.',
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
        explanation: 'The "up" metric is a special metric that shows whether Prometheus can scrape a target. 1 means up, 0 means down. This is the simplest query to test your connection.',
      },
      {
        query: 'demo_api_http_requests_in_progress',
        description: 'Current in-progress requests',
        explanation: 'This gauge metric shows the number of HTTP requests currently being processed. Unlike counters, gauges can go up and down.',
      },
      {
        query: 'demo_api_http_requests_in_progress{job="demo"}',
        description: 'Filter by job label',
        explanation: 'Label selectors in curly braces filter which time series are returned. Here we only get metrics from the "demo" job.',
      },
      {
        query: 'demo_cpu_usage_seconds_total',
        description: 'CPU usage counter',
        explanation: 'This counter tracks total CPU seconds used. Counters only increase, so you need rate() to see meaningful per-second values.',
      },
      {
        query: 'rate(demo_cpu_usage_seconds_total[5m])',
        description: 'CPU usage rate',
        explanation: 'The rate() function calculates per-second average rate of increase over a time window. [5m] means "look at the last 5 minutes". This shows actual CPU cores being used.',
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
      'Detect error spikes and anomalies',
    ],
    sampleQueries: [
      {
        query: 'rate(demo_api_request_duration_seconds_count{status=~"5.."}[5m])',
        description: 'Server errors (5xx) per second',
        explanation: 'Filters for HTTP 5xx status codes using regex (=~). The "5.." pattern matches 500, 501, 502, etc. Shows your server error rate.',
      },
      {
        query: 'sum(rate(demo_api_request_duration_seconds_count{status=~"5.."}[5m]))',
        description: 'Total 5xx errors/sec',
        explanation: 'Sums all 5xx errors across all endpoints and instances. Gives you the overall server error rate.',
      },
      {
        query: 'rate(demo_api_request_duration_seconds_count{status=~"4.."}[5m])',
        description: 'Client errors (4xx) per second',
        explanation: '4xx errors indicate client issues: 400 (bad request), 401 (unauthorized), 404 (not found), etc. Often less critical than 5xx.',
      },
      {
        query: 'sum by (status) (rate(demo_api_request_duration_seconds_count{status=~"[45].."}[5m]))',
        description: 'Error rate by status code',
        explanation: 'Groups both 4xx and 5xx errors by exact status code. Shows which specific error types are occurring.',
      },
      {
        query: 'sum(rate(demo_api_request_duration_seconds_count{status=~"5.."}[5m])) / sum(rate(demo_api_request_duration_seconds_count[5m])) * 100',
        description: 'Error percentage (SLI)',
        explanation: 'Calculates errors as a percentage of total requests. This is a standard Service Level Indicator (SLI). 1% means 1 in 100 requests fail.',
      },
      {
        query: 'sum by (path) (rate(demo_api_request_duration_seconds_count{status=~"5.."}[5m]))',
        description: 'Errors by endpoint/path',
        explanation: 'Groups errors by the path label to identify which endpoints are failing. Essential for debugging.',
      },
      {
        query: 'sum by (instance) (rate(demo_api_request_duration_seconds_count{status=~"5.."}[5m]))',
        description: 'Errors by instance/server',
        explanation: 'Groups errors by instance to find problematic servers. If one instance has significantly more errors, it may need investigation.',
      },
      {
        query: 'topk(5, sum by (path) (rate(demo_api_request_duration_seconds_count{status=~"5.."}[5m])))',
        description: 'Top 5 error-prone endpoints',
        explanation: 'Combines sum by path with topk to show the 5 endpoints generating the most errors. Priority list for fixes.',
      },
    ],
  },
  {
    id: 'http-metrics',
    title: 'HTTP Request Analysis',
    description: 'Analyze HTTP request patterns using the demo API metrics.',
    learningObjectives: [
      'Understand gauge vs counter metrics',
      'Calculate rates from counter metrics',
      'Group results by different dimensions',
      'Use aggregation functions',
    ],
    sampleQueries: [
      {
        query: 'demo_api_http_requests_in_progress',
        description: 'Current in-flight requests',
        explanation: 'Shows how many HTTP requests are currently being processed. This gauge goes up when requests start and down when they complete.',
      },
      {
        query: 'sum by (instance) (demo_api_http_requests_in_progress)',
        description: 'In-flight requests by instance',
        explanation: 'Groups the in-progress request count by instance label. Shows load distribution across servers.',
      },
      {
        query: 'rate(demo_api_request_duration_seconds_count[5m])',
        description: 'Request rate (req/s)',
        explanation: 'The _count metric from a histogram tracks total observations. Rate of this gives you requests per second.',
      },
      {
        query: 'sum(rate(demo_api_request_duration_seconds_count[5m]))',
        description: 'Total request throughput',
        explanation: 'Sums all request rates to give total throughput across all instances and endpoints.',
      },
      {
        query: 'sum by (method) (rate(demo_api_request_duration_seconds_count[5m]))',
        description: 'Request rate by HTTP method',
        explanation: 'Groups by method (GET, POST, PUT, DELETE) to see traffic breakdown by operation type.',
      },
      {
        query: 'topk(5, sum by (instance) (rate(demo_api_request_duration_seconds_count[5m])))',
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
        query: 'histogram_quantile(0.95, rate(demo_api_request_duration_seconds_bucket[5m]))',
        description: '95th percentile latency',
        explanation: 'histogram_quantile calculates percentiles from histogram buckets. 0.95 means 95th percentile - 95% of requests complete faster than this value.',
      },
      {
        query: 'histogram_quantile(0.50, rate(demo_api_request_duration_seconds_bucket[5m]))',
        description: 'Median latency (p50)',
        explanation: 'The 50th percentile is the median - half of requests are faster, half are slower. Compare p50 to p95 to understand your latency distribution.',
      },
      {
        query: 'histogram_quantile(0.99, rate(demo_api_request_duration_seconds_bucket[5m]))',
        description: '99th percentile latency',
        explanation: 'p99 shows the "worst case" for most users. If p99 is much higher than p95, you have some very slow requests.',
      },
      {
        query: 'histogram_quantile(0.95, sum by (le) (rate(demo_api_request_duration_seconds_bucket[5m])))',
        description: 'Overall p95 latency',
        explanation: 'By summing all buckets while keeping the "le" label (required for histogram_quantile), you get the overall system latency.',
      },
      {
        query: 'histogram_quantile(0.95, sum by (path, le) (rate(demo_api_request_duration_seconds_bucket[5m])))',
        description: 'p95 latency by endpoint',
        explanation: 'Groups by path to compare latency across different endpoints. Identifies slow endpoints.',
      },
      {
        query: 'rate(demo_api_request_duration_seconds_sum[5m]) / rate(demo_api_request_duration_seconds_count[5m])',
        description: 'Average request duration',
        explanation: 'Dividing the sum of durations by the count gives you the average. Note: averages can hide latency spikes that percentiles reveal.',
      },
    ],
  },
  {
    id: 'resource-usage',
    title: 'Resource Usage',
    description: 'Monitor CPU, memory, and disk usage using demo metrics.',
    learningObjectives: [
      'Monitor resource consumption',
      'Calculate utilization percentages',
      'Track resource trends over time',
      'Compare usage across instances',
    ],
    sampleQueries: [
      {
        query: 'demo_memory_usage_bytes',
        description: 'Current memory usage',
        explanation: 'Shows the current memory usage in bytes. This is a gauge that reflects the current state.',
      },
      {
        query: 'demo_memory_usage_bytes / 1024 / 1024',
        description: 'Memory usage in MB',
        explanation: 'PromQL supports arithmetic operations. Dividing bytes by 1024 twice converts to megabytes.',
      },
      {
        query: 'demo_disk_usage_bytes / demo_disk_total_bytes * 100',
        description: 'Disk usage percentage',
        explanation: 'Calculate disk utilization as a percentage by dividing used by total and multiplying by 100.',
      },
      {
        query: 'rate(demo_cpu_usage_seconds_total[5m])',
        description: 'CPU cores in use',
        explanation: 'Rate of CPU seconds consumed. A value of 1.0 means using one full CPU core.',
      },
      {
        query: 'rate(demo_cpu_usage_seconds_total[5m]) / demo_num_cpus * 100',
        description: 'CPU utilization percentage',
        explanation: 'Dividing CPU usage by number of CPUs gives utilization. Multiply by 100 for percentage.',
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
        query: 'sum(demo_memory_usage_bytes)',
        description: 'Total memory usage',
        explanation: 'sum() adds up all values. This gives total memory usage across all instances.',
      },
      {
        query: 'sum by (instance) (demo_memory_usage_bytes)',
        description: 'Memory per instance',
        explanation: '"by (instance)" keeps only the instance label in results. Shows memory usage grouped by server.',
      },
      {
        query: 'avg(demo_memory_usage_bytes)',
        description: 'Average memory usage',
        explanation: 'avg() calculates the mean across all series. Shows typical memory usage per instance.',
      },
      {
        query: 'max(demo_memory_usage_bytes)',
        description: 'Peak memory usage',
        explanation: 'max() returns the highest value. Shows the instance using the most memory.',
      },
      {
        query: 'count(demo_api_http_requests_in_progress)',
        description: 'Count of time series',
        explanation: 'count() returns the number of time series, not the sum of values. Shows how many series match the selector.',
      },
      {
        query: 'sum without (instance) (demo_memory_usage_bytes)',
        description: 'Sum without instance',
        explanation: '"without (instance)" removes the instance label while keeping all others. The inverse of "by".',
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
        query: 'topk(3, demo_memory_usage_bytes)',
        description: 'Top 3 by memory',
        explanation: 'topk(3, ...) returns only the 3 highest values. Shows which instances use the most memory.',
      },
      {
        query: 'bottomk(3, demo_memory_usage_bytes)',
        description: 'Bottom 3 by memory',
        explanation: 'bottomk() returns the lowest values. Shows instances with least memory usage.',
      },
      {
        query: 'topk(5, rate(demo_cpu_usage_seconds_total[5m]))',
        description: 'Top 5 CPU consumers',
        explanation: 'Combines topk with rate to find highest CPU usage. Essential for finding resource hogs.',
      },
      {
        query: 'topk(3, histogram_quantile(0.95, sum by (instance, le) (rate(demo_api_request_duration_seconds_bucket[5m]))))',
        description: 'Top 3 slowest instances',
        explanation: 'Combines histogram_quantile with topk to find instances with highest p95 latency.',
      },
      {
        query: 'topk(5, sum by (job) (demo_memory_usage_bytes))',
        description: 'Top 5 jobs by memory',
        explanation: 'First aggregates by job, then takes top 5. Shows which jobs consume the most resources.',
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
        query: 'demo_memory_usage_bytes',
        description: 'Current memory usage',
        explanation: 'Baseline query showing current memory usage. We\'ll compare this to historical values.',
      },
      {
        query: 'demo_memory_usage_bytes offset 1h',
        description: 'Memory usage 1 hour ago',
        explanation: 'The "offset 1h" modifier shifts the query window back in time. Shows what memory was 1 hour ago.',
      },
      {
        query: 'demo_memory_usage_bytes - demo_memory_usage_bytes offset 1h',
        description: 'Memory change in 1 hour',
        explanation: 'Subtracting historical from current gives absolute change. Positive means memory increased.',
      },
      {
        query: 'rate(demo_cpu_usage_seconds_total[5m]) / rate(demo_cpu_usage_seconds_total[5m] offset 1h)',
        description: 'CPU usage ratio vs 1h ago',
        explanation: 'The ratio shows relative change. A value of 1.5 means 50% more CPU usage than an hour ago.',
      },
      {
        query: '(demo_disk_usage_bytes - demo_disk_usage_bytes offset 24h) / demo_disk_total_bytes * 100',
        description: 'Disk growth in 24h (%)',
        explanation: 'Shows how much disk usage has grown in the last 24 hours as a percentage of total capacity.',
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
        query: 'rate(demo_cpu_usage_seconds_total[1m])',
        description: '1 minute window (sensitive)',
        explanation: 'Short windows (1m) are more sensitive to brief changes but also noisier. Good for detecting sudden spikes.',
      },
      {
        query: 'rate(demo_cpu_usage_seconds_total[5m])',
        description: '5 minute window (balanced)',
        explanation: 'The 5-minute window is the most common choice - it smooths out fluctuations while still responding to real changes.',
      },
      {
        query: 'rate(demo_cpu_usage_seconds_total[15m])',
        description: '15 minute window (smooth)',
        explanation: 'Longer windows produce smoother graphs. Use for trend analysis and capacity planning.',
      },
      {
        query: 'irate(demo_cpu_usage_seconds_total[5m])',
        description: 'Instant rate (last 2 points)',
        explanation: 'irate() calculates rate using only the last two data points. More sensitive to instant changes but also more volatile.',
      },
      {
        query: 'increase(demo_items_shipped_total[1h])',
        description: 'Items shipped in 1 hour',
        explanation: 'increase() returns the total increase over the window. Equivalent to rate() * window_seconds. Useful when you want counts.',
      },
    ],
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find(s => s.id === id);
}
