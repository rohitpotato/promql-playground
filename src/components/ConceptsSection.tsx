import { useState } from 'react';
import { TrendingUp, Gauge, BarChart3, ChevronRight, Activity, Database } from 'lucide-react';
import '../styles/grafana-theme.css';

interface Concept {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  details: {
    what: string;
    when: string;
    example: string;
    query: string;
    tips: string[];
  };
}

const concepts: Concept[] = [
  {
    id: 'counter',
    title: 'Counter',
    icon: <TrendingUp size={18} />,
    color: 'var(--grafana-green)',
    description: 'Cumulative metric that only increases or resets to zero',
    details: {
      what: 'Counters are cumulative metrics that represent a single monotonically increasing value. They can only go up (or reset to zero on restart). Common examples include total HTTP requests, errors, or bytes transferred.',
      when: 'Use counters for values that only increase: request counts, error totals, bytes sent. Always use rate() or increase() to make counter data meaningful - raw counter values just show "total since start".',
      example: 'http_requests_total counts every HTTP request since the server started. If you see a value of 1,234,567, that means ~1.2 million requests have been processed.',
      query: 'rate(http_requests_total[5m])',
      tips: [
        'Never alert on raw counter values - they always grow',
        'Always use rate() or increase() with counters',
        'The [5m] window should be at least 4x your scrape interval',
        'Counter resets (from restarts) are handled automatically by rate()'
      ]
    }
  },
  {
    id: 'gauge',
    title: 'Gauge',
    icon: <Gauge size={18} />,
    color: 'var(--grafana-blue)',
    description: 'Metric that can go up or down, like temperature or memory',
    details: {
      what: 'Gauges represent a single numerical value that can arbitrarily go up and down. They measure current state: memory usage, active connections, queue depth, temperature.',
      when: 'Use gauges for "current value" metrics that fluctuate. Unlike counters, you can query gauges directly without rate(). You can also use avg_over_time(), max_over_time(), etc.',
      example: 'process_resident_memory_bytes shows current memory usage. The value might be 524288000 (500MB) and can increase or decrease as the application runs.',
      query: 'process_resident_memory_bytes',
      tips: [
        'Gauges can be queried directly without rate()',
        'Use max_over_time() for peak values',
        'Use avg_over_time() for average over a period',
        'Good for current state: connections, queue size, memory'
      ]
    }
  },
  {
    id: 'histogram',
    title: 'Histogram',
    icon: <BarChart3 size={18} />,
    color: 'var(--grafana-orange)',
    description: 'Samples observations into configurable buckets for distributions',
    details: {
      what: 'Histograms track distributions by counting observations into predefined buckets. They create three metric types: _bucket (cumulative counts per bucket), _sum (total sum of observed values), and _count (total number of observations).',
      when: 'Use histograms for latency, request sizes, or any metric where you need percentiles. histogram_quantile() calculates percentiles from bucket data. The "le" (less than or equal) label defines bucket boundaries.',
      example: 'http_request_duration_seconds_bucket{le="0.1"} counts requests completing in ≤100ms. The le="0.5" bucket counts requests ≤500ms. Use histogram_quantile(0.95, ...) for p95.',
      query: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
      tips: [
        'Keep the "le" label when grouping for histogram_quantile()',
        'Bucket boundaries are cumulative (le="0.5" includes le="0.1")',
        'More buckets = better accuracy but more storage',
        'Choose bucket boundaries based on your SLOs'
      ]
    }
  },
  {
    id: 'labels',
    title: 'Labels',
    icon: <Database size={18} />,
    color: 'var(--grafana-purple)',
    description: 'Key-value pairs that identify and filter time series',
    details: {
      what: 'Labels are key-value pairs attached to every time series. They enable filtering ({status_code="500"}), grouping (by route), and create unique time series. Each unique label combination is a separate time series.',
      when: 'Use labels to add dimensions you need to filter or group by. But be careful: high cardinality (many unique values) can create performance issues. Avoid user IDs or timestamps as labels.',
      example: 'http_requests_total{method="GET", route="/api/users", status_code="200"} identifies a specific time series. Change any label value and you get a different series.',
      query: 'sum by (route) (rate(http_requests_total[5m]))',
      tips: [
        'Label names should be lowercase with underscores',
        'Avoid high-cardinality labels (user IDs, timestamps)',
        'Use =~ for regex matching, !~ for negative regex',
        '__name__ is a special label containing the metric name'
      ]
    }
  },
  {
    id: 'rate-vs-irate',
    title: 'rate() vs irate()',
    icon: <Activity size={18} />,
    color: 'var(--grafana-cyan)',
    description: 'Understanding when to use average rate vs instant rate',
    details: {
      what: 'rate() calculates per-second average rate using all points in the range. irate() uses only the last two points for "instant" rate. rate() is smoother, irate() is more responsive to spikes.',
      when: 'Use rate() for dashboards, trends, and most alerting - it smooths out noise. Use irate() when you need to see brief spikes that rate() would average out, like real-time displays.',
      example: 'If traffic spikes for 10 seconds then returns to normal: rate()[5m] shows a small bump, irate()[5m] shows the full spike (but only briefly).',
      query: 'rate(http_requests_total[5m]) # vs irate(http_requests_total[5m])',
      tips: [
        'rate() for alerting and dashboards',
        'irate() for real-time spike detection',
        'Both handle counter resets automatically',
        'irate() can show misleading spikes from scrape timing'
      ]
    }
  }
];

