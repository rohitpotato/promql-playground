import { useState, useRef, useEffect } from 'react';
import { format, subHours, subMinutes, subDays } from 'date-fns';
import { Clock, ChevronDown } from 'lucide-react';
import '../styles/grafana-theme.css';

export interface TimeRange {
    start: number;
    end: number;
}

interface TimeRangePickerProps {
    value: TimeRange;
    onChange: (range: TimeRange) => void;
}

const quickRanges = [
    { label: 'Last 5 minutes', getRange: () => ({ start: Math.floor(subMinutes(new Date(), 5).getTime() / 1000), end: Math.floor(Date.now() / 1000) }) },
    { label: 'Last 15 minutes', getRange: () => ({ start: Math.floor(subMinutes(new Date(), 15).getTime() / 1000), end: Math.floor(Date.now() / 1000) }) },
    { label: 'Last 30 minutes', getRange: () => ({ start: Math.floor(subMinutes(new Date(), 30).getTime() / 1000), end: Math.floor(Date.now() / 1000) }) },
    { label: 'Last 1 hour', getRange: () => ({ start: Math.floor(subHours(new Date(), 1).getTime() / 1000), end: Math.floor(Date.now() / 1000) }) },
    { label: 'Last 3 hours', getRange: () => ({ start: Math.floor(subHours(new Date(), 3).getTime() / 1000), end: Math.floor(Date.now() / 1000) }) },
    { label: 'Last 6 hours', getRange: () => ({ start: Math.floor(subHours(new Date(), 6).getTime() / 1000), end: Math.floor(Date.now() / 1000) }) },
    { label: 'Last 12 hours', getRange: () => ({ start: Math.floor(subHours(new Date(), 12).getTime() / 1000), end: Math.floor(Date.now() / 1000) }) },
    { label: 'Last 24 hours', getRange: () => ({ start: Math.floor(subHours(new Date(), 24).getTime() / 1000), end: Math.floor(Date.now() / 1000) }) },
    { label: 'Last 7 days', getRange: () => ({ start: Math.floor(subDays(new Date(), 7).getTime() / 1000), end: Math.floor(Date.now() / 1000) }) },
];

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    const startDate = new Date(value.start * 1000);
    const endDate = new Date(value.end * 1000);
    const duration = value.end - value.start;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDuration = (seconds: number): string => {
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
        return `${Math.round(seconds / 86400)}d`;
    };

    return (
        <div style={{ position: 'relative' }} ref={pickerRef}>
            <button
                onClick={() => setShowPicker(!showPicker)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-sans)',
                }}
            >
                <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {format(startDate, 'HH:mm')}
                </span>
                <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {format(endDate, 'HH:mm')}
                </span>
                <span style={{
                    background: 'var(--accent-blue-bg)',
                    color: 'var(--accent-blue)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600
                }}>
                    {formatDuration(duration)}
                </span>
                <ChevronDown size={14} style={{
                    color: 'var(--text-tertiary)',
                    transform: showPicker ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease'
                }} />
            </button>

            {showPicker && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '6px',
                        zIndex: 1000,
                        minWidth: '180px',
                        boxShadow: 'var(--shadow-lg)',
                    }}
                >
                    <div style={{
                        marginBottom: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--text-tertiary)',
                    }}>
                        Quick ranges
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {quickRanges.map((range) => {
                            const rangeValue = range.getRange();
                            const isSelected = (rangeValue.end - rangeValue.start) === duration;

                            return (
                                <button
                                    key={range.label}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '8px 10px',
                                        border: 'none',
                                        background: isSelected ? 'var(--accent-blue-bg)' : 'transparent',
                                        color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        fontFamily: 'var(--font-sans)',
                                        transition: 'background 0.1s ease',
                                    }}
                                    onClick={() => {
                                        onChange(range.getRange());
                                        setShowPicker(false);
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = 'var(--bg-hover)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    {range.label}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{
                        marginTop: '6px',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border)',
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                        padding: '6px 8px',
                        textAlign: 'center'
                    }}>
                        {format(startDate, 'MMM dd, HH:mm:ss')} — {format(endDate, 'MMM dd, HH:mm:ss')}
                    </div>
                </div>
            )}
        </div>
    );
}
