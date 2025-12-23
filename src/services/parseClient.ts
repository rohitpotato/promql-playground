// PromQL Parse Client
// Uses @prometheus-io/lezer-promql for parsing (official Prometheus parser)
// This gives us AST for query explanation without needing external API

import { parser } from '@prometheus-io/lezer-promql';
import type { SyntaxNode } from '@lezer/common';

// AST Node Types (matching PromLens format for compatibility)
export type NodeType =
  | 'aggregation'
  | 'binaryExpr'
  | 'call'
  | 'matrixSelector'
  | 'subquery'
  | 'numberLiteral'
  | 'parenExpr'
  | 'stringLiteral'
  | 'unaryExpr'
  | 'vectorSelector'
  | 'error';

export interface LabelMatcher {
  type: '=' | '!=' | '=~' | '!~';
  name: string;
  value: string;
}

export interface ParsedNode {
  type: NodeType;
  text: string;
  children?: ParsedNode[];
  // Specific fields based on type
  op?: string;
  name?: string;
  matchers?: LabelMatcher[];
  range?: number;
  offset?: number;
  grouping?: string[];
  without?: boolean;
  funcName?: string;
  args?: ParsedNode[];
  value?: string;
}

export interface ParseResult {
  success: boolean;
  ast?: ParsedNode;
  error?: string;
}

// Parse a PromQL query and return AST
export function parseQuery(query: string): ParseResult {
  try {
    const tree = parser.parse(query);
    const cursor = tree.cursor();
    
    // Check for parse errors
    let hasError = false;
    cursor.iterate((node) => {
      if (node.type.isError) {
        hasError = true;
        return false;
      }
      return true;
    });

    if (hasError) {
      return {
        success: false,
        error: 'Parse error in query',
      };
    }

    // Navigate to the actual expression
    if (!cursor.firstChild()) {
      return {
        success: false,
        error: 'Empty query',
      };
    }

    const ast = buildAST(cursor.node, query);
    return {
      success: true,
      ast,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parse error',
    };
  }
}

