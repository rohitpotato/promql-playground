# PromQL Playground

An interactive learning environment for Prometheus Query Language (PromQL). Write queries, visualize results, and learn PromQL concepts through hands-on examples.

![PromQL Playground](https://img.shields.io/badge/PromQL-Playground-blue)
[![npm version](https://img.shields.io/npm/v/@promql-playground/react.svg)](https://www.npmjs.com/package/@promql-playground/react)

## Features

- 📊 **Interactive Query Editor** - Monaco-based editor with syntax highlighting and autocomplete
- 📈 **Real Prometheus Data** - Connect to any Prometheus server
- 🎯 **Visualizations** - Time series graphs with zoom, pan, and series filtering
- 📚 **Learning Scenarios** - Guided tutorials covering PromQL concepts
- 🔍 **Query Explanation** - Step-by-step breakdown of query execution
- 📖 **Function Reference** - Documentation for all PromQL functions
- 🎨 **Customizable** - Support for custom metrics, labels, and examples

## Packages

This monorepo contains:

| Package | Description |
|---------|-------------|
| [`@promql-playground/react`](./packages/react) | React SDK - plug-and-play PromQL playground component |
| [`examples/nextjs-example`](./examples/nextjs-example) | Next.js example app |

## Quick Start

### Using the SDK in your React app

```bash
npm install @promql-playground/react
```

```tsx
'use client';

import dynamic from 'next/dynamic';
import '@promql-playground/react/styles.css';

// For Next.js, use dynamic import with ssr: false
const PromQLPlayground = dynamic(
  () => import('@promql-playground/react').then((mod) => mod.PromQLPlayground),
  { ssr: false }
);

export default function App() {
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

### Running the example locally

```bash
# Clone the repository
git clone https://github.com/rohitpotato/promql-playground.git
cd promql-playground

# Install dependencies
pnpm install

# Build the SDK
pnpm build

# Run the Next.js example
cd examples/nextjs-example
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## SDK Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `promUrl` | `string` | Yes | Prometheus API URL (use a proxy to avoid CORS) |
| `defaultMetricName` | `string` | No | Default metric name for built-in examples |
| `defaultIdentifier` | `string` | No | Default label key (e.g., "job", "app") |
| `defaultIdentifierValue` | `string` | No | Default label value |
| `labelMappings` | `LabelMappings` | No | Map standard labels to your system's labels |
| `examples` | `Example[]` | No | Custom examples to add |
| `hideBuiltInExamples` | `boolean` | No | Hide built-in examples |

### Label Mappings

Different systems use different label names. Use `labelMappings` to adapt built-in examples:

```tsx
<PromQLPlayground
  promUrl="/api/prometheus"
  defaultMetricName="http_server_request_duration_seconds"
  labelMappings={{
    status: 'http_status_code',      // OpenTelemetry style
    method: 'http_method',
    path: 'http_route',
    instance: 'service_instance_id',
  }}
/>
```

## Learning Scenarios

The playground includes guided scenarios to learn PromQL:

1. **Getting Started** - Basic queries, metrics, and labels
2. **Error Rate Tracking** - Monitor 4xx/5xx errors, calculate SLIs
3. **HTTP Request Analysis** - Request rates, throughput, grouping
4. **Latency Analysis** - Histograms, percentiles, p50/p95/p99
5. **Aggregation Deep Dive** - sum, avg, max, min, count
6. **Top/Bottom Analysis** - topk, bottomk for rankings
7. **Time Comparisons** - Using offset for historical comparisons
8. **Rate Windows** - Understanding rate() window sizes

## Setting up a Proxy

To avoid CORS issues, create an API route that proxies requests to Prometheus:

### Next.js App Router

```ts
// app/api/prometheus/route.ts
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

## Project Structure

```
promql-playground/
├── .changeset/              # Changesets for versioning
├── .github/                 # GitHub Actions workflows
├── examples/
│   └── nextjs-example/      # Next.js example app
├── packages/
│   └── react/               # @promql-playground/react SDK
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── hooks/       # React Query hooks
│       │   ├── scenarios/   # Learning scenario definitions
│       │   └── services/    # Prometheus API client
│       └── dist/            # Built output
├── package.json             # Root monorepo config
└── pnpm-workspace.yaml      # pnpm workspace config
```

## Development

```bash
# Install dependencies
pnpm install

# Run the Next.js example (with hot reload)
pnpm dev

# Build everything (SDK + Next.js app)
pnpm build

# Build only the SDK
pnpm build:sdk

# Build only the Next.js app
pnpm build:app

# Start production server
pnpm start
```

## Releasing

```bash
# Create a changeset for versioning
pnpm changeset

# Version packages
pnpm version

# Publish SDK to npm
pnpm release
```

## Deployment

The project is configured for Vercel deployment. The `vercel.json` at the root handles:
1. Building the SDK first (`pnpm build:sdk`)
2. Building the Next.js app (`pnpm build:app`)
3. Deploying from `examples/nextjs-example/.next`

Just connect the repo to Vercel and it will auto-deploy on push to `main`.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **tsup** - SDK bundling
- **Monaco Editor** - Code editor with PromQL support
- **uPlot** - High-performance charts
- **React Query** - Data fetching and caching
- **pnpm** - Package manager
- **Changesets** - Version management

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Prometheus](https://prometheus.io/) - Monitoring system
- [PromLabs](https://promlabs.com/) - Demo Prometheus server
- [monaco-promql](https://github.com/prometheus-community/monaco-promql) - PromQL language support
