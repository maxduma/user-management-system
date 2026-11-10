import type { UserDto, UserListDto } from '@ums/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/build-test-app';
import { newUserInput } from '../helpers/test-context';

describe('User endpoints', () => {
  let t: Awaited<ReturnType<typeof buildTestApp>>;
  let admin: Awaited<ReturnType<typeof t.signUp>>;

  const createUser = async (overrides: Record<string, string> = {}) => {
    const response = await t.app.inject({
      method: 'POST',
      url: '/api/users',
      headers: admin.headers,
      payload: { ...newUserInput(), ...overrides },
    });
    return response.json<UserDto>();
  };

  beforeEach(async () => {
    t = await buildTestApp();
    admin = await t.signUp({ firstName: 'Admin' });
  });

  afterEach(async () => {
    await t.app.close();
  });

  it.each([
    ['GET', '/api/users'],
    ['POST', '/api/users'],
    ['GET', `/api/users/${crypto.randomUUID()}`],
    ['PATCH', `/api/users/${crypto.randomUUID()}`],
    ['DELETE', `/api/users/${crypto.randomUUID()}`],
  ] as const)('%s %s requires authentication', async (method, url) => {
    const response = await t.app.inject({
      method,
      url,
      payload: method === 'GET' ? undefined : {},
    });

    expect(response.statusCode).toBe(401);
  });

  describe('GET /api/users', () => {
    it('returns 6 users per page by default with pagination metadata', async () => {
      for (let i = 0; i < 7; i += 1) {
        await createUser();
        t.clock.advance(1000);
      }

      const first = await t.app.inject({
        method: 'GET',
        url: '/api/users',
        headers: admin.headers,
      });
      const second = await t.app.inject({
        method: 'GET',
        url: '/api/users?page=2',
        headers: admin.headers,
      });

      expect(first.statusCode).toBe(200);
      const firstBody = first.json<UserListDto>();
      expect(firstBody).toMatchObject({ page: 1, pageSize: 6, total: 8, totalPages: 2 });
      expect(firstBody.items).toHaveLength(6);
      expect(second.json<UserListDto>().items).toHaveLength(2);
      expect(JSON.stringify(firstBody)).not.toContain('passwordHash');
    });

    it('validates pagination parameters', async () => {
      const response = await t.app.inject({
        method: 'GET',
        url: '/api/users?page=0&pageSize=500',
        headers: admin.headers,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/users/:id', () => {
    it('returns the user', async () => {
      const user = await createUser({ firstName: 'Grace' });

      const response = await t.app.inject({
        method: 'GET',
        url: `/api/users/${user.id}`,
        headers: admin.headers,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(user);
    });

    it('returns 404 for unknown users and 400 for malformed ids', async () => {
      const unknown = await t.app.inject({
        method: 'GET',
        url: `/api/users/${crypto.randomUUID()}`,
        headers: admin.headers,
      });
      const malformed = await t.app.inject({
        method: 'GET',
        url: '/api/users/123',
        headers: admin.headers,
      });

      expect(unknown.statusCode).toBe(404);
      expect(unknown.json().error.code).toBe('USER_NOT_FOUND');
      expect(malformed.statusCode).toBe(400);
    });
  });

  describe('POST /api/users', () => {
    it('creates a user (active by default)', async () => {
      const response = await t.app.inject({
        method: 'POST',
        url: '/api/users',
        headers: admin.headers,
        payload: newUserInput({ firstName: 'Linus' }),
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        firstName: 'Linus',
        status: 'active',
        loginsCount: 0,
      });
    });

    it('can create inactive users', async () => {
      const user = await createUser({ status: 'inactive' });

      expect(user.status).toBe('inactive');
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('updates the user and refreshes updatedAt only', async () => {
      const user = await createUser();
      t.clock.advance(60_000);

      const response = await t.app.inject({
        method: 'PATCH',
        url: `/api/users/${user.id}`,
        headers: admin.headers,
        payload: { firstName: 'Renamed' },
      });

      expect(response.statusCode).toBe(200);
      const updated = response.json<UserDto>();
      expect(updated.firstName).toBe('Renamed');
      expect(updated.createdAt).toBe(user.createdAt);
      expect(Date.parse(updated.updatedAt)).toBe(Date.parse(user.updatedAt) + 60_000);
    });

    it.each(['createdAt', 'updatedAt', 'loginsCount', 'id'])(
      'rejects attempts to change %s',
      async (field) => {
        const user = await createUser();

        const response = await t.app.inject({
          method: 'PATCH',
          url: `/api/users/${user.id}`,
          headers: admin.headers,
          payload: { [field]: field === 'loginsCount' ? 99 : '2000-01-01T00:00:00.000Z' },
        });

        expect(response.statusCode).toBe(400);
      },
    );

    it('returns 422 when renaming an inactive user', async () => {
      const user = await createUser({ status: 'inactive' });

      const response = await t.app.inject({
        method: 'PATCH',
        url: `/api/users/${user.id}`,
        headers: admin.headers,
        payload: { lastName: 'Changed' },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('USER_INACTIVE_NAME_LOCKED');
    });

    it('invalidates the sessions of a deactivated user', async () => {
      const victim = await t.signUp();

      await t.app.inject({
        method: 'PATCH',
        url: `/api/users/${victim.userId}`,
        headers: admin.headers,
        payload: { status: 'inactive' },
      });
      const response = await t.app.inject({
        method: 'GET',
        url: '/api/users',
        headers: victim.headers,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 409 when deactivating yourself', async () => {
      const response = await t.app.inject({
        method: 'PATCH',
        url: `/api/users/${admin.userId}`,
        headers: admin.headers,
        payload: { status: 'inactive' },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('CANNOT_MODIFY_SELF');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('deletes the user', async () => {
      const user = await createUser();

      const response = await t.app.inject({
        method: 'DELETE',
        url: `/api/users/${user.id}`,
        headers: admin.headers,
      });
      const lookup = await t.app.inject({
        method: 'GET',
        url: `/api/users/${user.id}`,
        headers: admin.headers,
      });

      expect(response.statusCode).toBe(204);
      expect(lookup.statusCode).toBe(404);
    });

    it('returns 409 when deleting yourself and 404 for unknown users', async () => {
      const self = await t.app.inject({
        method: 'DELETE',
        url: `/api/users/${admin.userId}`,
        headers: admin.headers,
      });
      const unknown = await t.app.inject({
        method: 'DELETE',
        url: `/api/users/${crypto.randomUUID()}`,
        headers: admin.headers,
      });

      expect(self.statusCode).toBe(409);
      expect(unknown.statusCode).toBe(404);
    });
  });
});
