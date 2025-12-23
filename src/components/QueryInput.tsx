import { useEffect, useRef, useCallback } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor, languages, IDisposable, Position } from 'monaco-editor';
import { language as promqlLanguage, languageConfiguration as promqlConfig } from 'monaco-promql/promql/promql';
import { usePrometheusMetadata } from '../hooks/usePrometheus';
import '../styles/grafana-theme.css';

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
}

// PromQL function documentation
const functionDocs: Record<string, { signature: string; description: string; example: string }> = {
  rate: {
    signature: 'rate(v range-vector)',
    description: 'Calculates the per-second average rate of increase of the time series in the range vector. Use for counters.',
    example: 'rate(prometheus_http_requests_total[5m])',
  },
  irate: {
    signature: 'irate(v range-vector)',
    description: 'Calculates the per-second instant rate of increase. More sensitive to brief spikes than rate().',
    example: 'irate(prometheus_http_requests_total[5m])',
  },
  increase: {
    signature: 'increase(v range-vector)',
    description: 'Returns the increase in the time series over the range. Equivalent to rate() multiplied by range duration.',
    example: 'increase(prometheus_http_requests_total[1h])',
  },
  sum: {
    signature: 'sum([by|without (label_list)]) (v instant-vector)',
    description: 'Calculate sum over dimensions. Use "by" to keep specific labels, "without" to remove them.',
    example: 'sum by (handler) (rate(prometheus_http_requests_total[5m]))',
  },
  avg: {
    signature: 'avg([by|without (label_list)]) (v instant-vector)',
    description: 'Calculate the average over dimensions.',
    example: 'avg by (instance) (rate(prometheus_http_requests_total[5m]))',
  },
  max: {
    signature: 'max([by|without (label_list)]) (v instant-vector)',
    description: 'Select maximum over dimensions.',
    example: 'max by (handler) (rate(prometheus_http_requests_total[5m]))',
  },
  min: {
    signature: 'min([by|without (label_list)]) (v instant-vector)',
    description: 'Select minimum over dimensions.',
    example: 'min by (handler) (rate(prometheus_http_requests_total[5m]))',
  },
  count: {
    signature: 'count([by|without (label_list)]) (v instant-vector)',
    description: 'Count number of elements in the vector.',
    example: 'count by (handler) (prometheus_http_requests_total)',
  },
  topk: {
    signature: 'topk(k, v instant-vector)',
    description: 'Returns the k largest elements by sample value.',
    example: 'topk(5, sum by (handler) (rate(prometheus_http_requests_total[5m])))',
  },
  bottomk: {
    signature: 'bottomk(k, v instant-vector)',
    description: 'Returns the k smallest elements by sample value.',
    example: 'bottomk(5, sum by (handler) (rate(prometheus_http_requests_total[5m])))',
  },
  histogram_quantile: {
    signature: 'histogram_quantile(φ float, b instant-vector)',
    description: 'Calculates the φ-quantile (0 ≤ φ ≤ 1) from a histogram. Use with rate() of _bucket metrics.',
    example: 'histogram_quantile(0.95, rate(prometheus_http_request_duration_seconds_bucket[5m]))',
  },
  stddev: {
    signature: 'stddev([by|without (label_list)]) (v instant-vector)',
    description: 'Calculate population standard deviation over dimensions.',
    example: 'stddev by (handler) (rate(prometheus_http_requests_total[5m]))',
  },
  stdvar: {
    signature: 'stdvar([by|without (label_list)]) (v instant-vector)',
    description: 'Calculate population standard variance over dimensions.',
    example: 'stdvar by (handler) (rate(prometheus_http_requests_total[5m]))',
  },
  absent: {
    signature: 'absent(v instant-vector)',
    description: 'Returns an empty vector if the vector has any elements, or a 1-element vector with value 1 if it has no elements.',
    example: 'absent(prometheus_http_requests_total{handler="/api/health"})',
  },
  delta: {
    signature: 'delta(v range-vector)',
    description: 'Calculates the difference between the first and last value. Should only be used with gauges.',
    example: 'delta(process_resident_memory_bytes[1h])',
  },
  deriv: {
    signature: 'deriv(v range-vector)',
    description: 'Calculates the per-second derivative using simple linear regression. Should only be used with gauges.',
    example: 'deriv(process_resident_memory_bytes[5m])',
  },
  changes: {
    signature: 'changes(v range-vector)',
    description: 'Returns the number of times a value has changed within the provided time range.',
    example: 'changes(process_start_time_seconds[1h])',
  },
  resets: {
    signature: 'resets(v range-vector)',
    description: 'Returns the number of counter resets within the provided time range.',
    example: 'resets(prometheus_http_requests_total[1h])',
  },
  sort: {
    signature: 'sort(v instant-vector)',
    description: 'Returns vector elements sorted by their sample values, in ascending order.',
    example: 'sort(sum by (handler) (rate(prometheus_http_requests_total[5m])))',
  },
  sort_desc: {
    signature: 'sort_desc(v instant-vector)',
    description: 'Returns vector elements sorted by their sample values, in descending order.',
    example: 'sort_desc(sum by (handler) (rate(prometheus_http_requests_total[5m])))',
  },
  time: {
    signature: 'time()',
    description: 'Returns the number of seconds since January 1, 1970 UTC.',
    example: 'time() - process_start_time_seconds',
  },
  vector: {
    signature: 'vector(s scalar)',
    description: 'Returns the scalar as a vector with no labels.',
    example: 'vector(0)',
  },
  scalar: {
    signature: 'scalar(v instant-vector)',
    description: 'Returns the sample value of a single-element vector as a scalar.',
    example: 'scalar(sum(rate(prometheus_http_requests_total[5m])))',
  },
  avg_over_time: {
    signature: 'avg_over_time(v range-vector)',
    description: 'Returns the average value of all points in the specified interval.',
    example: 'avg_over_time(process_resident_memory_bytes[5m])',
  },
  min_over_time: {
    signature: 'min_over_time(v range-vector)',
    description: 'Returns the minimum value of all points in the specified interval.',
    example: 'min_over_time(process_resident_memory_bytes[5m])',
  },
  max_over_time: {
    signature: 'max_over_time(v range-vector)',
    description: 'Returns the maximum value of all points in the specified interval.',
    example: 'max_over_time(process_resident_memory_bytes[5m])',
  },
  sum_over_time: {
    signature: 'sum_over_time(v range-vector)',
    description: 'Returns the sum of all values in the specified interval.',
    example: 'sum_over_time(prometheus_http_requests_total[5m])',
  },
  count_over_time: {
    signature: 'count_over_time(v range-vector)',
    description: 'Returns the count of all values in the specified interval.',
    example: 'count_over_time(process_cpu_seconds_total[5m])',
  },
  quantile_over_time: {
    signature: 'quantile_over_time(φ float, v range-vector)',
    description: 'Returns the φ-quantile of the values in the specified interval.',
    example: 'quantile_over_time(0.95, process_resident_memory_bytes[5m])',
  },
  present_over_time: {
    signature: 'present_over_time(v range-vector)',
    description: 'Returns 1 if any sample is present in the specified interval.',
    example: 'present_over_time(up[5m])',
  },
  last_over_time: {
    signature: 'last_over_time(v range-vector)',
    description: 'Returns the most recent point value in the specified interval.',
    example: 'last_over_time(process_resident_memory_bytes[5m])',
  },
  clamp: {
    signature: 'clamp(v instant-vector, min scalar, max scalar)',
    description: 'Clamps the sample values to have a lower limit of min and an upper limit of max.',
    example: 'clamp(rate(prometheus_http_requests_total[5m]), 0, 100)',
  },
  clamp_max: {
    signature: 'clamp_max(v instant-vector, max scalar)',
    description: 'Clamps the sample values to have an upper limit of max.',
    example: 'clamp_max(rate(prometheus_http_requests_total[5m]), 100)',
  },
  clamp_min: {
    signature: 'clamp_min(v instant-vector, min scalar)',
    description: 'Clamps the sample values to have a lower limit of min.',
    example: 'clamp_min(rate(prometheus_http_requests_total[5m]), 0)',
  },
  abs: {
    signature: 'abs(v instant-vector)',
    description: 'Returns the input vector with all sample values converted to their absolute value.',
    example: 'abs(rate(prometheus_http_requests_total[5m]) - 100)',
  },
  ceil: {
    signature: 'ceil(v instant-vector)',
    description: 'Rounds the sample values up to the nearest integer.',
    example: 'ceil(rate(prometheus_http_requests_total[5m]))',
  },
  floor: {
    signature: 'floor(v instant-vector)',
    description: 'Rounds the sample values down to the nearest integer.',
    example: 'floor(rate(prometheus_http_requests_total[5m]))',
  },
  round: {
    signature: 'round(v instant-vector, to_nearest scalar)',
    description: 'Rounds the sample values to the nearest integer. to_nearest is optional.',
    example: 'round(rate(prometheus_http_requests_total[5m]), 0.1)',
  },
  label_replace: {
    signature: 'label_replace(v, dst_label, replacement, src_label, regex)',
    description: 'Matches the regex against the source label value and replaces the destination label.',
    example: 'label_replace(prometheus_http_requests_total, "short_handler", "$1", "handler", "/api/(.*)")',
  },
  label_join: {
    signature: 'label_join(v, dst_label, separator, src_labels...)',
    description: 'Joins all values of source labels with the separator and stores in the destination label.',
    example: 'label_join(prometheus_http_requests_total, "endpoint", "-", "job", "handler")',
  },
};

