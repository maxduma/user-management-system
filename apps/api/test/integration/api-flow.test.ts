import type { SessionWithUserDto, UserDto, UserListDto } from '@ums/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { systemClock } from '../../src/common/clock';
import { ScryptPasswordHasher } from '../../src/common/password-hasher';
import { PrismaSessionRepository } from '../../src/modules/sessions/prisma-session.repository';
import { SessionService } from '../../src/modules/sessions/session.service';
import { PrismaUserRepository } from '../../src/modules/users/prisma-user.repository';
import { UserService } from '../../src/modules/users/user.service';
import { createTestPrisma, truncateAll } from './database';

/** End-to-end API flow over the real database (no fakes). */
describe('API flow over PostgreSQL', () => {
  const prisma = createTestPrisma();
  const users = new PrismaUserRepository(prisma);
  const sessions = new PrismaSessionRepository(prisma);
  const passwordHasher = new ScryptPasswordHasher({ cost: 1024 });
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await truncateAll(prisma);
    app = await buildApp({
      config: {
        LOG_LEVEL: 'silent',
        TRUST_PROXY: false,
        CORS_ORIGIN: [],
        RATE_LIMIT_MAX: 10_000,
        AUTH_RATE_LIMIT_MAX: 10_000,
        SWAGGER_ENABLED: false,
      },
      userService: new UserService({ users, passwordHasher, clock: systemClock }),
      sessionService: new SessionService({
        users,
        sessions,
        passwordHasher,
        clock: systemClock,
        sessionTtlMs: 60_000,
      }),
      checkDatabase: async () => {
        await prisma.$queryRaw`SELECT 1`;
      },
      logger: false,
    });
  });

  afterAll(async () => {
    await app.close();
    await truncateAll(prisma);
    await prisma.$disconnect();
  });

  it('signs up, manages users and signs out', async () => {
    const ready = await app.inject({ method: 'GET', url: '/api/health/ready' });
    expect(ready.statusCode).toBe(200);

    const signUp = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up',
      payload: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'secret-password',
      },
    });
    expect(signUp.statusCode).toBe(201);
    const session = signUp.json<SessionWithUserDto>();
    const headers = { authorization: `Bearer ${session.id}` };

    const created = await app.inject({
      method: 'POST',
      url: '/api/users',
      headers,
      payload: {
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
        password: 'secret-password',
        status: 'inactive',
      },
    });
    expect(created.statusCode).toBe(201);
    const grace = created.json<UserDto>();

    const rename = await app.inject({
      method: 'PATCH',
      url: `/api/users/${grace.id}`,
      headers,
      payload: { firstName: 'Amazing Grace' },
    });
    expect(rename.statusCode).toBe(422);

    const graceSignIn = await app.inject({
      method: 'POST',
      url: '/api/sessions',
      payload: { email: 'grace@example.com', password: 'secret-password' },
    });
    expect(graceSignIn.statusCode).toBe(403);

    const list = await app.inject({ method: 'GET', url: '/api/users', headers });
    expect(list.json<UserListDto>()).toMatchObject({ total: 2, totalPages: 1 });

    const removed = await app.inject({ method: 'DELETE', url: `/api/users/${grace.id}`, headers });
    expect(removed.statusCode).toBe(204);

    const signOut = await app.inject({
      method: 'DELETE',
      url: `/api/sessions/${session.id}`,
      headers,
    });
    expect(signOut.statusCode).toBe(204);

    const afterSignOut = await app.inject({ method: 'GET', url: '/api/users', headers });
    expect(afterSignOut.statusCode).toBe(401);
  });
});
