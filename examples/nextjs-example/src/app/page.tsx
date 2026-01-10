'use client';

import dynamic from 'next/dynamic';
import '@promql-playground/react/styles.css';

// Dynamic import with SSR disabled to avoid window/document access during server rendering
const PromQLPlayground = dynamic(
  () => import('@promql-playground/react').then((mod) => mod.PromQLPlayground),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111217',
        color: '#9ca3af',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        Loading PromQL Playground...
      </div>
    ),
  }
);

export default function Home() {
  return (
    <PromQLPlayground
      promUrl="/api/prometheus"
      defaultMetricName="demo_api_request_duration_seconds"
      defaultIdentifier="job"
      defaultIdentifierValue="demo"
    />
  );
}
