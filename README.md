# PromQL Playground

An interactive learning environment for Prometheus Query Language (PromQL). Write queries, visualize results, and learn PromQL concepts through hands-on examples.

![PromQL Playground](https://img.shields.io/badge/PromQL-Playground-blue)

## Features

- **Interactive Query Editor** - Monaco-based editor with syntax highlighting and autocomplete
- **Real Prometheus Data** - Connects to demo.promlabs.com for real metrics
- **Visualizations** - Time series graphs with zoom, pan, and series filtering
- **Learning Scenarios** - Guided tutorials covering PromQL concepts
- **Query Explanation** - Step-by-step breakdown of query execution
- **Function Reference** - Documentation for all PromQL functions

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/promql-playground.git
cd promql-playground

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Learning Scenarios

The playground includes guided scenarios to learn PromQL:

1. **Getting Started** - Basic queries, metrics, and labels
2. **Error Rate Tracking** - Monitor 4xx/5xx errors, calculate SLIs
3. **HTTP Request Analysis** - Request rates, throughput, grouping
4. **Latency Analysis** - Histograms, percentiles, p50/p95/p99
5. **Resource Usage** - CPU, memory, disk monitoring
6. **Aggregation Deep Dive** - sum, avg, max, min, count
7. **Top/Bottom Analysis** - topk, bottomk for rankings
8. **Time Comparisons** - Using offset for historical comparisons
9. **Rate Windows** - Understanding rate() window sizes

## Deployment

### Vercel (Recommended)

The project includes a Vercel serverless function to handle CORS:

```bash
npm i -g vercel
vercel
```

### Netlify

Create a Netlify function for the proxy:

```bash
# netlify/functions/prometheus.ts
# Similar to api/prometheus/[...path].ts
```

### Self-Hosted

If deploying to your own server:

1. **Option A: Nginx Proxy**
   ```nginx
   location /api/prometheus/ {
       proxy_pass https://demo.promlabs.com/;
       proxy_set_header Host demo.promlabs.com;
   }
   ```

2. **Option B: Custom Prometheus**
   Update `src/services/prometheusClient.ts` to point to your Prometheus server:
   ```typescript
   const PROMETHEUS_ENDPOINTS = {
     development: '/prometheus',
     production: 'https://your-prometheus.com',
   };
   ```

   Enable CORS on your Prometheus server:
   ```yaml
   # prometheus.yml
   web:
     cors:
       allowed-origins:
         - "https://your-domain.com"
   ```

## Project Structure

```
promql-playground/
├── api/                    # Vercel serverless functions
│   └── prometheus/         # Prometheus proxy for CORS
├── src/
│   ├── components/         # React components
│   │   ├── QueryInput.tsx          # Monaco editor
│   │   ├── TimeRangePicker.tsx     # Time range selector
│   │   ├── ScenarioManager.tsx     # Learning scenarios
│   │   ├── QueryExplanation.tsx    # Query breakdown
│   │   └── visualizations/         # Charts and tables
│   ├── hooks/              # React Query hooks
│   ├── providers/          # Context providers
│   ├── scenarios/          # Learning scenario definitions
│   ├── services/           # API clients
│   │   └── prometheusClient.ts     # Prometheus API
│   ├── styles/             # CSS styles
│   └── types/              # TypeScript types
├── vite.config.ts          # Vite configuration with dev proxy
└── vercel.json             # Vercel deployment config
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Monaco Editor** - Code editor
- **uPlot** - High-performance charts
- **React Query** - Data fetching and caching
- **Lucide React** - Icons
- **date-fns** - Date utilities

## Available Metrics

The demo server (demo.promlabs.com) provides these metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `demo_api_request_duration_seconds` | Histogram | HTTP request latency |
| `demo_api_http_requests_in_progress` | Gauge | Current in-flight requests |
| `demo_cpu_usage_seconds_total` | Counter | CPU time consumed |
| `demo_memory_usage_bytes` | Gauge | Memory usage |
| `demo_disk_usage_bytes` | Gauge | Disk space used |
| `demo_disk_total_bytes` | Gauge | Total disk space |
| `demo_items_shipped_total` | Counter | Business metric example |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Prometheus](https://prometheus.io/) - Monitoring system
- [PromLabs](https://promlabs.com/) - Demo Prometheus server
- [monaco-promql](https://github.com/prometheus-community/monaco-promql) - PromQL language support
