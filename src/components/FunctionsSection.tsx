import { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import '../styles/grafana-theme.css';

interface PromQLFunction {
  name: string;
  category: string;
  signature: string;
  description: string;
  example: string;
  explanation: string;
  tips?: string[];
}

const functions: PromQLFunction[] = [
  // Rate Functions
  {
    name: 'rate',
    category: 'Rate',
    signature: 'rate(v range-vector)',
    description: 'Per-second average rate of increase',
    example: 'rate(http_requests_total[5m])',
    explanation: 'Calculates the per-second average rate of increase over the time range. Essential for counters. The [5m] window should be at least 4x your scrape interval.',
    tips: ['Most common function for counters', 'Use for dashboards and alerting', 'Handles counter resets automatically']
  },
  {
    name: 'irate',
    category: 'Rate',
    signature: 'irate(v range-vector)',
    description: 'Instant rate using last two points',
    example: 'irate(http_requests_total[5m])',
    explanation: 'Uses only the last two data points to calculate rate. More sensitive to brief spikes than rate(), but also more volatile and noisy.',
    tips: ['Good for real-time spike detection', 'Not recommended for alerting', 'Can show misleading values']
  },
  {
    name: 'increase',
    category: 'Rate',
    signature: 'increase(v range-vector)',
    description: 'Total increase over time range',
    example: 'increase(http_requests_total[1h])',
    explanation: 'Returns the total increase over the time period. Equivalent to rate() * range_duration. Useful when you want counts rather than rates.',
    tips: ['Returns count, not rate', 'Good for "requests in last hour"', 'Handles counter resets']
  },
  // Aggregation Functions
  {
    name: 'sum',
    category: 'Aggregation',
    signature: 'sum([by|without (labels)]) (v instant-vector)',
    description: 'Sum values across dimensions',
    example: 'sum by (route) (rate(http_requests_total[5m]))',
    explanation: 'Adds up all values. Use "by" to keep specific labels, "without" to remove specific labels. Without either, all labels are removed.',
    tips: ['"by" keeps specified labels', '"without" removes specified labels', 'No modifier = single total']
  },
  {
    name: 'avg',
    category: 'Aggregation',
    signature: 'avg([by|without (labels)]) (v instant-vector)',
    description: 'Average across dimensions',
    example: 'avg by (route) (rate(http_requests_total[5m]))',
    explanation: 'Calculates arithmetic mean across matching series. Useful for understanding typical values when you have multiple instances.',
    tips: ['Good for "typical" values', 'Use with by/without like sum', 'Sensitive to outliers']
  },
  {
    name: 'max',
    category: 'Aggregation',
    signature: 'max([by|without (labels)]) (v instant-vector)',
    description: 'Maximum value across dimensions',
    example: 'max by (route) (rate(http_requests_total[5m]))',
    explanation: 'Returns the highest value among grouped series. Useful for finding peak load or worst-case latency.',
    tips: ['Find peak values', 'Good for alerting on any instance', 'Pairs well with min()']
  },
  {
    name: 'min',
    category: 'Aggregation',
    signature: 'min([by|without (labels)]) (v instant-vector)',
    description: 'Minimum value across dimensions',
    example: 'min by (route) (rate(http_requests_total[5m]))',
    explanation: 'Returns the lowest value among grouped series. Useful for finding minimum throughput or best-case latency.',
    tips: ['Find minimum values', 'Detect instances with low traffic', 'Pairs well with max()']
  },
  {
    name: 'count',
    category: 'Aggregation',
    signature: 'count([by|without (labels)]) (v instant-vector)',
    description: 'Count number of series',
    example: 'count by (route) (http_requests_total)',
    explanation: 'Counts the number of time series, not values. Useful for knowing how many series match your query.',
    tips: ['Counts series, not values', 'Good for cardinality checks', 'Different from sum()']
  },
  {
    name: 'topk',
    category: 'Selection',
    signature: 'topk(k, v instant-vector)',
    description: 'Top k elements by value',
    example: 'topk(5, sum by (route) (rate(http_requests_total[5m])))',
    explanation: 'Returns the k time series with the largest values. Useful for "top N" dashboards and focusing on highest impact items.',
    tips: ['Shows highest values', 'k must be a positive integer', 'Returns full time series']
  },
  {
    name: 'bottomk',
    category: 'Selection',
    signature: 'bottomk(k, v instant-vector)',
    description: 'Bottom k elements by value',
    example: 'bottomk(5, sum by (route) (rate(http_requests_total[5m])))',
    explanation: 'Returns the k time series with the smallest values. Useful for finding least active items or best performers (for error rates).',
    tips: ['Shows lowest values', 'Good for finding underutilized resources', 'Opposite of topk']
  },
  // Histogram Functions
  {
    name: 'histogram_quantile',
    category: 'Histogram',
    signature: 'histogram_quantile(φ scalar, b instant-vector)',
    description: 'Calculate quantile from histogram',
    example: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
    explanation: 'Calculates the φ-quantile (0 ≤ φ ≤ 1) from histogram buckets. φ=0.95 gives the 95th percentile. Must use rate() of _bucket metrics.',
    tips: ['φ between 0 and 1', 'Keep "le" label when grouping', 'Use rate() on buckets first', 'Common: 0.5 (p50), 0.95 (p95), 0.99 (p99)']
  },
  // Math Functions
  {
    name: 'abs',
    category: 'Math',
    signature: 'abs(v instant-vector)',
    description: 'Absolute value',
    example: 'abs(rate(errors[5m]) - rate(errors[5m] offset 1h))',
    explanation: 'Returns the absolute value of all sample values. Useful when comparing values where direction doesn\'t matter.',
    tips: ['Converts negative to positive', 'Useful for change magnitude', 'Works element-wise']
  },
  {
    name: 'ceil',
    category: 'Math',
    signature: 'ceil(v instant-vector)',
    description: 'Round up to nearest integer',
    example: 'ceil(rate(http_requests_total[5m]))',
    explanation: 'Rounds all values up to the nearest integer. Useful for display or when you need whole numbers.',
    tips: ['Rounds up', 'Returns integer', 'Pairs with floor()']
  },
  {
    name: 'floor',
    category: 'Math',
    signature: 'floor(v instant-vector)',
    description: 'Round down to nearest integer',
    example: 'floor(rate(http_requests_total[5m]))',
    explanation: 'Rounds all values down to the nearest integer. Useful when you need whole numbers and want to be conservative.',
    tips: ['Rounds down', 'Returns integer', 'Pairs with ceil()']
  },
  {
    name: 'round',
    category: 'Math',
    signature: 'round(v instant-vector, to_nearest scalar)',
    description: 'Round to nearest multiple',
    example: 'round(rate(http_requests_total[5m]), 0.1)',
    explanation: 'Rounds values to the nearest multiple of to_nearest. Default is 1 (nearest integer).',
    tips: ['to_nearest is optional (default 1)', 'round(x, 0.1) = 1 decimal', 'round(x, 10) = nearest 10']
  },
  // Time Functions
  {
    name: 'time',
    category: 'Time',
    signature: 'time()',
    description: 'Current Unix timestamp',
    example: 'time() - process_start_time_seconds',
    explanation: 'Returns the current Unix timestamp (seconds since Jan 1, 1970). Useful for calculating age or time since events.',
    tips: ['No arguments', 'Returns seconds', 'Useful for uptime calculations']
  },
  // Label Functions
  {
    name: 'label_replace',
    category: 'Label',
    signature: 'label_replace(v, dst_label, replacement, src_label, regex)',
    description: 'Modify or create labels with regex',
    example: 'label_replace(up, "short", "$1", "instance", "(.*):.+")',
    explanation: 'Matches regex against src_label and creates/replaces dst_label with replacement (can use capture groups like $1).',
    tips: ['$1, $2 for capture groups', 'Creates label if doesn\'t exist', 'Useful for reformatting']
  }
];

const categories = ['All', 'Rate', 'Aggregation', 'Selection', 'Histogram', 'Math', 'Time', 'Label'];

export function FunctionsSection() {
  const [selectedFunction, setSelectedFunction] = useState<PromQLFunction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFunctions = functions.filter(f => {
    const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <div style={{
        position: 'relative',
        marginBottom: '12px'
      }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--grafana-text-tertiary)'
          }}
        />
        <input
          type="text"
          placeholder="Search functions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="grafana-input"
          style={{
            paddingLeft: '32px',
            fontSize: '13px'
          }}
        />
      </div>

      {/* Category Filter */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '12px',
        flexWrap: 'wrap'
      }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`grafana-button grafana-button-sm ${selectedCategory === cat ? 'grafana-button-primary' : ''}`}
            onClick={() => setSelectedCategory(cat)}
            style={{
              fontSize: '11px',
              padding: '4px 10px'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Functions List */}
      <div style={{
        flex: 1,
        overflow: 'scroll',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {filteredFunctions.map((func) => (
          <div
            key={func.name}
            style={{
              border: '1px solid var(--grafana-border)',
              borderRadius: 'var(--radius-md)',
              // overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              background: selectedFunction?.name === func.name ? 'var(--grafana-bg-hover)' : 'var(--grafana-bg-panel)'
            }}
            onClick={() => setSelectedFunction(selectedFunction?.name === func.name ? null : func)}
          >
            <div style={{
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <code style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--grafana-blue)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {func.name}()
                  </code>
                  <span style={{
                    fontSize: '10px',
                    color: 'var(--grafana-text-tertiary)',
                    textTransform: 'uppercase',
                    background: 'var(--grafana-bg-tertiary)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    {func.category}
                  </span>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--grafana-text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {func.description}
                </div>
              </div>
              <ChevronRight
                size={16}
                style={{
                  color: 'var(--grafana-text-tertiary)',
                  transform: selectedFunction?.name === func.name ? 'rotate(90deg)' : 'none',
                  transition: 'transform var(--transition-fast)',
                  flexShrink: 0,
                  marginLeft: '8px'
                }}
              />
            </div>

            {selectedFunction?.name === func.name && (
              <div style={{
                padding: '14px',
                borderTop: '1px solid var(--grafana-border)',
                background: 'var(--grafana-bg-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                animation: 'slideIn var(--transition-normal)'
              }}>
                {/* Signature */}
                <div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--grafana-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px'
                  }}>
                    Syntax
                  </div>
                  <code style={{
                    display: 'block',
                    padding: '8px 10px',
                    background: 'var(--grafana-bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--grafana-text-primary)',
                    border: '1px solid var(--grafana-border)'
                  }}>
                    {func.signature}
                  </code>
                </div>

                {/* Explanation */}
                <div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--grafana-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px'
                  }}>
                    How it works
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'var(--grafana-text-primary)',
                    lineHeight: '1.6'
                  }}>
                    {func.explanation}
                  </div>
                </div>

                {/* Example */}
                <div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--grafana-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px'
                  }}>
                    Example
                  </div>
                  <code style={{
                    display: 'block',
                    padding: '8px 10px',
                    background: 'var(--grafana-bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--grafana-blue)',
                    border: '1px solid var(--grafana-border)'
                  }}>
                    {func.example}
                  </code>
                </div>

                {/* Tips */}
                {func.tips && func.tips.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--grafana-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px'
                    }}>
                      Tips
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      {func.tips.map((tip, idx) => (
                        <li key={idx} style={{
                          fontSize: '12px',
                          color: 'var(--grafana-text-secondary)',
                          lineHeight: '1.5'
                        }}>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredFunctions.length === 0 && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--grafana-text-tertiary)',
            fontSize: '13px'
          }}>
            No functions found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