// Build AST from lezer syntax tree
function buildAST(node: SyntaxNode, query: string): ParsedNode {
  const nodeType = node.type.name;
  const text = query.slice(node.from, node.to);

  switch (nodeType) {
    case 'PromQL':
    case 'Expr': {
      const child = node.firstChild;
      if (child) {
        return buildAST(child, query);
      }
      return { type: 'error', text };
    }

    case 'AggregateExpr': {
      const aggOp = node.getChild('AggregateOp');
      const modifier = node.getChild('AggregateModifier');
      const body = node.getChild('FunctionCallBody');

      let grouping: string[] = [];
      let without = false;

      if (modifier) {
        without = modifier.getChild('Without') !== null;
        const labels = modifier.getChild('GroupingLabels');
        if (labels) {
          grouping = parseGroupingLabels(labels, query);
        }
      }

      const children: ParsedNode[] = [];
      if (body) {
        const child = body.firstChild;
        if (child && isExpressionNode(child)) {
          children.push(buildAST(child, query));
        }
      }

      return {
        type: 'aggregation',
        text,
        op: aggOp ? query.slice(aggOp.from, aggOp.to).toLowerCase() : 'unknown',
        grouping,
        without,
        children,
      };
    }

    case 'FunctionCall': {
      const funcId = node.getChild('FunctionIdentifier');
      const body = node.getChild('FunctionCallBody');
      
      const args: ParsedNode[] = [];
      if (body) {
        let child = body.firstChild;
        while (child) {
          if (isExpressionNode(child)) {
            args.push(buildAST(child, query));
          }
          child = child.nextSibling;
        }
      }

      return {
        type: 'call',
        text,
        funcName: funcId ? query.slice(funcId.from, funcId.to) : 'unknown',
        args,
      };
    }

    case 'BinaryExpr': {
      const children: ParsedNode[] = [];
      let op = '';
      
      let child = node.firstChild;
      while (child) {
        if (isExpressionNode(child)) {
          children.push(buildAST(child, query));
        } else if (child.type.name.includes('Op') || 
                   ['Add', 'Sub', 'Mul', 'Div', 'Mod', 'Pow', 'Eql', 'Neq', 'Lss', 'Lte', 'Gtr', 'Gte', 'And', 'Or', 'Unless'].includes(child.type.name)) {
          op = query.slice(child.from, child.to);
        }
        child = child.nextSibling;
      }

      return {
        type: 'binaryExpr',
        text,
        op,
        children,
      };
    }

    case 'VectorSelector': {
      const identifier = node.getChild('Identifier') || node.getChild('MetricIdentifier');
      const labelMatchersNode = node.getChild('LabelMatchers');

      return {
        type: 'vectorSelector',
        text,
        name: identifier ? query.slice(identifier.from, identifier.to) : '',
        matchers: labelMatchersNode ? parseLabelMatchers(labelMatchersNode, query) : [],
      };
    }

    case 'MatrixSelector': {
      const vectorSelector = node.getChild('VectorSelector');
      const durationNode = node.getChild('Duration') || node.getChild('NumberDurationLiteralInDurationContext');

      if (vectorSelector) {
        const vsAst = buildAST(vectorSelector, query);
        return {
          type: 'matrixSelector',
          text,
          name: vsAst.name,
          matchers: vsAst.matchers,
          range: durationNode ? parseDuration(query.slice(durationNode.from, durationNode.to)) : 300000,
        };
      }

      // Handle case where MatrixSelector wraps a FunctionCall (subquery-like)
      const funcCall = node.getChild('FunctionCall');
      if (funcCall) {
        return buildAST(funcCall, query);
      }

      return { type: 'matrixSelector', text };
    }

    case 'SubqueryExpr': {
      const expr = node.getChild('Expr');
      const children: ParsedNode[] = [];
      if (expr) {
        children.push(buildAST(expr, query));
      }

      return {
        type: 'subquery',
        text,
        children,
      };
    }

    case 'NumberLiteral':
    case 'NumberDurationLiteral': {
      return {
        type: 'numberLiteral',
        text,
        value: text,
      };
    }

    case 'StringLiteral': {
      return {
        type: 'stringLiteral',
        text,
        value: text.slice(1, -1), // Remove quotes
      };
    }

    case 'ParenExpr': {
      const inner = node.getChild('Expr');
      const children: ParsedNode[] = [];
      if (inner) {
        children.push(buildAST(inner, query));
      }

      return {
        type: 'parenExpr',
        text,
        children,
      };
    }

    case 'UnaryExpr': {
      // const child = node.firstChild;
      let op = '';
      const children: ParsedNode[] = [];

      let current = node.firstChild;
      while (current) {
        if (current.type.name === 'Add' || current.type.name === 'Sub') {
          op = query.slice(current.from, current.to);
        } else if (isExpressionNode(current)) {
          children.push(buildAST(current, query));
        }
        current = current.nextSibling;
      }

      return {
        type: 'unaryExpr',
        text,
        op,
        children,
      };
    }

    default: {
      // Try to handle by finding child expressions
      const children: ParsedNode[] = [];
      let child = node.firstChild;
      while (child) {
        if (isExpressionNode(child)) {
          children.push(buildAST(child, query));
        }
        child = child.nextSibling;
      }

      if (children.length === 1) {
        return children[0];
      }

      return {
        type: 'error',
        text,
        children: children.length > 0 ? children : undefined,
      };
    }
  }
}

function isExpressionNode(node: SyntaxNode): boolean {
  const exprTypes = [
    'Expr', 'AggregateExpr', 'FunctionCall', 'BinaryExpr',
    'VectorSelector', 'MatrixSelector', 'SubqueryExpr',
    'NumberLiteral', 'NumberDurationLiteral', 'StringLiteral',
    'ParenExpr', 'UnaryExpr', 'StepInvariantExpr'
  ];
  return exprTypes.includes(node.type.name);
}