// Store for label values cache (react-query handles the caching, this is for async lookup)
const labelValuesCache = new Map<string, string[]>();

export function QueryInput({ value, onChange, onExecute }: QueryInputProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const disposablesRef = useRef<IDisposable[]>([]);

  // Use react-query for metadata (cached automatically)
  const { metrics, labels, isLoading } = usePrometheusMetadata();

  // Helper to fetch label values (uses react-query cache)
  const getLabelValues = useCallback(async (labelName: string): Promise<string[]> => {
    // Check local cache first
    if (labelValuesCache.has(labelName)) {
      return labelValuesCache.get(labelName)!;
    }

    try {
      const { prometheusClient } = await import('../services/prometheusClient');
      const values = await prometheusClient.getLabelValues(labelName);
      labelValuesCache.set(labelName, values);
      return values;
    } catch (error) {
      console.error(`Failed to fetch values for label ${labelName}:`, error);
      return [];
    }
  }, []);

  // Clean up disposables on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => d.dispose());
    };
  }, []);

  const getCompletionContext = useCallback((textBefore: string): {
    type: 'metric' | 'label' | 'label_value' | 'function' | 'aggregation_label' | 'operator' | 'keyword' | 'unknown';
    currentMetric?: string;
    currentLabel?: string;
    insideBraces: boolean;
    insideParens: boolean;
  } => {
    // Check if we're inside braces (label selector)
    const lastOpenBrace = textBefore.lastIndexOf('{');
    const lastCloseBrace = textBefore.lastIndexOf('}');
    const insideBraces = lastOpenBrace > lastCloseBrace;

    // Count parentheses depth
    let parenDepth = 0;
    for (const char of textBefore) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
    }
    const insideParens = parenDepth > 0;

    if (insideBraces) {
      const textInsideBraces = textBefore.slice(lastOpenBrace + 1);

      // Extract metric name
      const beforeBraces = textBefore.slice(0, lastOpenBrace);
      const metricMatch = beforeBraces.match(/(\w+)\s*$/);
      const currentMetric = metricMatch ? metricMatch[1] : undefined;

      // Check if we're after an operator (=, !=, =~, !~)
      const afterOperator = textInsideBraces.match(/(\w+)\s*(=~|!~|!=|=)\s*"?([^"]*)?$/);
      if (afterOperator) {
        return {
          type: 'label_value',
          currentMetric,
          currentLabel: afterOperator[1],
          insideBraces,
          insideParens,
        };
      }

      // Check if we're typing a label name
      const afterCommaOrStart = textInsideBraces.match(/(?:^|,)\s*(\w*)$/);
      if (afterCommaOrStart) {
        return {
          type: 'label',
          currentMetric,
          insideBraces,
          insideParens,
        };
      }
    }

    // Check if we're after 'by' or 'without' (aggregation grouping)
    const afterGrouping = textBefore.match(/\b(by|without)\s*\(\s*(\w*)$/i);
    if (afterGrouping) {
      return { type: 'aggregation_label', insideBraces: false, insideParens: true };
    }

    // Check if we're inside aggregation grouping parentheses
    const insideGrouping = textBefore.match(/\b(by|without)\s*\([^)]*$/i);
    if (insideGrouping) {
      return { type: 'aggregation_label', insideBraces: false, insideParens: true };
    }

    // Check if we're at the start of expression or inside function call
    const isStartOfExpression = /(?:^|\(|,)\s*\w*$/.test(textBefore);
    if (isStartOfExpression) {
      return { type: 'metric', insideBraces: false, insideParens };
    }

    // Check if we're typing something after a space (likely a keyword)
    if (/\s+\w*$/.test(textBefore)) {
      return { type: 'keyword', insideBraces: false, insideParens };
    }

    // Default to metric/function completion
    if (/\w+$/.test(textBefore)) {
      return { type: 'metric', insideBraces: false, insideParens };
    }

    return { type: 'unknown', insideBraces: false, insideParens };
  }, []);

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Clean up existing disposables
    disposablesRef.current.forEach(d => d.dispose());
    disposablesRef.current = [];

    // Register PromQL language
    monaco.languages.register({ id: 'promql' });

    // Use official monaco-promql language definition
    const tokensDisposable = monaco.languages.setMonarchTokensProvider('promql', promqlLanguage);
    disposablesRef.current.push(tokensDisposable);

    // Set language configuration
    const configDisposable = monaco.languages.setLanguageConfiguration('promql', promqlConfig);
    disposablesRef.current.push(configDisposable);

    // Define minimal dark theme
    monaco.editor.defineTheme('promql-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
        { token: 'string', foreground: '22c55e' },
        { token: 'string.escape', foreground: 'f97316' },
        { token: 'number', foreground: '06b6d4' },
        { token: 'number.duration', foreground: '22c55e' },
        { token: 'keyword', foreground: 'a855f7', fontStyle: 'bold' },
        { token: 'keyword.operator', foreground: 'f97316' },
        { token: 'function', foreground: '3b82f6' },
        { token: 'variable.metric', foreground: 'e5e5e5' },
        { token: 'identifier', foreground: 'e5e5e5' },
        { token: 'operator.matcher', foreground: 'f97316' },
        { token: 'operator.arithmetic', foreground: 'f97316' },
        { token: 'operator.comparison', foreground: 'f97316' },
        { token: 'delimiter.brace', foreground: 'eab308' },
        { token: 'delimiter.bracket', foreground: 'a855f7' },
        { token: 'delimiter.parenthesis', foreground: 'a3a3a3' },
        { token: 'delimiter.comma', foreground: 'a3a3a3' },
      ],
      colors: {
        'editor.background': '#0f0f0f',
        'editor.foreground': '#e5e5e5',
        'editorCursor.foreground': '#3b82f6',
        'editor.lineHighlightBackground': '#1c1c1c',
        'editor.selectionBackground': '#264f78',
        'editorSuggestWidget.background': '#161616',
        'editorSuggestWidget.border': '#262626',
        'editorSuggestWidget.foreground': '#e5e5e5',
        'editorSuggestWidget.selectedBackground': '#1c1c1c',
        'editorSuggestWidget.highlightForeground': '#3b82f6',
      },
    });

    monaco.editor.setTheme('promql-dark');

    // Focus the editor
    editor.focus();

    // Add keyboard shortcut for execution
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onExecute) onExecute();
    });
  }, [onExecute]);

  // Set up completion provider after metrics/labels are loaded
  useEffect(() => {
    if (!monacoRef.current || metrics.length === 0) return;

    const monaco = monacoRef.current;

    // Remove old completion provider - we tag it with a custom property
    const existingCompletion = disposablesRef.current.find(
      d => (d as IDisposable & { __isCompletion?: boolean }).__isCompletion
    );
    if (existingCompletion) {
      existingCompletion.dispose();
      disposablesRef.current = disposablesRef.current.filter(d => d !== existingCompletion);
    }

    // Configure autocomplete provider with async support
    const completionDisposable = monaco.languages.registerCompletionItemProvider('promql', {
      triggerCharacters: ['{', '(', ',', '=', '"', ' '],
      provideCompletionItems: async (model: editor.ITextModel, position: Position) => {
        const textBefore = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const context = getCompletionContext(textBefore);
        const suggestions: languages.CompletionItem[] = [];

        switch (context.type) {
          case 'metric': {
            // Add metrics from Prometheus (prioritized)
            for (const metric of metrics) {
              suggestions.push({
                label: metric,
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: metric,
                detail: 'metric',
                range,
                sortText: '0' + metric,
              });
            }

            // Add functions (lower priority when inside parens)
            const functions = Object.keys(functionDocs);
            for (const fn of functions) {
              const doc = functionDocs[fn];
              suggestions.push({
                label: fn,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: context.insideParens ? fn + '(' : fn + '($0)',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: doc.signature,
                documentation: {
                  value: `**${doc.signature}**\n\n${doc.description}\n\n**Example:**\n\`\`\`\n${doc.example}\n\`\`\``,
                },
                range,
                sortText: '1' + fn,
              });
            }
            break;
          }

          case 'aggregation_label': {
            // After 'by' or 'without' - suggest labels only
            for (const label of labels) {
              if (label !== '__name__') {
                suggestions.push({
                  label,
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: label,
                  detail: 'label',
                  range,
                  sortText: '0' + label,
                });
              }
            }
            break;
          }

          case 'label': {
            // Suggest labels
            for (const label of labels) {
              if (label !== '__name__') {
                suggestions.push({
                  label,
                  kind: monaco.languages.CompletionItemKind.Property,
                  insertText: label + '="$0"',
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  range,
                  sortText: '0' + label,
                });
              }
            }

            // Add label matcher operators
            for (const op of ['=', '!=', '=~', '!~']) {
              suggestions.push({
                label: op,
                kind: monaco.languages.CompletionItemKind.Operator,
                insertText: op,
                documentation:
                  op === '=' ? 'Exact match' :
                    op === '!=' ? 'Not equal' :
                      op === '=~' ? 'Regex match' :
                        'Negative regex match',
                range,
                sortText: '9' + op,
              });
            }
            break;
          }

          case 'label_value': {
            // Calculate proper range for value insertion
            const lineText = model.getLineContent(position.lineNumber);
            const textBeforeOnLine = lineText.substring(0, position.column - 1);
            const lastQuote = textBeforeOnLine.lastIndexOf('"');
            const isInsideQuotes = lastQuote >= 0 &&
              textBeforeOnLine.substring(lastQuote + 1).indexOf('"') === -1;

            let valueRange = range;
            if (isInsideQuotes) {
              valueRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: lastQuote + 2,
                endColumn: position.column,
              };
            }

            // Fetch values for the current label
            if (context.currentLabel) {
              const values = await getLabelValues(context.currentLabel);
              for (const val of values) {
                suggestions.push({
                  label: val,
                  kind: monaco.languages.CompletionItemKind.Value,
                  insertText: isInsideQuotes ? val : `"${val}"`,
                  range: valueRange,
                  sortText: '0' + val,
                });
              }
            }

            // Add regex pattern suggestions for common labels
            if (context.currentLabel === 'code' || context.currentLabel === 'status_code') {
              suggestions.push(
                {
                  label: '2.. (2xx success)',
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: isInsideQuotes ? '2..' : '"2.."',
                  documentation: 'Match all 2xx success status codes',
                  range: valueRange,
                  sortText: '1regex',
                },
                {
                  label: '4.. (4xx client errors)',
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: isInsideQuotes ? '4..' : '"4.."',
                  documentation: 'Match all 4xx client error status codes',
                  range: valueRange,
                  sortText: '1regex',
                },
                {
                  label: '5.. (5xx server errors)',
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: isInsideQuotes ? '5..' : '"5.."',
                  documentation: 'Match all 5xx server error status codes',
                  range: valueRange,
                  sortText: '1regex',
                }
              );
            }
            break;
          }

          case 'operator':
          case 'keyword': {
            // Add keywords
            const keywords = [
              { kw: 'by', desc: 'Group aggregation by specified labels' },
              { kw: 'without', desc: 'Group aggregation without specified labels' },
              { kw: 'on', desc: 'Match on specified labels for binary operations' },
              { kw: 'ignoring', desc: 'Ignore specified labels for binary operations' },
              { kw: 'group_left', desc: 'Many-to-one matching with left side labels' },
              { kw: 'group_right', desc: 'Many-to-one matching with right side labels' },
              { kw: 'offset', desc: 'Shift time range back by specified duration' },
              { kw: 'bool', desc: 'Return 0/1 instead of filtering for comparison operators' },
            ];
            for (const { kw, desc } of keywords) {
              suggestions.push({
                label: kw,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: kw === 'by' || kw === 'without' ? kw + ' ($0)' : kw + ' ',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: desc,
                range,
                sortText: '0' + kw,
              });
            }

            // Add time durations
            const durations = [
              { dur: '30s', desc: '30 seconds' },
              { dur: '1m', desc: '1 minute' },
              { dur: '5m', desc: '5 minutes (recommended)' },
              { dur: '15m', desc: '15 minutes' },
              { dur: '30m', desc: '30 minutes' },
              { dur: '1h', desc: '1 hour' },
              { dur: '6h', desc: '6 hours' },
              { dur: '12h', desc: '12 hours' },
              { dur: '24h', desc: '24 hours / 1 day' },
              { dur: '7d', desc: '7 days / 1 week' },
            ];
            for (const { dur, desc } of durations) {
              suggestions.push({
                label: dur,
                kind: monaco.languages.CompletionItemKind.Unit,
                insertText: dur,
                documentation: desc,
                range,
                sortText: '5' + dur,
              });
            }
            break;
          }
        }

        return { suggestions };
      },
    });

    // Tag the disposable so we can find and replace it later
    (completionDisposable as IDisposable & { __isCompletion?: boolean }).__isCompletion = true;
    disposablesRef.current.push(completionDisposable);

    // Add hover provider
    const hoverDisposable = monaco.languages.registerHoverProvider('promql', {
      provideHover: (model: editor.ITextModel, position: Position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const text = word.word;

        // Check if it's a function
        if (functionDocs[text]) {
          const doc = functionDocs[text];
          return {
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            },
            contents: [
              { value: `**${text}**` },
              { value: `\`${doc.signature}\`` },
              { value: doc.description },
              { value: `**Example:**\n\`\`\`promql\n${doc.example}\n\`\`\`` },
            ],
          };
        }

        return null;
      },
    });
    disposablesRef.current.push(hoverDisposable);

  }, [metrics, labels, getCompletionContext, getLabelValues]);

  return (
    <div
      style={{
        height: '100%',
        minHeight: '100px',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
      <Editor
        height="100%"
        language="promql"
        theme="promql-dark"
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
          fontLigatures: true,
          lineNumbers: 'off',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          tabSize: 2,
          quickSuggestionsDelay: 50,
          suggestSelection: 'first',
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          suggest: {
            showKeywords: true,
            showFunctions: true,
            showVariables: true,
            showSnippets: true,
            showWords: false,
            filterGraceful: true,
            preview: true,
            previewMode: 'subwordSmart',
            insertMode: 'replace',
            snippetsPreventQuickSuggestions: false,
          },
          suggestFontSize: 13,
          suggestLineHeight: 22,
          padding: { top: 12, bottom: 12 },
          lineDecorationsWidth: 8,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          right: '10px',
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {isLoading && (
          <span style={{ color: 'var(--accent-orange)' }}>Loading...</span>
        )}
        <span>⌘/Ctrl+Enter to run</span>
      </div>
    </div>
  );
}
