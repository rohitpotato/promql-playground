import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Configure QueryClient with aggressive caching for demo data
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache for 30 minutes - demo data doesn't change often
            staleTime: 30 * 60 * 1000,
            // Keep in cache for 1 hour
            gcTime: 60 * 60 * 1000,
            // Don't refetch on window focus for demo data
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect for demo data
            refetchOnReconnect: false,
            // Retry failed requests 2 times
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
    },
});

interface QueryProviderProps {
    children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

export { queryClient };