function parseLabelMatchers(node: SyntaxNode, query: string): LabelMatcher[] {
  const matchers: LabelMatcher[] = [];
  const cursor = node.cursor();
  
  if (cursor.firstChild()) {
    do {
      const typeName = cursor.type.name;
      if (typeName === 'LabelMatcher' || typeName === 'UnquotedLabelMatcher' || typeName === 'QuotedLabelMatcher') {
        const matcherNode = cursor.node;
        const labelName = matcherNode.getChild('LabelName');
        const matchOp = matcherNode.getChild('MatchOp');
        const stringLiteral = matcherNode.getChild('StringLiteral');

        if (labelName && stringLiteral) {
          const name = query.slice(labelName.from, labelName.to);
          let matchType: '=' | '!=' | '=~' | '!~' = '=';
          
          if (matchOp) {
            const opText = query.slice(matchOp.from, matchOp.to);
            if (opText === '!=' || opText === '=~' || opText === '!~') {
              matchType = opText;
            }
          }
          
          const rawValue = query.slice(stringLiteral.from, stringLiteral.to);
          const value = rawValue.slice(1, -1);
          
          matchers.push({ name, value, type: matchType });
        }
      }
    } while (cursor.nextSibling());
  }
  
  return matchers;
}

function parseGroupingLabels(node: SyntaxNode, query: string): string[] {
  const labels: string[] = [];
  const cursor = node.cursor();
  
  if (cursor.firstChild()) {
    do {
      if (cursor.type.name === 'LabelName') {
        labels.push(query.slice(cursor.from, cursor.to));
      }
    } while (cursor.nextSibling());
  }
  
  return labels;
}

