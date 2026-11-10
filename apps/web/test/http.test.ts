import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, isApiError, onUnauthorized } from '../src/api/http';
import { sessionStorageKey } from '../src/auth/session-storage';
import { apiUrl, server } from './msw/server';

describe('apiRequest', () => {
  it('sends JSON and the session id as a bearer token', async () => {
    sessionStorageKey.set('session-123');
    let seen: { auth: string | null; type: string | null; body: unknown } | undefined;
    server.use(
      http.post(apiUrl('/things'), async ({ request }) => {
        seen = {
          auth: request.headers.get('authorization'),
          type: request.headers.get('content-type'),
          body: await request.json(),
        };
        return HttpResponse.json({ ok: true });
      }),
    );

    const result = await apiRequest<{ ok: boolean }>('/things', {
      method: 'POST',
      body: { a: 1 },
    });

    expect(result).toEqual({ ok: true });
    expect(seen).toEqual({ auth: 'Bearer session-123', type: 'application/json', body: { a: 1 } });
  });

  it('omits the Authorization header without a session', async () => {
    let auth: string | null = 'unset';
    server.use(
      http.get(apiUrl('/things'), ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json({});
      }),
    );

    await apiRequest('/things');

    expect(auth).toBeNull();
  });

  it('resolves 204 responses to undefined', async () => {
    server.use(http.delete(apiUrl('/things/1'), () => new HttpResponse(null, { status: 204 })));

    await expect(apiRequest('/things/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('converts error bodies into ApiError', async () => {
    server.use(
      http.post(apiUrl('/things'), () =>
        HttpResponse.json(
          { error: { code: 'EMAIL_TAKEN', message: 'Taken', details: [] } },
          { status: 409 },
        ),
      ),
    );

    const error = await apiRequest('/things', { method: 'POST', body: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'EMAIL_TAKEN', message: 'Taken' });
    expect(isApiError(error, 'EMAIL_TAKEN')).toBe(true);
    expect(isApiError(error, 'OTHER')).toBe(false);
  });

  it('handles non-JSON error responses', async () => {
    server.use(
      http.get(
        apiUrl('/things'),
        () => new HttpResponse('<html>Bad gateway</html>', { status: 502 }),
      ),
    );

    await expect(apiRequest('/things')).rejects.toMatchObject({
      status: 502,
      code: 'UNKNOWN_ERROR',
    });
  });

  it('reports network failures with status 0', async () => {
    server.use(http.get(apiUrl('/things'), () => HttpResponse.error()));

    await expect(apiRequest('/things')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('notifies listeners when an authenticated request gets 401', async () => {
    sessionStorageKey.set('expired');
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    server.use(
      http.get(apiUrl('/things'), () =>
        HttpResponse.json({ error: { code: 'SESSION_INVALID', message: 'x' } }, { status: 401 }),
      ),
    );

    await expect(apiRequest('/things')).rejects.toBeInstanceOf(ApiError);
    unsubscribe();
    await expect(apiRequest('/things')).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
