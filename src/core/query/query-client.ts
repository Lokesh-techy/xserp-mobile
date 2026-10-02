/** @author Lokesh */
import { QueryClient } from '@tanstack/react-query';

import { isApiError } from '../api/errors';

export const STALE_MS = 30_000;
export const POLL_MS = 60_000;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.kind !== 'network' && error.kind !== 'timeout') return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_MS,
      gcTime: 30 * 60_000,
      retry: shouldRetry,
      refetchOnWindowFocus: true, // driven by AppState via focusManager
      refetchOnReconnect: true, // driven by NetInfo via onlineManager
    },
    mutations: { retry: false },
  },
});
