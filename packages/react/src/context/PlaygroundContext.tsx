import { createContext, useMemo, type ReactNode } from 'react';
import type { PromQLPlaygroundProps, Example, LabelMappings } from '../types/sdk';
import type { Scenario } from '../types/promql';
import { builtInScenarios } from '../scenarios';

export interface PlaygroundContextValue {
    promUrl: string;
    scenarios: Scenario[];
}

export const PlaygroundContext = createContext<PlaygroundContextValue | null>(null);

// Template tokens
const METRIC_TOKEN = '{{METRIC}}';
const IDENTIFIER_TOKEN = '{{IDENTIFIER}}';
const IDENTIFIER_VALUE_TOKEN = '{{IDENTIFIER_VALUE}}';

// Standard label tokens that can be remapped
const LABEL_TOKENS: Record<string, string> = {
    status: '{{LABEL_STATUS}}',
    method: '{{LABEL_METHOD}}',
    path: '{{LABEL_PATH}}',
    instance: '{{LABEL_INSTANCE}}',
    le: '{{LABEL_LE}}',
};

// Default label names
const DEFAULT_LABELS: Record<string, string> = {
    status: 'status',
    method: 'method',
    path: 'path',
    instance: 'instance',
    le: 'le',
};

function processScenarios(
    scenarios: Scenario[],
    metricName: string,
    identifier: string,
    identifierValue: string,
    labelMappings: LabelMappings = {}
): Scenario[] {
    // Merge default labels with custom mappings
    const labels = { ...DEFAULT_LABELS };
    for (const [key, value] of Object.entries(labelMappings)) {
        if (value) {
            labels[key] = value;
        }
    }

    return scenarios.map(scenario => ({
        ...scenario,
        sampleQueries: scenario.sampleQueries.map(sq => {
            let query = sq.query
                .replace(new RegExp(METRIC_TOKEN, 'g'), metricName)
                .replace(new RegExp(IDENTIFIER_TOKEN, 'g'), identifier)
                .replace(new RegExp(IDENTIFIER_VALUE_TOKEN, 'g'), identifierValue);

            // Replace label tokens
            for (const [key, token] of Object.entries(LABEL_TOKENS)) {
                query = query.replace(new RegExp(token, 'g'), labels[key] || key);
            }

            return { ...sq, query };
        }),
    }));
}

function convertExamplesToScenarios(examples: Example[]): Scenario[] {
    return examples.map((example, idx) => ({
        id: `custom-${idx}`,
        title: example.topic,
        description: `Custom examples for ${example.topic}`,
        learningObjectives: [],
        sampleQueries: example.subtopics.map(sub => ({
            query: sub.query,
            description: sub.name,
            explanation: sub.description,
        })),
    }));
}

interface PlaygroundProviderProps extends PromQLPlaygroundProps {
    children: ReactNode;
}

export function PlaygroundProvider({
    children,
    promUrl,
    defaultMetricName = 'demo_api_request_duration_seconds',
    defaultIdentifier = 'job',
    defaultIdentifierValue = 'demo',
    labelMappings = {},
    examples = [],
    hideBuiltInExamples = false,
}: PlaygroundProviderProps) {
    const scenarios = useMemo(() => {
        // Process built-in scenarios with replacements
        const processedBuiltIn = hideBuiltInExamples
            ? []
            : processScenarios(
                builtInScenarios,
                defaultMetricName,
                defaultIdentifier,
                defaultIdentifierValue,
                labelMappings
            );

        // Convert custom examples to scenarios (no replacement needed - user provides full queries)
        const customScenarios = convertExamplesToScenarios(examples);

        return [...processedBuiltIn, ...customScenarios];
    }, [defaultMetricName, defaultIdentifier, defaultIdentifierValue, labelMappings, examples, hideBuiltInExamples]);

    const value = useMemo(() => ({
        promUrl,
        scenarios,
    }), [promUrl, scenarios]);

    return (
        <PlaygroundContext.Provider value={value}>
            {children}
        </PlaygroundContext.Provider>
    );
}
