# @promql-playground/react

A plug-and-play React SDK for PromQL playground with query visualization, explanation, and interactive scenarios.

## Installation

```bash
npm install @promql-playground/react
# or
pnpm add @promql-playground/react
# or
yarn add @promql-playground/react
```

## Usage

### Basic Usage (React/Vite)

```tsx
import { PromQLPlayground } from '@promql-playground/react';
import '@promql-playground/react/styles.css';

function App() {
  return (
    <PromQLPlayground
      promUrl="/api/prometheus"
      defaultMetricName="my_api_request_duration_seconds"
      defaultIdentifier="app"
      defaultIdentifierValue="my-service"
    />
  );
}
```

### Next.js Usage (Important!)

Because this SDK uses Monaco Editor and uPlot which access browser APIs, you **must** use dynamic imports with SSR disabled in Next.js:

```tsx
'use client';

import dynamic from 'next/dynamic';
import '@promql-playground/react/styles.css';

const PromQLPlayground = dynamic(
  () => import('@promql-playground/react').then((mod) => mod.PromQLPlayground),
  { 
    ssr: false,
    loading: () => <div>Loading PromQL Playground...</div>,
  }
);

export default function Home() {
  return (
    <PromQLPlayground
      promUrl="/api/prometheus"
      defaultMetricName="my_api_request_duration_seconds"
      defaultIdentifier="app"
      defaultIdentifierValue="my-service"
    />
  );
}
```

### API Route (Proxy for CORS)

Create an API route to proxy Prometheus requests and avoid CORS issues:

```ts
// app/api/prometheus/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server';

const PROMETHEUS_URL = 'https://your-prometheus-server.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '/api/v1/query';

  const targetUrl = new URL(path, PROMETHEUS_URL);
  searchParams.forEach((value, key) => {
    if (key !== 'path') targetUrl.searchParams.append(key, value);
  });

  const response = await fetch(targetUrl.toString());
  const data = await response.json();
  return NextResponse.json(data);
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `promUrl` | `string` | Yes | Prometheus API URL (can be a proxy endpoint) |
| `defaultMetricName` | `string` | No | Default metric name for built-in examples (default: `demo_api_request_duration_seconds`) |
| `defaultIdentifier` | `string` | No | Default label key used in examples (default: `job`) |
| `defaultIdentifierValue` | `string` | No | Default label value used in examples (default: `demo`) |
| `examples` | `Example[]` | No | Custom examples to add alongside built-in ones |
| `hideBuiltInExamples` | `boolean` | No | Hide built-in examples entirely |
| `labelMappings` | `LabelMappings` | No | Map standard label names to your system's labels |

### Label Mappings

Different systems use different label names. Use `labelMappings` to map standard labels to your system:

```tsx
<PromQLPlayground
  promUrl="/api/prometheus"
  defaultMetricName="http_server_request_duration_seconds"
  labelMappings={{
    status: 'http_status_code',      // status=~"5.." → http_status_code=~"5.."
    method: 'http_method',           // method="GET" → http_method="GET"
    path: 'http_route',              // path="/api" → http_route="/api"
    instance: 'service_instance_id', // instance="..." → service_instance_id="..."
  }}
/>
```

### Custom Examples

```tsx
<PromQLPlayground
  promUrl="/api/prometheus"
  examples={[
    {
      topic: 'My Custom Queries',
      subtopics: [
        {
          name: 'API Latency',
          query: 'histogram_quantile(0.95, rate(my_custom_metric_bucket[5m]))',
          description: 'P95 latency for our API',
        },
      ],
    },
  ]}
/>
```

## Features

- 📊 **Interactive Graph Visualization** - Time series graphs with uPlot
- 📝 **Monaco Editor** - Full PromQL syntax highlighting and autocomplete
- 📚 **Built-in Scenarios** - Learn PromQL with guided examples
- 🔍 **Query Explanation** - Understand what each query does
- 📖 **Concepts & Functions Reference** - Built-in documentation
- 🎨 **Beautiful Dark Theme** - Modern, Grafana-inspired design

## License

MIT

