import { QueryProvider } from './providers/QueryProvider';
import { PlaygroundProvider } from './context/PlaygroundContext';
import App from './App';
import type { PromQLPlaygroundProps } from './types/sdk';

/**
 * PromQL Playground - A complete, interactive learning environment for PromQL
 * 
 * @example
 * ```tsx
 * import { PromQLPlayground } from '@promql-playground/react';
 * 
 * function App() {
 *   return (
 *     <PromQLPlayground
 *       promUrl="/api/prometheus"
 *       defaultMetricName="my_api_request_duration_seconds"
 *       defaultIdentifier="app"
 *       defaultIdentifierValue="my-service"
 *     />
 *   );
 * }
 * ```
 */
export function PromQLPlayground(props: PromQLPlaygroundProps) {
  return (
    <QueryProvider>
      <PlaygroundProvider {...props}>
        <App />
      </PlaygroundProvider>
    </QueryProvider>
  );
}
