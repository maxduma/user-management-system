import type { ApiErrorBody, ErrorDetail } from '@ums/shared';
import { sessionStorageKey } from '../auth/session-storage';

/** Error raised for any non-2xx response (or network failure, status 0). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (error: unknown, code?: string): error is ApiError =>
  error instanceof ApiError && (code === undefined || error.code === code);

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Notified when an authenticated request is rejected with 401 (expired/revoked session). */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Thin fetch wrapper: JSON in/out, attaches the session identifier as a
 * bearer token, and normalises errors into ApiError.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const sessionId = sessionStorageKey.get();

  const headers = new Headers({ Accept: 'application/json' });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (sessionId) headers.set('Authorization', `Bearer ${sessionId}`);

  let response: Response;
  try {
    response = await fetch(new URL(`${API_BASE_URL}${path}`, window.location.origin), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Check your connection.');
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as Partial<ApiErrorBody> | null)?.error;
    if (response.status === 401 && sessionId) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? (response.statusText || 'Unexpected error'),
      error?.details,
    );
  }

  return payload as T;
}
