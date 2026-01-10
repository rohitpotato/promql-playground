import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Copy, Check } from 'lucide-react';
import type { PrometheusMetricResult } from '../../services/prometheusClient';
import { format } from 'date-fns';
import '../../styles/grafana-theme.css';

interface DataTableProps {
  data: PrometheusMetricResult[];
}

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

// Format large numbers
function formatValue(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(2) + 'K';
  if (Math.abs(value) < 0.001 && value !== 0) return value.toExponential(2);
  return value.toFixed(4).replace(/\.?0+$/, '');
}

export function DataTable({ data }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Extract all label keys and compute table data
  const { labelKeys, tableData, isInstantQuery } = useMemo(() => {
    if (!data || data.length === 0) {
      return { labelKeys: [], tableData: [], isInstantQuery: false };
    }

    // Check if this is an instant query (has 'value') or range query (has 'values')
    const instantQuery = data.some(d => d.value);

    const allLabels = new Set<string>();
    for (const series of data) {
      Object.keys(series.metric).forEach(key => {
        if (key !== '__name__') {
          allLabels.add(key);
        }
      });
    }

    const keys = Array.from(allLabels).sort();

    const rows = data.map((series, index) => {
      // Handle both instant and range queries
      let lastValue: number | null = null;
      let lastTimestamp: number | null = null;
      let firstValue: number | null = null;
      let minValue = Infinity;
      let maxValue = -Infinity;
      let sumValue = 0;
      let pointCount = 0;

      if (series.value) {
        // Instant query
        lastTimestamp = series.value[0];
        lastValue = parseFloat(series.value[1]);
        firstValue = lastValue;
        minValue = lastValue;
        maxValue = lastValue;
        sumValue = lastValue;
        pointCount = 1;
      } else if (series.values) {
        // Range query
        pointCount = series.values.length;
        for (const [ts, val] of series.values) {
          const numVal = parseFloat(val);
          if (firstValue === null) firstValue = numVal;
          lastValue = numVal;
          lastTimestamp = ts;
          minValue = Math.min(minValue, numVal);
          maxValue = Math.max(maxValue, numVal);
          sumValue += numVal;
        }
      }

      const avgValue = pointCount > 0 ? sumValue / pointCount : 0;

      return {
        index,
        labels: series.metric,
        lastValue,
        lastTimestamp,
        firstValue,
        minValue: minValue === Infinity ? 0 : minValue,
        maxValue: maxValue === -Infinity ? 0 : maxValue,
        avgValue,
        pointCount,
        series,
      };
    });

    return { labelKeys: keys, tableData: rows, isInstantQuery: instantQuery };
  }, [data]);

  const sortedData = useMemo(() => {
    if (!sortConfig || tableData.length === 0) return tableData;

    return [...tableData].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortConfig.key === 'last_value') {
        aValue = a.lastValue ?? 0;
        bValue = b.lastValue ?? 0;
      } else if (sortConfig.key === 'avg_value') {
        aValue = a.avgValue;
        bValue = b.avgValue;
      } else if (sortConfig.key === 'min_value') {
        aValue = a.minValue;
        bValue = b.minValue;
      } else if (sortConfig.key === 'max_value') {
        aValue = a.maxValue;
        bValue = b.maxValue;
      } else if (sortConfig.key === 'points') {
        aValue = a.pointCount;
        bValue = b.pointCount;
      } else {
        aValue = a.labels[sortConfig.key] || '';
        bValue = b.labels[sortConfig.key] || '';
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleCopyLabels = async (row: typeof tableData[0], index: number) => {
    const labelStr = Object.entries(row.labels)
      .filter(([key]) => key !== '__name__')
      .map(([key, value]) => `${key}="${value}"`)
      .join(', ');

    try {
      await navigator.clipboard.writeText(`{${labelStr}}`);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleRowExpand = (index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) {
      return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={12} style={{ color: 'var(--grafana-blue)' }} />
      : <ArrowDown size={12} style={{ color: 'var(--grafana-blue)' }} />;
  };

  if (!data || data.length === 0) {
    return (
      <div className="grafana-empty" style={{ padding: '48px' }}>
        <div className="grafana-empty-title">No data to display</div>
        <div className="grafana-empty-description">
          Execute a query to see results in table format.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Stats header */}
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '1px solid var(--grafana-border)',
        background: 'var(--grafana-bg-secondary)',
        fontSize: '11px',
        color: 'var(--grafana-text-tertiary)',
        flexShrink: 0,
      }}>
        <span>
          <strong style={{ color: 'var(--grafana-text-secondary)' }}>{sortedData.length}</strong> series
        </span>
        <span>
          <strong style={{ color: 'var(--grafana-text-secondary)' }}>{labelKeys.length}</strong> labels
        </span>
        <span style={{
          background: isInstantQuery ? 'var(--grafana-orange-bg)' : 'var(--grafana-blue-bg)',
          color: isInstantQuery ? 'var(--grafana-orange)' : 'var(--grafana-blue)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600,
        }}>
          {isInstantQuery ? 'Instant' : 'Range'}
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="grafana-table" style={{ minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              {labelKeys.map(key => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{key}</span>
                    <SortIcon columnKey={key} />
                  </div>
                </th>
              ))}
              <th
                onClick={() => handleSort('last_value')}
                style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                  <span>{isInstantQuery ? 'Value' : 'Last Value'}</span>
                  <SortIcon columnKey="last_value" />
                </div>
              </th>
              {!isInstantQuery && (
                <>
                  <th
                    onClick={() => handleSort('avg_value')}
                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                      <span>Avg</span>
                      <SortIcon columnKey="avg_value" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('min_value')}
                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                      <span>Min</span>
                      <SortIcon columnKey="min_value" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('max_value')}
                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                      <span>Max</span>
                      <SortIcon columnKey="max_value" />
                    </div>
                  </th>
                </>
              )}
              <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <>
                <tr
                  key={row.index}
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleRowExpand(row.index)}
                >
                  <td style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--grafana-text-tertiary)',
                  }}>
                    {row.index + 1}
                  </td>
                  {labelKeys.map(key => (
                    <td
                      key={key}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.labels[key] || '-'}
                    >
                      {row.labels[key] || <span style={{ color: 'var(--grafana-text-tertiary)' }}>-</span>}
                    </td>
                  ))}
                  <td style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--grafana-blue)',
                  }}>
                    {row.lastValue !== null ? formatValue(row.lastValue) : '-'}
                  </td>
                  {!isInstantQuery && (
                    <>
                      <td style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        textAlign: 'right',
                        color: 'var(--grafana-text-secondary)',
                      }}>
                        {formatValue(row.avgValue)}
                      </td>
                      <td style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        textAlign: 'right',
                        color: 'var(--grafana-green)',
                      }}>
                        {formatValue(row.minValue)}
                      </td>
                      <td style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        textAlign: 'right',
                        color: 'var(--grafana-orange)',
                      }}>
                        {formatValue(row.maxValue)}
                      </td>
                    </>
                  )}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="grafana-button grafana-button-ghost grafana-button-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLabels(row, row.index);
                      }}
                      title="Copy label selector"
                      style={{ padding: '4px 8px' }}
                    >
                      {copiedIndex === row.index ? (
                        <Check size={14} style={{ color: 'var(--grafana-green)' }} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </td>
                </tr>
                {expandedRows.has(row.index) && (
                  <tr key={`${row.index}-expanded`}>
                    <td colSpan={labelKeys.length + (isInstantQuery ? 3 : 6)} style={{
                      background: 'var(--grafana-bg-primary)',
                      padding: '16px',
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '16px',
                      }}>
                        {/* Labels section */}
                        <div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--grafana-text-secondary)',
                            textTransform: 'uppercase',
                            marginBottom: '8px',
                          }}>
                            Labels
                          </div>
                          <code style={{
                            display: 'block',
                            padding: '8px',
                            background: 'var(--grafana-bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--grafana-blue)',
                            wordBreak: 'break-all',
                          }}>
                            {'{' + Object.entries(row.labels)
                              .filter(([key]) => key !== '__name__')
                              .map(([key, value]) => `${key}="${value}"`)
                              .join(', ') + '}'}
                          </code>
                        </div>

                        {/* Stats section */}
                        <div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--grafana-text-secondary)',
                            textTransform: 'uppercase',
                            marginBottom: '8px',
                          }}>
                            Statistics
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            fontSize: '12px',
                          }}>
                            <div>
                              <span style={{ color: 'var(--grafana-text-tertiary)' }}>Points:</span>{' '}
                              <strong>{row.pointCount}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--grafana-text-tertiary)' }}>Range:</span>{' '}
                              <strong>{formatValue(row.maxValue - row.minValue)}</strong>
                            </div>
                            {row.lastTimestamp && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ color: 'var(--grafana-text-tertiary)' }}>Last:</span>{' '}
                                <strong>{format(new Date(row.lastTimestamp * 1000), 'MMM dd, HH:mm:ss')}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
