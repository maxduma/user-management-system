import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaSessionRepository } from '../../src/modules/sessions/prisma-session.repository';
import { PrismaUserRepository } from '../../src/modules/users/prisma-user.repository';
import { EmailTakenError } from '../../src/modules/users/user.errors';
import type { NewUserData } from '../../src/modules/users/user.types';
import { createTestPrisma, truncateAll } from './database';

const prisma = createTestPrisma();
const users = new PrismaUserRepository(prisma);
const sessions = new PrismaSessionRepository(prisma);

let sequence = 0;
const newUser = (overrides: Partial<NewUserData> = {}): NewUserData => {
  sequence += 1;
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: `user${sequence}@example.com`,
    passwordHash: 'scrypt$hash',
    status: 'active',
    ...overrides,
  };
};
const at = (iso: string) => new Date(iso);

describe('Prisma repositories (PostgreSQL)', () => {
  beforeEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await truncateAll(prisma);
    await prisma.$disconnect();
  });

  describe('PrismaUserRepository', () => {
    it('creates users without ever returning the password hash', async () => {
      const created = await users.create(newUser(), { now: at('2025-01-01T00:00:00Z') });
      const found = await users.findById(created.id);

      expect(created).toMatchObject({ loginsCount: 0, status: 'active' });
      expect(created.createdAt).toEqual(at('2025-01-01T00:00:00Z'));
      expect(created.updatedAt).toEqual(created.createdAt);
      expect(found).toEqual(created);
      expect(found).not.toHaveProperty('passwordHash');
    });

    it('exposes the hash only through findByEmailWithCredentials', async () => {
      const created = await users.create(newUser({ email: 'login@example.com' }), {
        now: new Date(),
      });

      const found = await users.findByEmailWithCredentials('login@example.com');

      expect(found).toMatchObject({ id: created.id, passwordHash: 'scrypt$hash' });
    });

    it('maps unique e-mail violations to EmailTakenError (create and update)', async () => {
      await users.create(newUser({ email: 'taken@example.com' }), { now: new Date() });
      const other = await users.create(newUser(), { now: new Date() });

      await expect(
        users.create(newUser({ email: 'taken@example.com' }), { now: new Date() }),
      ).rejects.toBeInstanceOf(EmailTakenError);
      await expect(
        users.update(other.id, { email: 'taken@example.com' }, { now: new Date() }),
      ).rejects.toBeInstanceOf(EmailTakenError);
    });

    it('creates the initial session atomically with the user (sign-up)', async () => {
      const sessionId = crypto.randomUUID();

      const user = await users.create(newUser(), { now: new Date(), initialSessionId: sessionId });
      const session = await sessions.findByIdWithUser(sessionId);

      expect(user.loginsCount).toBe(1);
      expect(session?.session).toMatchObject({ userId: user.id, terminatedAt: null });
    });

    it('lists newest first with offset pagination and a total count', async () => {
      for (let i = 0; i < 8; i += 1) {
        await users.create(newUser({ firstName: `U${i}` }), {
          now: at(`2025-01-01T00:00:0${i}Z`),
        });
      }

      const page = await users.list({ offset: 6, limit: 6 });
      const first = await users.list({ offset: 0, limit: 6 });

      expect(first.total).toBe(8);
      expect(first.items.map((user) => user.firstName)).toEqual([
        'U7',
        'U6',
        'U5',
        'U4',
        'U3',
        'U2',
      ]);
      expect(page.items.map((user) => user.firstName)).toEqual(['U1', 'U0']);
    });

    it('never changes createdAt and always refreshes updatedAt', async () => {
      const user = await users.create(newUser(), { now: at('2025-01-01T00:00:00Z') });

      const updated = await users.update(
        user.id,
        { lastName: 'Byron' },
        { now: at('2025-02-01T00:00:00Z') },
      );

      expect(updated).toMatchObject({ lastName: 'Byron' });
      expect(updated?.createdAt).toEqual(at('2025-01-01T00:00:00Z'));
      expect(updated?.updatedAt).toEqual(at('2025-02-01T00:00:00Z'));
    });

    it('skips guarded updates of inactive users and unknown ids', async () => {
      const inactive = await users.create(newUser({ status: 'inactive', firstName: 'Old' }), {
        now: new Date(),
      });

      const guarded = await users.update(
        inactive.id,
        { firstName: 'New' },
        { now: new Date(), requireActive: true },
      );
      const unknown = await users.update(
        crypto.randomUUID(),
        { firstName: 'X' },
        { now: new Date() },
      );

      expect(guarded).toBeNull();
      expect(unknown).toBeNull();
      expect((await users.findById(inactive.id))?.firstName).toBe('Old');
    });

    it('terminates active sessions in the same update when requested', async () => {
      const sessionId = crypto.randomUUID();
      const user = await users.create(newUser(), { now: new Date(), initialSessionId: sessionId });
      const deactivatedAt = at('2025-03-01T00:00:00Z');

      await users.update(
        user.id,
        { status: 'inactive' },
        { now: deactivatedAt, terminateActiveSessions: true },
      );

      const session = await sessions.findByIdWithUser(sessionId);
      expect(session?.session.terminatedAt).toEqual(deactivatedAt);
      expect(session?.user.status).toBe('inactive');
    });

    it('deletes users and cascades to their sessions', async () => {
      const sessionId = crypto.randomUUID();
      const user = await users.create(newUser(), { now: new Date(), initialSessionId: sessionId });

      expect(await users.delete(user.id)).toBe(true);
      expect(await users.delete(user.id)).toBe(false);
      expect(await sessions.findByIdWithUser(sessionId)).toBeNull();
    });
  });

  describe('PrismaSessionRepository', () => {
    it('creates sessions for active users and increments the logins counter', async () => {
      const user = await users.create(newUser(), { now: at('2025-01-01T00:00:00Z') });
      const id = crypto.randomUUID();
      const now = at('2025-01-02T00:00:00Z');

      const created = await sessions.createForActiveUser({ id, userId: user.id, now });

      expect(created?.session).toEqual({ id, userId: user.id, createdAt: now, terminatedAt: null });
      expect(created?.user).toMatchObject({ loginsCount: 1, updatedAt: now });
    });

    it('refuses to create sessions for inactive or unknown users', async () => {
      const inactive = await users.create(newUser({ status: 'inactive' }), { now: new Date() });

      const forInactive = await sessions.createForActiveUser({
        id: crypto.randomUUID(),
        userId: inactive.id,
        now: new Date(),
      });
      const forUnknown = await sessions.createForActiveUser({
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        now: new Date(),
      });

      expect(forInactive).toBeNull();
      expect(forUnknown).toBeNull();
      expect(await prisma.session.count()).toBe(0);
    });

    it('increments the logins counter atomically under concurrency', async () => {
      const user = await users.create(newUser(), { now: new Date() });

      await Promise.all(
        Array.from({ length: 10 }, () =>
          sessions.createForActiveUser({
            id: crypto.randomUUID(),
            userId: user.id,
            now: new Date(),
          }),
        ),
      );

      expect((await users.findById(user.id))?.loginsCount).toBe(10);
    });

    it('terminates sessions idempotently', async () => {
      const user = await users.create(newUser(), { now: new Date() });
      const id = crypto.randomUUID();
      await sessions.createForActiveUser({ id, userId: user.id, now: new Date() });

      await sessions.terminate(id, at('2025-05-01T00:00:00Z'));
      await sessions.terminate(id, at('2025-06-01T00:00:00Z'));

      const found = await sessions.findByIdWithUser(id);
      expect(found?.session.terminatedAt).toEqual(at('2025-05-01T00:00:00Z'));
    });
  });
});
