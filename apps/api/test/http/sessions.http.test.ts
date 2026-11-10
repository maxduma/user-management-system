import type { SessionWithUserDto } from '@ums/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/build-test-app';
import { newUserInput } from '../helpers/test-context';

describe('Auth & session endpoints', () => {
  let t: Awaited<ReturnType<typeof buildTestApp>>;

  beforeEach(async () => {
    t = await buildTestApp();
  });

  afterEach(async () => {
    await t.app.close();
  });

  describe('POST /api/auth/sign-up', () => {
    it('registers the user and returns the new session id', async () => {
      const response = await t.app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: newUserInput({ firstName: 'Ada', email: '  ADA@Example.com ' }),
      });

      expect(response.statusCode).toBe(201);
      const body = response.json<SessionWithUserDto>();
      expect(body).toMatchObject({
        id: expect.any(String),
        terminatedAt: null,
        user: { firstName: 'Ada', email: 'ada@example.com', status: 'active', loginsCount: 1 },
      });
      expect(body.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(body)).not.toContain('secret-password');
    });

    it('returns 409 for an existing e-mail', async () => {
      await t.signUp({ email: 'taken@example.com' });

      const response = await t.app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: newUserInput({ email: 'taken@example.com' }),
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: { code: 'EMAIL_TAKEN', message: expect.any(String) },
      });
    });

    it('returns 400 with field details for invalid payloads', async () => {
      const response = await t.app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: { firstName: '', lastName: 'X', email: 'nope', password: 'short' },
      });

      expect(response.statusCode).toBe(400);
      const { error } = response.json();
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details.map((detail: { path: string }) => detail.path)).toEqual(
        expect.arrayContaining(['body.firstName', 'body.email', 'body.password']),
      );
    });
  });

  describe('POST /api/sessions (sign in)', () => {
    it('creates a session for valid credentials', async () => {
      const input = newUserInput();
      const signUp = await t.signUp(input);

      const response = await t.app.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { email: input.email, password: input.password },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json<SessionWithUserDto>();
      expect(body.id).not.toBe(signUp.id);
      expect(body.user.loginsCount).toBe(2);
    });

    it('returns 401 for invalid credentials', async () => {
      const response = await t.app.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { email: 'nobody@example.com', password: 'whatever' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 403 for inactive users', async () => {
      const input = newUserInput();
      const admin = await t.signUp();
      const user = await t.signUp(input);
      await t.app.inject({
        method: 'PATCH',
        url: `/api/users/${user.userId}`,
        headers: admin.headers,
        payload: { status: 'inactive' },
      });

      const response = await t.app.inject({
        method: 'POST',
        url: '/api/sessions',
        payload: { email: input.email, password: input.password },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe('USER_INACTIVE');
    });

    it('rate-limits credential endpoints', async () => {
      await t.app.close();
      t = await buildTestApp({ AUTH_RATE_LIMIT_MAX: 2 });
      const attempt = () =>
        t.app.inject({
          method: 'POST',
          url: '/api/sessions',
          payload: { email: 'x@example.com', password: 'x' },
        });

      await attempt();
      await attempt();
      const response = await attempt();

      expect(response.statusCode).toBe(429);
      expect(response.json().error.code).toBe('RATE_LIMITED');
    });
  });

  describe('GET /api/sessions/current', () => {
    it('returns the session identified by the bearer token', async () => {
      const signUp = await t.signUp({ firstName: 'Grace' });

      const response = await t.app.inject({
        method: 'GET',
        url: '/api/sessions/current',
        headers: signUp.headers,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: signUp.id, user: { firstName: 'Grace' } });
    });

    it.each([
      ['no header', undefined, 'UNAUTHORIZED'],
      ['a non-bearer scheme', 'Basic abc', 'UNAUTHORIZED'],
      ['a malformed id', 'Bearer not-a-uuid', 'SESSION_INVALID'],
      ['an unknown id', `Bearer ${crypto.randomUUID()}`, 'SESSION_INVALID'],
    ])('returns 401 with %s', async (_label, authorization, code) => {
      const response = await t.app.inject({
        method: 'GET',
        url: '/api/sessions/current',
        headers: authorization ? { authorization } : {},
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe(code);
    });
  });

  describe('DELETE /api/sessions/:id (sign out)', () => {
    it('terminates the session so it can no longer be used', async () => {
      const signUp = await t.signUp();

      const response = await t.app.inject({
        method: 'DELETE',
        url: `/api/sessions/${signUp.id}`,
        headers: signUp.headers,
      });
      const after = await t.app.inject({
        method: 'GET',
        url: '/api/sessions/current',
        headers: signUp.headers,
      });

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
      expect(t.db.sessions.get(signUp.id)?.terminatedAt).toEqual(expect.any(Date));
      expect(after.statusCode).toBe(401);
    });

    it("returns 404 for another user's session", async () => {
      const victim = await t.signUp();
      const attacker = await t.signUp();

      const response = await t.app.inject({
        method: 'DELETE',
        url: `/api/sessions/${victim.id}`,
        headers: attacker.headers,
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('SESSION_NOT_FOUND');
    });
  });
});
