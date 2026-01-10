import { useMemo } from 'react';
import { ArrowRight, Layers, Filter, Timer, Calculator, TrendingUp, BarChart3 } from 'lucide-react';
import type { Scenario } from '../types/promql';
import '../styles/grafana-theme.css';

interface QueryExplanationProps {
    query: string;
    scenario: Scenario;
}

interface QueryPart {
    type: 'metric' | 'labels' | 'range' | 'function' | 'aggregation' | 'operator' | 'modifier';
    text: string;
    explanation: string;
    icon: React.ReactNode;
    color: string;
}

export function QueryExplanation({ query, scenario }: QueryExplanationProps) {
    const sampleQuery = scenario.sampleQueries.find(sq => sq.query === query);
    const queryParts = useMemo(() => parseQueryParts(query), [query]);
    const steps = useMemo(() => generateDetailedSteps(query), [query]);

    return (
        <div style={{ 
            marginTop: '16px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--bg-secondary)',
        }}>
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <Calculator size={15} style={{ color: 'var(--accent-blue)' }} />
                <h3 style={{ 
                    margin: 0, 
                    fontSize: '13px', 
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                }}>
                    Query Breakdown
                </h3>
            </div>

            <div style={{ padding: '16px' }}>
                {sampleQuery?.explanation && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '12px 14px',
                        background: 'var(--accent-blue-bg)',
                        borderRadius: '6px',
                        borderLeft: '3px solid var(--accent-blue)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.6',
                    }}>
                        {sampleQuery.explanation}
                    </div>
                )}

                {/* Query components */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-tertiary)',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Layers size={13} />
                        Components
                    </div>

                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center'
                    }}>
                        {queryParts.map((part, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {index > 0 && (
                                    <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                                )}
                                <div
                                    style={{
                                        padding: '6px 10px',
                                        background: part.color,
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'help',
                                    }}
                                    title={part.explanation}
                                >
                                    {part.icon}
                                    <code style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '11px',
                                        color: 'var(--text-primary)'
                                    }}>
                                        {part.text}
                                    </code>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Steps */}
                <div>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-tertiary)',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <TrendingUp size={13} />
                        Execution Steps
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    background: 'var(--bg-primary)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <div style={{
                                    flexShrink: 0,
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-blue)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: 600
                                }}>
                                    {index + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: 500,
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        marginBottom: '4px'
                                    }}>
                                        {step.title}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--text-secondary)',
                                        lineHeight: '1.5'
                                    }}>
                                        {step.description}
                                    </div>
                                    {step.code && (
                                        <code style={{
                                            display: 'inline-block',
                                            marginTop: '6px',
                                            padding: '3px 6px',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontFamily: 'var(--font-mono)',
                                            color: 'var(--accent-blue)'
                                        }}>
                                            {step.code}
                                        </code>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Result interpretation */}
                <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'var(--bg-primary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--text-tertiary)',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <BarChart3 size={13} />
                        Result Interpretation
                    </div>
                    <div style={{
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.6'
                    }}>
                        {generateResultInterpretation(query)}
                    </div>
                </div>
            </div>
        </div>
    );
}