function parseDuration(durationStr: string): number {
  const units: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  let total = 0;
  const regex = /(\d+)(ms|s|m|h|d|w|y)/g;
  let match;

  while ((match = regex.exec(durationStr)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    total += value * (units[unit] || 0);
  }

  return total || 300000; // Default 5m
}

// Generate human-readable explanation for a parsed query
export function explainQuery(ast: ParsedNode): string {
  switch (ast.type) {
    case 'aggregation': {
      const opDescriptions: Record<string, string> = {
        sum: 'sums',
        avg: 'calculates the average of',
        min: 'finds the minimum of',
        max: 'finds the maximum of',
        count: 'counts',
        stddev: 'calculates the standard deviation of',
        stdvar: 'calculates the variance of',
        topk: 'returns the top K values of',
        bottomk: 'returns the bottom K values of',
        quantile: 'calculates a quantile of',
        group: 'groups',
      };

      const opDesc = opDescriptions[ast.op || ''] || `applies ${ast.op} to`;
      let explanation = `This expression ${opDesc} the values`;

      if (ast.grouping && ast.grouping.length > 0) {
        if (ast.without) {
          explanation += `, excluding labels: ${ast.grouping.join(', ')}`;
        } else {
          explanation += `, grouped by: ${ast.grouping.join(', ')}`;
        }
      }

      return explanation;
    }

    case 'call': {
      const funcDescriptions: Record<string, string> = {
        rate: 'calculates the per-second rate of increase',
        irate: 'calculates the instant rate of increase',
        increase: 'calculates the total increase',
        delta: 'calculates the difference between first and last value',
        histogram_quantile: 'calculates a percentile from histogram buckets',
        label_replace: 'replaces label values using regex',
        label_join: 'joins label values',
        abs: 'returns absolute values',
        ceil: 'rounds up to nearest integer',
        floor: 'rounds down to nearest integer',
        round: 'rounds to nearest integer',
        sqrt: 'calculates square root',
        exp: 'calculates exponential',
        ln: 'calculates natural logarithm',
        log2: 'calculates base-2 logarithm',
        log10: 'calculates base-10 logarithm',
        time: 'returns the current Unix timestamp',
        timestamp: 'returns the timestamp of each sample',
        absent: 'returns 1 if the series is absent',
        absent_over_time: 'returns 1 if the series has no values in the range',
        changes: 'counts value changes',
        resets: 'counts counter resets',
        deriv: 'calculates the derivative using linear regression',
        predict_linear: 'predicts future values using linear regression',
        holt_winters: 'applies Holt-Winters smoothing',
        clamp: 'clamps values between min and max',
        clamp_min: 'clamps values to a minimum',
        clamp_max: 'clamps values to a maximum',
        sort: 'sorts values ascending',
        sort_desc: 'sorts values descending',
        avg_over_time: 'calculates average over time range',
        min_over_time: 'finds minimum over time range',
        max_over_time: 'finds maximum over time range',
        sum_over_time: 'sums values over time range',
        count_over_time: 'counts samples over time range',
        stddev_over_time: 'calculates standard deviation over time range',
        stdvar_over_time: 'calculates variance over time range',
        last_over_time: 'returns last value in time range',
        present_over_time: 'returns 1 if any sample exists in range',
        quantile_over_time: 'calculates quantile over time range',
      };

      const desc = funcDescriptions[ast.funcName || ''] || `applies ${ast.funcName}()`;
      return `The ${ast.funcName}() function ${desc}`;
    }

    case 'vectorSelector': {
      let explanation = `Selects the metric "${ast.name || '(any)'}"`;
      if (ast.matchers && ast.matchers.length > 0) {
        const matcherDescs = ast.matchers.map((m) => {
          switch (m.type) {
            case '=': return `${m.name} equals "${m.value}"`;
            case '!=': return `${m.name} does not equal "${m.value}"`;
            case '=~': return `${m.name} matches regex "${m.value}"`;
            case '!~': return `${m.name} does not match regex "${m.value}"`;
          }
        });
        explanation += ` where ${matcherDescs.join(' AND ')}`;
      }
      return explanation;
    }

    case 'matrixSelector': {
      let explanation = `Selects ${ast.range ? formatDuration(ast.range) : '5 minutes'} of data for "${ast.name || '(any)'}"`;
      if (ast.matchers && ast.matchers.length > 0) {
        explanation += ` with label filters`;
      }
      return explanation;
    }

    case 'binaryExpr': {
      const opDescriptions: Record<string, string> = {
        '+': 'adds',
        '-': 'subtracts',
        '*': 'multiplies',
        '/': 'divides',
        '%': 'calculates modulo of',
        '^': 'raises to the power of',
        '==': 'checks equality of',
        '!=': 'checks inequality of',
        '>': 'compares (greater than)',
        '<': 'compares (less than)',
        '>=': 'compares (greater or equal)',
        '<=': 'compares (less or equal)',
        'and': 'performs logical AND on',
        'or': 'performs logical OR on',
        'unless': 'excludes matching series from',
      };
      
      return `Binary operation that ${opDescriptions[ast.op || ''] || ast.op} two expressions`;
    }

    case 'numberLiteral':
      return `A scalar number with value ${ast.value}`;

    case 'stringLiteral':
      return `A string value: "${ast.value}"`;

    case 'parenExpr':
      return 'Parentheses grouping a sub-expression';

    case 'unaryExpr':
      return `Unary ${ast.op === '-' ? 'negation' : 'plus'} operator`;

    case 'subquery':
      return 'A subquery that evaluates an expression over a time range';

    default:
      return 'PromQL expression';
  }
}

function formatDuration(ms: number): string {
  if (ms >= 86400000) return `${Math.floor(ms / 86400000)}d`;
  if (ms >= 3600000) return `${Math.floor(ms / 3600000)}h`;
  if (ms >= 60000) return `${Math.floor(ms / 60000)}m`;
  if (ms >= 1000) return `${Math.floor(ms / 1000)}s`;
  return `${ms}ms`;
}

