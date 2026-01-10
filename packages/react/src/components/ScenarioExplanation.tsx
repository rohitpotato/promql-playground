import { Target, BookOpen, CheckCircle2, Code } from 'lucide-react';
import type { Scenario } from '../types/promql';
import '../styles/grafana-theme.css';

interface ScenarioExplanationProps {
  scenario: Scenario;
  currentQuery?: string;
}

export function ScenarioExplanation({ scenario, currentQuery }: ScenarioExplanationProps) {
  const selectedQuery = scenario.sampleQueries.find(sq => sq.query === currentQuery) || scenario.sampleQueries[0];

  return (
    <div className="grafana-panel">
      <div className="grafana-panel-header">
        <h3 className="grafana-panel-title">
          <BookOpen size={16} />
          {scenario.title}
        </h3>
      </div>

      <div className="grafana-panel-body">
        {/* Description */}
        <div style={{ 
          fontSize: '14px', 
          color: 'var(--grafana-text-secondary)', 
          lineHeight: '1.7',
          marginBottom: '20px'
        }}>
          {scenario.description}
        </div>

        {/* Learning Objectives */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--grafana-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Target size={14} />
            Learning Objectives
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scenario.learningObjectives.map((objective, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  background: 'var(--grafana-bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--grafana-border)'
                }}
              >
                <CheckCircle2 
                  size={16} 
                  style={{ 
                    color: 'var(--grafana-green)', 
                    flexShrink: 0,
                    marginTop: '1px'
                  }} 
                />
                <span style={{ 
                  fontSize: '13px', 
                  color: 'var(--grafana-text-primary)',
                  lineHeight: '1.5'
                }}>
                  {objective}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Query Info */}
        {selectedQuery && (
          <div style={{ 
            background: 'var(--grafana-bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--grafana-border)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--grafana-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--grafana-bg-secondary)'
            }}>
              <Code size={14} style={{ color: 'var(--grafana-blue)' }} />
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--grafana-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Current Query
              </span>
            </div>
            
            <div style={{ padding: '14px' }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 500,
                color: 'var(--grafana-text-primary)',
                marginBottom: '12px'
              }}>
                {selectedQuery.description}
              </div>
              
              <code style={{
                display: 'block',
                padding: '12px',
                background: 'var(--grafana-bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--grafana-blue)',
                wordBreak: 'break-all',
                lineHeight: '1.6',
                border: '1px solid var(--grafana-border)'
              }}>
                {selectedQuery.query}
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
