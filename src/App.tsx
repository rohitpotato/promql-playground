import { useState, useCallback, useEffect } from 'react';
import { Play, BarChart3, BookOpen, Code2, Lightbulb, Table2, FileText, ChevronLeft, ChevronRight, Globe, AlertCircle, Github } from 'lucide-react';
import { ScenarioManager } from './components/ScenarioManager';
import { QueryInput } from './components/QueryInput';
import { TimeRangePicker, type TimeRange } from './components/TimeRangePicker';
import { TimeseriesGraph } from './components/visualizations/TimeseriesGraph';
import { DataTable } from './components/visualizations/DataTable';
import { QueryExplanation } from './components/QueryExplanation';
import { ScenarioExplanation } from './components/ScenarioExplanation';
import { ConceptsSection } from './components/ConceptsSection';
import { FunctionsSection } from './components/FunctionsSection';
import { scenarios } from './scenarios';
import { useExecuteQuery } from './hooks/usePrometheus';
import type { PrometheusMetricResult } from './services/prometheusClient';
import type { Scenario } from './types/promql';
import './styles/grafana-theme.css';
import './App.css';
import { Analytics } from "@vercel/analytics/react"

function App() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(scenarios[0]);
  const [query, setQuery] = useState<string>(selectedScenario.sampleQueries[0]?.query || '');
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const end = Math.floor(Date.now() / 1000);
    return { start: end - 3600, end };
  });
  const [activeResultTab, setActiveResultTab] = useState<'graph' | 'table' | 'explain'>('graph');
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'concepts' | 'functions'>('concepts');
  const [selectedSampleQuery, setSelectedSampleQuery] = useState(0);

  const executeQuery = useExecuteQuery();

  const handleScenarioChange = useCallback((scenario: Scenario) => {
    setSelectedScenario(scenario);
    if (scenario.sampleQueries.length > 0) {
      setQuery(scenario.sampleQueries[0].query);
      setSelectedSampleQuery(0);
    }
    executeQuery.reset();
  }, [executeQuery]);

  const handleExecute = useCallback(async () => {
    if (!query.trim() || executeQuery.isPending) return;
    executeQuery.mutate({ query, timeRange });
    setActiveResultTab('graph');
  }, [query, timeRange, executeQuery]);

  const handleSampleQuerySelect = (index: number) => {
    setSelectedSampleQuery(index);
    setQuery(selectedScenario.sampleQueries[index].query);
  };

  useEffect(() => {
    if (query && !executeQuery.data && !executeQuery.isPending) {
      executeQuery.mutate({ query, timeRange });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getResultData = (): PrometheusMetricResult[] => {
    if (executeQuery.data?.status === 'success' && executeQuery.data.data?.result) {
      return executeQuery.data.data.result;
    }
    return [];
  };

  const resultData = getResultData();
  const hasData = resultData.length > 0;
  const isMatrixResult = executeQuery.data?.data?.resultType === 'matrix';
  const queryResult = executeQuery.data;
  const isExecuting = executeQuery.isPending;

  return (
    <>
      <div className="app-container" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* Header */}
        <header style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '48px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{
              padding: '0 14px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              borderRight: '1px solid var(--border)',
            }}>
              <BarChart3 size={20} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                PromQL Playground
              </h1>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                background: 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                Learn by doing
              </span>
              <a
                href="https://github.com/rohitpotato/promql-playground"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '4px',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="View on GitHub"
              >
                <Github size={16} />
              </a>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--accent-green)',
            }}>
              <Globe size={12} />
              <span>demo.promlabs.com</span>
              <span style={{
                width: '6px',
                height: '6px',
                background: 'var(--accent-green)',
                borderRadius: '50%',
              }} />
            </div>
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
          </div>
        </header>

        {/* Main Layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Sidebar */}
          {showLeftSidebar && (
            <div style={{
              width: '260px',
              flexShrink: 0,
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--border)',
            }}>
              <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--border)',
              }}>
                <button
                  className={leftSidebarTab === 'concepts' ? 'grafana-tab grafana-tab-active' : 'grafana-tab'}
                  onClick={() => setLeftSidebarTab('concepts')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <BookOpen size={14} />
                  <span>Concepts</span>
                </button>
                <button
                  className={leftSidebarTab === 'functions' ? 'grafana-tab grafana-tab-active' : 'grafana-tab'}
                  onClick={() => setLeftSidebarTab('functions')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Code2 size={14} />
                  <span>Functions</span>
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {leftSidebarTab === 'concepts' ? <ConceptsSection /> : <FunctionsSection />}
              </div>
              <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="grafana-button grafana-button-ghost"
                  onClick={() => setShowLeftSidebar(false)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <ChevronLeft size={14} />
                  <span>Collapse</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Scenario Tabs */}
            <ScenarioManager
              selectedScenario={selectedScenario}
              onScenarioChange={handleScenarioChange}
            />

            {/* Query Section */}
            <div style={{
              display: 'flex',
              height: '200px',
              flexShrink: 0,
              background: 'var(--bg-panel)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!showLeftSidebar && (
                      <button
                        className="grafana-button grafana-button-ghost"
                        onClick={() => setShowLeftSidebar(true)}
                        style={{ padding: '6px' }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}
                    <Code2 size={14} style={{ color: 'var(--accent-blue)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      Query
                    </span>
                  </div>
                  <button
                    className="grafana-button grafana-button-primary"
                    onClick={handleExecute}
                    disabled={isExecuting || !query.trim()}
                  >
                    {isExecuting ? (
                      <>
                        <div className="grafana-spinner" style={{ width: '14px', height: '14px' }} />
                        <span>Running...</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} />
                        <span>Run</span>
                      </>
                    )}
                  </button>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <QueryInput value={query} onChange={setQuery} onExecute={handleExecute} />
                </div>
              </div>

              {/* Sample Queries */}
              <div style={{
                width: '260px',
                borderLeft: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-secondary)',
              }}>
                <div style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <Lightbulb size={14} style={{ color: 'var(--accent-orange)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Examples
                  </span>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '6px' }}>
                  {selectedScenario.sampleQueries.map((sq, index) => (
                    <button
                      key={index}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        fontSize: '12px',
                        padding: '8px 10px',
                        marginBottom: '2px',
                        border: 'none',
                        background: selectedSampleQuery === index ? 'var(--accent-blue-bg)' : 'transparent',
                        color: selectedSampleQuery === index ? 'var(--accent-blue)' : 'var(--text-primary)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSampleQuerySelect(index)}
                    >
                      <div style={{ fontWeight: 500, marginBottom: '2px' }}>{sq.description}</div>
                      <code style={{
                        fontSize: '10px',
                        color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-mono)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {sq.query}
                      </code>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-panel)',
              overflow: 'hidden',
              minHeight: 0,
            }}>
              <div className="grafana-tabs">
                <button
                  className={activeResultTab === 'graph' ? 'grafana-tab grafana-tab-active' : 'grafana-tab'}
                  onClick={() => setActiveResultTab('graph')}
                >
                  <BarChart3 size={14} />
                  <span>Graph</span>
                  {hasData && (
                    <span style={{
                      background: 'var(--accent-green-bg)',
                      color: 'var(--accent-green)',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 600,
                      marginLeft: '4px',
                    }}>
                      {resultData.length}
                    </span>
                  )}
                </button>
                <button
                  className={activeResultTab === 'table' ? 'grafana-tab grafana-tab-active' : 'grafana-tab'}
                  onClick={() => setActiveResultTab('table')}
                >
                  <Table2 size={14} />
                  <span>Table</span>
                </button>
                <button
                  className={activeResultTab === 'explain' ? 'grafana-tab grafana-tab-active' : 'grafana-tab'}
                  onClick={() => setActiveResultTab('explain')}
                >
                  <FileText size={14} />
                  <span>Explain</span>
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {activeResultTab === 'graph' && (
                  <div style={{ height: '100%' }}>
                    {isExecuting ? (
                      <div className="grafana-empty" style={{ height: '100%' }}>
                        <div className="grafana-spinner" style={{ width: '28px', height: '28px' }} />
                        <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          Querying...
                        </div>
                      </div>
                    ) : hasData && isMatrixResult ? (
                      <TimeseriesGraph data={resultData} height={300} />
                    ) : hasData && !isMatrixResult ? (
                      <div style={{ padding: '16px' }}>
                        <div className="grafana-alert grafana-alert-info" style={{ marginBottom: '16px' }}>
                          <AlertCircle size={16} />
                          <div>
                            <strong>Instant vector result</strong>
                            <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '12px' }}>
                              This query returned an instant vector. Use a range selector with rate() for time series.
                            </p>
                          </div>
                        </div>
                        <DataTable data={resultData} />
                      </div>
                    ) : queryResult?.status === 'error' ? (
                      <div style={{ padding: '16px' }}>
                        <div className="grafana-alert grafana-alert-danger">
                          <AlertCircle size={16} />
                          <div>
                            <strong>Error</strong>
                            <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                              {queryResult.error}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : queryResult?.status === 'success' && !hasData ? (
                      <div className="grafana-empty" style={{ height: '100%' }}>
                        <BarChart3 size={40} className="grafana-empty-icon" />
                        <div className="grafana-empty-title">No data</div>
                        <div className="grafana-empty-description">
                          Query returned empty. Try adjusting the time range or check the metric name.
                        </div>
                      </div>
                    ) : (
                      <div className="grafana-empty" style={{ height: '100%' }}>
                        <BarChart3 size={40} className="grafana-empty-icon" />
                        <div className="grafana-empty-title">Ready</div>
                        <div className="grafana-empty-description">
                          Run a query to visualize metrics. Select an example from the panel.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeResultTab === 'table' && (
                  <div style={{ height: '100%' }}>
                    {isExecuting ? (
                      <div className="grafana-empty" style={{ height: '100%' }}>
                        <div className="grafana-spinner" style={{ width: '28px', height: '28px' }} />
                      </div>
                    ) : hasData ? (
                      <DataTable data={resultData} />
                    ) : (
                      <div className="grafana-empty" style={{ height: '100%' }}>
                        <Table2 size={40} className="grafana-empty-icon" />
                        <div className="grafana-empty-title">No data</div>
                        <div className="grafana-empty-description">
                          Run a query to see results in table format.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeResultTab === 'explain' && (
                  <div style={{ padding: '16px', overflow: 'auto' }}>
                    <ScenarioExplanation scenario={selectedScenario} currentQuery={query} />
                    <QueryExplanation query={query} scenario={selectedScenario} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Analytics />
    </>
  );
}

export default App;
