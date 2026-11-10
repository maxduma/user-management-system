import type { SignInRequest, SignUpRequest, UserDto } from '@ums/shared';
import { createContext, useContext } from 'react';
import type { ApiError } from '../api/http';

/** Why there is no session: drives where the user is sent next. */
export type AnonymousReason = 'signed-out' | 'expired';

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; reason?: AnonymousReason }
  | { status: 'authenticated'; sessionId: string; user: UserDto }
  | { status: 'error'; error: ApiError | Error; retry: () => void };

export type AuthContextValue = AuthState & {
  signIn: (values: SignInRequest) => Promise<void>;
  signUp: (values: SignUpRequest) => Promise<void>;
  signOut: () => Promise<void>;
};

/** React Query key of the current session (invalidate it to refresh the user). */
export const sessionQueryKey = (sessionId: string | null) => ['session', sessionId] as const;

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within <AuthProvider>');
  return context;
}

/** Narrowing helper for components rendered behind <RequireAuth>. */
export function useAuthenticatedUser(): UserDto {
  const auth = useAuth();
  if (auth.status !== 'authenticated') throw new Error('No authenticated user');
  return auth.user;
}
