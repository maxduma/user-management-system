import type { SessionWithUserDto, SignInRequest, SignUpRequest } from '@ums/shared';
import { apiRequest } from './http';

export const sessionsApi = {
  signUp: (body: SignUpRequest) =>
    apiRequest<SessionWithUserDto>('/auth/sign-up', { method: 'POST', body }),
  signIn: (body: SignInRequest) =>
    apiRequest<SessionWithUserDto>('/sessions', { method: 'POST', body }),
  current: (signal?: AbortSignal) =>
    apiRequest<SessionWithUserDto>('/sessions/current', { signal }),
  terminate: (sessionId: string) =>
    apiRequest<void>(`/sessions/${sessionId}`, { method: 'DELETE' }),
};
