/**
 * Mapping from standard label names to custom label names.
 * Used to adapt built-in examples to different observability systems.
 * 
 * @example
 * ```ts
 * // OpenTelemetry-style labels
 * const labelMappings: LabelMappings = {
 *   status: 'http_response_status_code',
 *   method: 'http_request_method',
 *   path: 'http_route',
 *   instance: 'service_instance_id',
 * };
 * ```
 */
export interface LabelMappings {
  /** HTTP status code label (default: "status") */
  status?: string;
  /** HTTP method label (default: "method") */
  method?: string;
  /** URL path/route label (default: "path") */
  path?: string;
  /** Instance/pod label (default: "instance") */
  instance?: string;
  /** Service/application label - use defaultIdentifier instead */
  // job is handled by defaultIdentifier
  /** Histogram bucket label (default: "le") - rarely needs changing */
  le?: string;
  /** Custom label mappings for any other labels */
  [key: string]: string | undefined;
}

/**
 * Props for the PromQLPlayground component
 */
export interface PromQLPlaygroundProps {
  /**
   * Prometheus API URL (should be proxied to avoid CORS)
   * @example "/api/prometheus"
   */
  promUrl: string;

  /**
   * Default metric name for built-in examples.
   * This replaces the placeholder metric in all built-in scenarios.
   * @example "my_api_request_duration_seconds"
   * @default "demo_api_request_duration_seconds"
   */
  defaultMetricName?: string;

  /**
   * Default identifier label key (e.g., job, app, service).
   * This is the label used to identify your service in queries.
   * @example "app" | "service" | "job"
   * @default "job"
   */
  defaultIdentifier?: string;

  /**
   * Default identifier label value.
   * @example "my-service"
   * @default "demo"
   */
  defaultIdentifierValue?: string;

  /**
   * Map standard label names to your system's label names.
   * Useful for systems using OpenTelemetry or custom naming conventions.
   * @example
   * ```ts
   * labelMappings={{
   *   status: 'http_response_status_code',
   *   method: 'http_request_method',
   *   path: 'http_route',
   * }}
   * ```
   */
  labelMappings?: LabelMappings;

  /**
   * Custom examples to add (merged with built-in examples)
   */
  examples?: Example[];

  /**
   * Hide built-in examples entirely (only show custom examples)
   * @default false
   */
  hideBuiltInExamples?: boolean;
}

export interface Example {
  topic: string;
  subtopics: {
    name: string;
    description?: string;
    query: string;
  }[];
}
