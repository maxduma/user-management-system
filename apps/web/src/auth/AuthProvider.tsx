import type { SessionWithUserDto, SignInRequest, SignUpRequest } from '@ums/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, onUnauthorized } from '../api/http';
import { sessionsApi } from '../api/sessions.api';
import {
  type AnonymousReason,
  AuthContext,
  type AuthContextValue,
  sessionQueryKey,
} from './auth-context';
import { sessionStorageKey } from './session-storage';

/**
 * Owns the session lifecycle. The session id returned by sign-in/sign-up is
 * persisted and sent with every request; on start-up it is validated with
 * GET /sessions/current, and any 401 afterwards clears it.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(() => sessionStorageKey.get());
  const [anonymousReason, setAnonymousReason] = useState<AnonymousReason>();

  const sessionQuery = useQuery({
    queryKey: sessionQueryKey(sessionId),
    queryFn: ({ signal }) => sessionsApi.current(signal),
    enabled: sessionId !== null,
    staleTime: Infinity,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 2,
  });

  const clearSession = useCallback(
    (reason: AnonymousReason) => {
      sessionStorageKey.clear();
      setAnonymousReason(reason);
      setSessionId(null);
      // Never leak cached data from one session into the next.
      queryClient.removeQueries();
    },
    [queryClient],
  );

  // Any authenticated request rejected with 401 means the session is gone.
  useEffect(() => onUnauthorized(() => clearSession('expired')), [clearSession]);

  const establishSession = useCallback(
    (result: SessionWithUserDto) => {
      sessionStorageKey.set(result.id);
      queryClient.setQueryData(sessionQueryKey(result.id), result);
      setAnonymousReason(undefined);
      setSessionId(result.id);
    },
    [queryClient],
  );

  const signIn = useCallback(
    async (values: SignInRequest) => establishSession(await sessionsApi.signIn(values)),
    [establishSession],
  );

  const signUp = useCallback(
    async (values: SignUpRequest) => establishSession(await sessionsApi.signUp(values)),
    [establishSession],
  );

  const signOut = useCallback(async () => {
    if (sessionId) {
      // Best effort: the local session is cleared even if the API is unreachable.
      await sessionsApi.terminate(sessionId).catch(() => undefined);
    }
    clearSession('signed-out');
  }, [sessionId, clearSession]);

  const { data, error, refetch } = sessionQuery;

  const value = useMemo<AuthContextValue>(() => {
    const actions = { signIn, signUp, signOut };
    if (!sessionId) return { status: 'anonymous', reason: anonymousReason, ...actions };
    if (data) return { status: 'authenticated', sessionId, user: data.user, ...actions };
    if (error) return { status: 'error', error, retry: () => void refetch(), ...actions };
    return { status: 'loading', ...actions };
  }, [sessionId, anonymousReason, data, error, refetch, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