export function ConceptsSection() {
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {concepts.map((concept) => (
          <div
            key={concept.id}
            style={{
              border: '1px solid var(--grafana-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              background: selectedConcept?.id === concept.id ? 'var(--grafana-bg-hover)' : 'var(--grafana-bg-panel)'
            }}
            onClick={() => setSelectedConcept(selectedConcept?.id === concept.id ? null : concept)}
          >
            <div style={{ 
              padding: '12px 14px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              borderLeft: `3px solid ${concept.color}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: concept.color }}>
                  {concept.icon}
                </div>
                <div>
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: '14px', 
                    color: 'var(--grafana-text-primary)',
                    marginBottom: '2px'
                  }}>
                    {concept.title}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--grafana-text-secondary)',
                    lineHeight: '1.4'
                  }}>
                    {concept.description}
                  </div>
                </div>
              </div>
              <ChevronRight 
                size={16} 
                style={{ 
                  color: 'var(--grafana-text-tertiary)',
                  transform: selectedConcept?.id === concept.id ? 'rotate(90deg)' : 'none',
                  transition: 'transform var(--transition-fast)',
                  flexShrink: 0
                }} 
              />
            </div>

            {selectedConcept?.id === concept.id && (
              <div style={{ 
                padding: '16px', 
                borderTop: '1px solid var(--grafana-border)',
                background: 'var(--grafana-bg-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                animation: 'slideIn var(--transition-normal)'
              }}>
                <Section title="What is it?">
                  {concept.details.what}
                </Section>
                
                <Section title="When to use?">
                  {concept.details.when}
                </Section>
                
                <Section title="Example">
                  {concept.details.example}
                  <code style={{
                    display: 'block',
                    padding: '10px 12px',
                    background: 'var(--grafana-bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--grafana-blue)',
                    marginTop: '10px',
                    border: '1px solid var(--grafana-border)'
                  }}>
                    {concept.details.query}
                  </code>
                </Section>

                <Section title="Tips">
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {concept.details.tips.map((tip, idx) => (
                      <li key={idx} style={{ 
                        fontSize: '13px',
                        color: 'var(--grafana-text-secondary)',
                        lineHeight: '1.5'
                      }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ 
        fontSize: '11px', 
        fontWeight: 600, 
        color: 'var(--grafana-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '8px'
      }}>
        {title}
      </div>
      <div style={{ 
        fontSize: '13px', 
        color: 'var(--grafana-text-primary)',
        lineHeight: '1.6'
      }}>
        {children}
      </div>
    </div>
  );
}