function parseQueryParts(query: string): QueryPart[] {
    const parts: QueryPart[] = [];

    const funcMatch = query.match(/^(\w+)\s*\(/);
    if (funcMatch) {
        const func = funcMatch[1];
        let funcType: QueryPart['type'] = 'function';
        let color = 'var(--accent-purple-bg)';
        let icon = <Calculator size={12} style={{ color: 'var(--accent-purple)' }} />;

        if (['sum', 'avg', 'max', 'min', 'count', 'topk', 'bottomk', 'stddev'].includes(func)) {
            funcType = 'aggregation';
            color = 'var(--accent-green-bg)';
            icon = <Layers size={12} style={{ color: 'var(--accent-green)' }} />;
        } else if (['rate', 'irate', 'increase'].includes(func)) {
            color = 'var(--accent-orange-bg)';
            icon = <TrendingUp size={12} style={{ color: 'var(--accent-orange)' }} />;
        }

        parts.push({
            type: funcType,
            text: func + '()',
            explanation: getFunctionExplanation(func),
            icon,
            color
        });
    }

    const byMatch = query.match(/\bby\s*\(([^)]+)\)/);
    if (byMatch) {
        parts.push({
            type: 'modifier',
            text: `by (${byMatch[1]})`,
            explanation: `Groups results by ${byMatch[1]} label(s).`,
            icon: <Filter size={12} style={{ color: 'var(--accent-cyan)' }} />,
            color: 'var(--accent-cyan-bg)'
        });
    }

    const withoutMatch = query.match(/\bwithout\s*\(([^)]+)\)/);
    if (withoutMatch) {
        parts.push({
            type: 'modifier',
            text: `without (${withoutMatch[1]})`,
            explanation: `Removes ${withoutMatch[1]} label(s) from results.`,
            icon: <Filter size={12} style={{ color: 'var(--accent-cyan)' }} />,
            color: 'var(--accent-cyan-bg)'
        });
    }

    const metricMatch = query.match(/[({,]\s*(\w+)\s*(?:\{|\[|$)/);
    if (metricMatch) {
        parts.push({
            type: 'metric',
            text: metricMatch[1],
            explanation: `The base metric being queried`,
            icon: <BarChart3 size={12} style={{ color: 'var(--accent-blue)' }} />,
            color: 'var(--accent-blue-bg)'
        });
    }

    const labelMatch = query.match(/\{([^}]+)\}/);
    if (labelMatch) {
        const labels = labelMatch[1].split(',').map(l => l.trim()).filter(Boolean);
        if (labels.length > 0) {
            parts.push({
                type: 'labels',
                text: `{${labels.length} filter${labels.length > 1 ? 's' : ''}}`,
                explanation: `Label filters: ${labelMatch[1]}`,
                icon: <Filter size={12} style={{ color: 'var(--accent-yellow)' }} />,
                color: 'var(--accent-yellow-bg)'
            });
        }
    }

    const rangeMatch = query.match(/\[(\d+[smhd])\]/);
    if (rangeMatch) {
        parts.push({
            type: 'range',
            text: `[${rangeMatch[1]}]`,
            explanation: `Time range: look back ${rangeMatch[1]}`,
            icon: <Timer size={12} style={{ color: 'var(--accent-red)' }} />,
            color: 'var(--accent-red-bg)'
        });
    }

    const offsetMatch = query.match(/\boffset\s+(\d+[smhd])/);
    if (offsetMatch) {
        parts.push({
            type: 'modifier',
            text: `offset ${offsetMatch[1]}`,
            explanation: `Shift time back by ${offsetMatch[1]}`,
            icon: <Timer size={12} style={{ color: 'var(--accent-purple)' }} />,
            color: 'var(--accent-purple-bg)'
        });
    }

    return parts;
}

function getFunctionExplanation(func: string): string {
    const explanations: Record<string, string> = {
        rate: 'Per-second average rate of increase',
        irate: 'Instant rate using last two points',
        increase: 'Total increase over time range',
        sum: 'Sum all values',
        avg: 'Calculate average',
        max: 'Find maximum',
        min: 'Find minimum',
        count: 'Count time series',
        topk: 'Top k highest values',
        bottomk: 'Bottom k lowest values',
        histogram_quantile: 'Calculate quantile from histogram',
        stddev: 'Standard deviation',
        stdvar: 'Variance'
    };
    return explanations[func] || `${func} function`;
}

interface Step {
    title: string;
    description: string;
    code?: string;
}

function generateDetailedSteps(query: string): Step[] {
    const steps: Step[] = [];

    const metricMatch = query.match(/(\w+)(?:\{|\[)/);
    if (metricMatch) {
        steps.push({
            title: 'Select Metric',
            description: `Query the "${metricMatch[1]}" metric.`,
            code: metricMatch[1]
        });
    }

    const labelMatch = query.match(/\{([^}]+)\}/);
    if (labelMatch) {
        steps.push({
            title: 'Filter by Labels',
            description: labelMatch[1].includes('=~') 
                ? 'Apply regex pattern matching to filter series.'
                : 'Filter series by exact label values.',
            code: `{${labelMatch[1]}}`
        });
    }

    const rangeMatch = query.match(/\[(\d+)([smhd])\]/);
    if (rangeMatch) {
        const unitName = { s: 'seconds', m: 'minutes', h: 'hours', d: 'days' }[rangeMatch[2]] || rangeMatch[2];
        steps.push({
            title: 'Create Range Vector',
            description: `Look back ${rangeMatch[1]} ${unitName} at each point.`,
            code: `[${rangeMatch[1]}${rangeMatch[2]}]`
        });
    }

    if (query.includes('rate(')) {
        steps.push({
            title: 'Calculate Rate',
            description: 'Compute per-second rate of increase. Handles counter resets.',
        });
    } else if (query.includes('irate(')) {
        steps.push({
            title: 'Calculate Instant Rate',
            description: 'Rate using only the last two data points.',
        });
    } else if (query.includes('increase(')) {
        steps.push({
            title: 'Calculate Increase',
            description: 'Total increase over the time window.',
        });
    }

    const quantileMatch = query.match(/histogram_quantile\s*\(\s*([\d.]+)/);
    if (quantileMatch) {
        const q = parseFloat(quantileMatch[1]);
        steps.push({
            title: 'Calculate Quantile',
            description: `Compute ${q * 100}th percentile from histogram buckets.`,
        });
    }

    const aggMatch = query.match(/\b(sum|avg|max|min|count|stddev|stdvar)\b/);
    if (aggMatch) {
        const descriptions: Record<string, string> = {
            sum: 'Add all values together.',
            avg: 'Calculate the mean.',
            max: 'Find the highest value.',
            min: 'Find the lowest value.',
            count: 'Count the number of series.',
            stddev: 'Calculate standard deviation.',
            stdvar: 'Calculate variance.'
        };
        steps.push({
            title: `Aggregate (${aggMatch[1]})`,
            description: descriptions[aggMatch[1]] || `Apply ${aggMatch[1]}.`
        });
    }

    const byMatch = query.match(/\bby\s*\(([^)]+)\)/);
    if (byMatch) {
        steps.push({
            title: 'Group by Labels',
            description: `Keep only ${byMatch[1]} in results.`,
            code: `by (${byMatch[1]})`
        });
    }

    const topkMatch = query.match(/topk\s*\(\s*(\d+)/);
    if (topkMatch) {
        steps.push({
            title: `Select Top ${topkMatch[1]}`,
            description: 'Return only the highest values.',
        });
    }

    if (steps.length === 0) {
        steps.push({
            title: 'Return Values',
            description: 'Return raw metric values.'
        });
    }

    return steps;
}

function generateResultInterpretation(query: string): string {
    if (query.includes('rate(')) {
        if (query.includes('status=~"5') || query.includes('code=~"5')) {
            return 'Shows server error rate (errors/second). Lower is better.';
        }
        if (query.includes('status=~"4') || query.includes('code=~"4')) {
            return 'Shows client error rate. Indicates bad requests, auth failures, or missing resources.';
        }
        return 'Shows events per second. Higher = more activity.';
    }
    if (query.includes('histogram_quantile(')) {
        const m = query.match(/histogram_quantile\s*\(\s*([\d.]+)/);
        if (m) {
            const p = parseFloat(m[1]) * 100;
            return `Shows ${p}th percentile latency. ${p}% of requests complete in this time or less.`;
        }
    }
    if (query.includes('sum(') || query.includes('sum by')) {
        return 'Shows aggregated totals across grouped dimensions.';
    }
    if (query.includes('topk(')) {
        return 'Shows only the highest values, filtering out the rest.';
    }
    if (query.includes('increase(')) {
        return 'Shows total increase over the time window (a count, not a rate).';
    }
    return 'Shows metric values. For counters, use rate() to see per-second values.';
}
