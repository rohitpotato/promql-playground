import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { PrometheusMetricResult } from '../../services/prometheusClient';

interface TimeseriesGraphProps {
  data: PrometheusMetricResult[];
  height?: number;
}

// Clean color palette
const COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f97316', // Orange
  '#ef4444', // Red
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#eab308', // Yellow
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
];

function formatValue(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(2) + 'K';
  if (Math.abs(value) < 0.001 && value !== 0) return value.toExponential(2);
  return value.toFixed(3).replace(/\.?0+$/, '');
}

function getSeriesLabel(metric: Record<string, string>): string {
  const entries = Object.entries(metric)
    .filter(([key]) => key !== '__name__')
    .slice(0, 4);

  if (entries.length === 0) {
    return metric.__name__ || 'value';
  }

  return entries.map(([k, v]) => `${k}="${v}"`).join(', ');
}

export function TimeseriesGraph({ data, height = 300 }: TimeseriesGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<number>>(new Set());
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    idx: number;
    visible: boolean;
  } | null>(null);

  // Transform Prometheus data to uPlot format
  const { uplotData, seriesConfig, seriesLabels, stats } = useMemo(() => {
    if (!data || data.length === 0) {
      return { uplotData: null, seriesConfig: [], seriesLabels: [], stats: null };
    }

    const timestampSet = new Set<number>();
    for (const series of data) {
      if (series.values) {
        for (const [ts] of series.values) {
          timestampSet.add(ts);
        }
      }
    }

    const timestamps = Array.from(timestampSet).sort((a, b) => a - b);
    if (timestamps.length === 0) {
      return { uplotData: null, seriesConfig: [], seriesLabels: [], stats: null };
    }

    const tsIndex = new Map(timestamps.map((ts, i) => [ts, i]));
    const uplotArrays: (number | null)[][] = [timestamps];
    const labels: string[] = [];
    const configs: uPlot.Series[] = [{}];

    for (let i = 0; i < data.length; i++) {
      const series = data[i];
      const label = getSeriesLabel(series.metric);
      labels.push(label);

      const values: (number | null)[] = new Array(timestamps.length).fill(null);

      if (series.values) {
        for (const [ts, val] of series.values) {
          const idx = tsIndex.get(ts);
          if (idx !== undefined) {
            values[idx] = parseFloat(val);
          }
        }
      }

      uplotArrays.push(values);

      configs.push({
        label,
        stroke: COLORS[i % COLORS.length],
        width: 1.5,
        spanGaps: false,
        points: { show: false },
      });
    }

    const timeRange = timestamps.length > 1
      ? { start: timestamps[0], end: timestamps[timestamps.length - 1] }
      : null;

    return {
      uplotData: uplotArrays as uPlot.AlignedData,
      seriesConfig: configs,
      seriesLabels: labels,
      stats: {
        seriesCount: data.length,
        pointCount: timestamps.length,
        timeRange,
      },
    };
  }, [data]);

  // Legend click: toggle series visibility (like Grafana)
  const handleLegendClick = useCallback((seriesIdx: number, event: React.MouseEvent) => {
    // Shift+click or Cmd+click = isolate this series (show only this one)
    if (event.shiftKey || event.metaKey) {
      const allHidden = seriesLabels.map((_, i) => i).filter(i => i !== seriesIdx);
      // If this series is already isolated, show all
      if (hiddenSeries.size === allHidden.length && !hiddenSeries.has(seriesIdx)) {
        setHiddenSeries(new Set());
      } else {
        setHiddenSeries(new Set(allHidden));
      }
    } else {
      // Regular click = toggle this series
      setHiddenSeries(prev => {
        const newSet = new Set(prev);
        if (newSet.has(seriesIdx)) {
          newSet.delete(seriesIdx);
        } else {
          newSet.add(seriesIdx);
        }
        return newSet;
      });
    }
  }, [seriesLabels, hiddenSeries]);

  // Show all series
  const showAllSeries = useCallback(() => {
    setHiddenSeries(new Set());
  }, []);

  // Create/update chart
  useEffect(() => {
    if (!containerRef.current || !uplotData) {
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Update series config with hidden state
    const updatedSeriesConfig = seriesConfig.map((config, idx) => {
      if (idx === 0) return config;
      return {
        ...config,
        show: !hiddenSeries.has(idx - 1),
      };
    });

    const chartWidth = containerRef.current.clientWidth;

    const opts: uPlot.Options = {
      width: chartWidth,
      height: height,
      class: 'uplot-chart',
      cursor: {
        focus: { prox: 30 },
        drag: { x: true, y: false, setScale: true },
        points: {
          size: 6,
          fill: (_u, seriesIdx) => COLORS[(seriesIdx - 1) % COLORS.length],
          stroke: '#0f0f0f',
          width: 1.5,
        },
      },
      legend: { show: false },
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      axes: [
        {
          stroke: '#525252',
          grid: { stroke: '#262626', width: 1 },
          ticks: { stroke: '#262626', width: 1 },
          font: '11px -apple-system, BlinkMacSystemFont, sans-serif',
        },
        {
          stroke: '#525252',
          grid: { stroke: '#262626', width: 1 },
          ticks: { stroke: '#262626', width: 1 },
          font: '11px -apple-system, BlinkMacSystemFont, sans-serif',
          size: 50,
          values: (_, ticks) => ticks.map(v => formatValue(v)),
        },
      ],
      series: updatedSeriesConfig,
      hooks: {
        setCursor: [
          (u) => {
            const idx = u.cursor.idx;
            if (idx !== null && idx !== undefined && u.cursor.left !== undefined && u.cursor.top !== undefined) {
              // Get the actual pixel position from uPlot
              const rect = u.root.getBoundingClientRect();
              setTooltipData({
                x: rect.left + u.cursor.left,
                y: rect.top + u.cursor.top,
                idx,
                visible: true,
              });
            } else {
              setTooltipData(null);
            }
          },
        ],
      },
    };

    chartRef.current = new uPlot(opts, uplotData, containerRef.current);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (chartRef.current && entry.contentRect.width > 0) {
          chartRef.current.setSize({
            width: entry.contentRect.width,
            height: height,
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [uplotData, seriesConfig, height, hiddenSeries]);

  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatTimeRange = () => {
    if (!stats?.timeRange) return '';
    return `${formatTime(stats.timeRange.start)} - ${formatTime(stats.timeRange.end)}`;
  };

  if (!data || data.length === 0 || !uplotData) {
    return (
      <div style={{
        height: height + 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-tertiary)',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.4 }}>📊</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No data</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Query returned no time series
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      {/* Stats header */}
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        fontSize: '12px',
        color: 'var(--text-tertiary)',
      }}>
        <span>
          <strong style={{ color: 'var(--text-secondary)' }}>{stats?.seriesCount || 0}</strong> series
        </span>
        <span>
          <strong style={{ color: 'var(--text-secondary)' }}>{stats?.pointCount || 0}</strong> points
        </span>
        {stats?.timeRange && <span>{formatTimeRange()}</span>}
        {hiddenSeries.size > 0 && (
          <button
            onClick={showAllSeries}
            style={{
              marginLeft: 'auto',
              background: 'var(--accent-blue-bg)',
              color: 'var(--accent-blue)',
              border: '1px solid var(--accent-blue)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Show all ({hiddenSeries.size} hidden)
          </button>
        )}
      </div>

      {/* Chart container */}
      <div style={{ padding: '8px', height: height + 16 }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Tooltip - follows cursor */}
      {tooltipData?.visible && uplotData && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: tooltipData.x + 12,
            top: tooltipData.y - 10,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '10px 12px',
            zIndex: 1000,
            maxWidth: '280px',
            boxShadow: 'var(--shadow-lg)',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            marginBottom: '6px',
            paddingBottom: '6px',
            borderBottom: '1px solid var(--border)',
          }}>
            {formatTime(uplotData[0][tooltipData.idx] as number)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '180px', overflowY: 'auto' }}>
            {seriesLabels.map((label, idx) => {
              if (hiddenSeries.has(idx)) return null;
              const val = uplotData[idx + 1][tooltipData.idx];
              if (val === null || val === undefined) return null;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                }}>
                  <div style={{
                    width: '8px',
                    height: '3px',
                    borderRadius: '1px',
                    background: COLORS[idx % COLORS.length],
                    flexShrink: 0,
                  }} />
                  <span style={{
                    color: 'var(--text-secondary)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                  }}>
                    {label}
                  </span>
                  <span style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {formatValue(val as number)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        maxHeight: '90px',
        overflowY: 'auto',
      }}>
        {seriesLabels.map((label, idx) => {
          const isHidden = hiddenSeries.has(idx);
          let currentValue: string | null = null;
          if (tooltipData?.visible && uplotData && uplotData[idx + 1]) {
            const val = uplotData[idx + 1][tooltipData.idx];
            if (val !== null && val !== undefined) {
              currentValue = formatValue(val as number);
            }
          }

          return (
            <div
              key={idx}
              onClick={(e) => handleLegendClick(idx, e)}
              title="Click to toggle • Shift+click to isolate"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '4px',
                background: isHidden ? 'transparent' : 'var(--bg-tertiary)',
                border: isHidden ? '1px dashed var(--border)' : '1px solid transparent',
                fontSize: '11px',
                maxWidth: '240px',
                cursor: 'pointer',
                opacity: isHidden ? 0.4 : 1,
                transition: 'all 0.1s ease',
              }}
            >
              <div style={{
                width: '10px',
                height: '3px',
                borderRadius: '1px',
                background: isHidden ? 'var(--text-muted)' : COLORS[idx % COLORS.length],
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textDecoration: isHidden ? 'line-through' : 'none',
              }}>
                {label}
              </span>
              {currentValue && !isHidden && (
                <span style={{
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  flexShrink: 0,
                  marginLeft: 'auto',
                }}>
                  {currentValue}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
