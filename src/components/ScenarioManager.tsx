import { scenarios } from '../scenarios';
import type { Scenario } from '../types/promql';
import '../styles/grafana-theme.css';

interface ScenarioManagerProps {
    selectedScenario: Scenario;
    onScenarioChange: (scenario: Scenario) => void;
}

export function ScenarioManager({ selectedScenario, onScenarioChange }: ScenarioManagerProps) {
    return (
        <div style={{
            background: 'var(--grafana-bg-secondary)',
            borderBottom: '1px solid var(--grafana-border)',
            display: 'flex',
            overflowX: 'auto',
            flexShrink: 0,
            gap: '0',
            scrollbarWidth: 'thin'
        }}>
            {scenarios.map((scenario, index) => {
                const isSelected = selectedScenario.id === scenario.id;

                return (
                    <button
                        key={scenario.id}
                        onClick={() => onScenarioChange(scenario)}
                        style={{
                            padding: '12px 18px',
                            background: isSelected ? 'var(--grafana-bg-panel)' : 'transparent',
                            border: 'none',
                            borderBottom: isSelected ? '2px solid var(--grafana-blue)' : '2px solid transparent',
                            color: isSelected ? 'var(--grafana-blue)' : 'var(--grafana-text-secondary)',
                            fontSize: '13px',
                            fontWeight: isSelected ? 600 : 500,
                            fontFamily: 'var(--font-sans)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            if (!isSelected) {
                                e.currentTarget.style.background = 'var(--grafana-bg-hover)';
                                e.currentTarget.style.color = 'var(--grafana-text-primary)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSelected) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--grafana-text-secondary)';
                            }
                        }}
                    >
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isSelected ? 'var(--grafana-blue)' : 'var(--grafana-text-tertiary)',
                            opacity: 0.7
                        }}>
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        {scenario.title}
                    </button>
                );
            })}
        </div>
    );
}
