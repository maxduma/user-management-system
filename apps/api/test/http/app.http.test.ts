import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestApp } from '../helpers/build-test-app';

describe('Application shell', () => {
  let t: Awaited<ReturnType<typeof buildTestApp>>;

  beforeEach(async () => {
    t = await buildTestApp();
  });

  afterEach(async () => {
    await t.app.close();
  });

  it('exposes liveness and readiness probes', async () => {
    const live = await t.app.inject({ method: 'GET', url: '/api/health' });
    const ready = await t.app.inject({ method: 'GET', url: '/api/health/ready' });

    expect(live.json()).toEqual({ status: 'ok' });
    expect(ready.json()).toEqual({ status: 'ok' });
  });

  it('returns a structured 404 for unknown routes', async () => {
    const response = await t.app.inject({ method: 'GET', url: '/api/does-not-exist' });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await t.app.inject({
      method: 'POST',
      url: '/api/sessions',
      headers: { 'content-type': 'application/json' },
      payload: '{not json',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('BAD_REQUEST');
  });

  it('hides internal error details behind a generic 500', async () => {
    vi.spyOn(t.db.userRepository, 'findByEmailWithCredentials').mockRejectedValueOnce(
      new Error('connection refused to 10.0.0.1'),
    );

    const response = await t.app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { email: 'a@example.com', password: 'whatever' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  it('propagates or generates a request id', async () => {
    const provided = await t.app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { 'x-request-id': 'trace-123' },
    });
    const generated = await t.app.inject({ method: 'GET', url: '/api/health' });

    expect(provided.headers['x-request-id']).toBe('trace-123');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets security headers', async () => {
    const response = await t.app.inject({ method: 'GET', url: '/api/health' });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('serves the OpenAPI document when Swagger is enabled', async () => {
    const withDocs = await buildTestApp({ SWAGGER_ENABLED: true });

    const response = await withDocs.app.inject({ method: 'GET', url: '/api/docs/json' });
    await withDocs.app.close();

    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json().paths)).toEqual(
      expect.arrayContaining(['/api/users', '/api/sessions', '/api/auth/sign-up']),
    );
  });

  it('answers CORS pre-flight requests only for configured origins', async () => {
    const withCors = await buildTestApp({ CORS_ORIGIN: ['http://allowed.test'] });
    const preflight = (origin: string) =>
      withCors.app.inject({
        method: 'OPTIONS',
        url: '/api/users',
        headers: { origin, 'access-control-request-method': 'GET' },
      });

    const allowed = await preflight('http://allowed.test');
    const denied = await preflight('http://evil.test');
    await withCors.app.close();

    expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.test');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
