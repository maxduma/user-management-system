import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/http';

/** Client errors (4xx) are not worth retrying; network and 5xx errors are, twice. */
const shouldRetry = (failureCount: number, error: unknown) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
};

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}
