import { beforeEach, describe, expect, it } from 'vitest';
import {
  CannotModifySelfError,
  EmailTakenError,
  UserInactiveNameLockedError,
  UserNotFoundError,
} from '../../src/modules/users/user.errors';
import type { User } from '../../src/modules/users/user.types';
import { createTestContext, newUserInput, type TestContext } from '../helpers/test-context';

const ADMIN_ID = '00000000-0000-4000-8000-000000000000';

describe('UserService', () => {
  let ctx: TestContext;

  const createUser = (overrides: Partial<Record<string, string>> = {}, status = 'active') =>
    ctx.userService.create({ ...newUserInput(overrides), status: status as User['status'] });

  beforeEach(() => {
    ctx = createTestContext();
  });

  describe('create', () => {
    it('creates a user with zero logins and equal creation/update times', async () => {
      const user = await createUser({ firstName: 'Grace' });

      expect(user).toMatchObject({ firstName: 'Grace', status: 'active', loginsCount: 0 });
      expect(user.updatedAt).toEqual(user.createdAt);
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('stores a hash, never the plain password', async () => {
      const user = await createUser({ password: 'plain-text-pw' });

      expect(ctx.db.users.get(user.id)?.passwordHash).toBe('hashed:plain-text-pw');
    });

    it('rejects duplicate e-mails', async () => {
      await createUser({ email: 'dup@example.com' });

      await expect(createUser({ email: 'dup@example.com' })).rejects.toBeInstanceOf(
        EmailTakenError,
      );
    });
  });

  describe('list', () => {
    it('paginates newest first and reports totals', async () => {
      for (let i = 0; i < 7; i += 1) {
        await createUser({ firstName: `User${i}` });
        ctx.clock.advance(1000);
      }

      const firstPage = await ctx.userService.list({ page: 1, pageSize: 6 });
      const secondPage = await ctx.userService.list({ page: 2, pageSize: 6 });

      expect(firstPage).toMatchObject({ page: 1, pageSize: 6, total: 7, totalPages: 2 });
      expect(firstPage.items).toHaveLength(6);
      expect(firstPage.items[0]?.firstName).toBe('User6');
      expect(secondPage.items.map((user) => user.firstName)).toEqual(['User0']);
    });

    it('returns an empty page beyond the last one', async () => {
      await createUser();

      const page = await ctx.userService.list({ page: 5, pageSize: 6 });

      expect(page).toMatchObject({ items: [], total: 1, totalPages: 1 });
    });
  });

  describe('getById', () => {
    it('throws when the user does not exist', async () => {
      await expect(ctx.userService.getById(ADMIN_ID)).rejects.toBeInstanceOf(UserNotFoundError);
    });
  });

  describe('update', () => {
    it('keeps the creation time and refreshes the last update time', async () => {
      const user = await createUser();
      ctx.clock.advance(60_000);

      const updated = await ctx.userService.update(ADMIN_ID, user.id, { lastName: 'Byron' });

      expect(updated.lastName).toBe('Byron');
      expect(updated.createdAt).toEqual(user.createdAt);
      expect(updated.updatedAt.getTime()).toBe(user.createdAt.getTime() + 60_000);
    });

    it('refreshes the last update time even when only the status changes', async () => {
      const user = await createUser();
      ctx.clock.advance(5_000);

      const updated = await ctx.userService.update(ADMIN_ID, user.id, { status: 'inactive' });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it.each([{ firstName: 'Changed' }, { lastName: 'Changed' }])(
      'rejects name changes for inactive users (%o)',
      async (changes) => {
        const user = await createUser({}, 'inactive');

        await expect(ctx.userService.update(ADMIN_ID, user.id, changes)).rejects.toBeInstanceOf(
          UserInactiveNameLockedError,
        );
        expect(ctx.db.users.get(user.id)?.firstName).toBe(user.firstName);
      },
    );

    it('rejects renaming an inactive user even when re-activating in the same request', async () => {
      const user = await createUser({}, 'inactive');

      await expect(
        ctx.userService.update(ADMIN_ID, user.id, { status: 'active', firstName: 'New' }),
      ).rejects.toBeInstanceOf(UserInactiveNameLockedError);
    });

    it('allows other changes for inactive users when names are unchanged', async () => {
      const user = await createUser({ firstName: 'Same' }, 'inactive');

      const updated = await ctx.userService.update(ADMIN_ID, user.id, {
        firstName: 'Same',
        email: 'new-address@example.com',
      });

      expect(updated.email).toBe('new-address@example.com');
    });

    it('allows renaming once the user has been re-activated', async () => {
      const user = await createUser({}, 'inactive');
      await ctx.userService.update(ADMIN_ID, user.id, { status: 'active' });

      const updated = await ctx.userService.update(ADMIN_ID, user.id, { firstName: 'Renamed' });

      expect(updated.firstName).toBe('Renamed');
    });

    it('terminates active sessions when a user is deactivated', async () => {
      const { session, user } = await ctx.sessionService.signUp(newUserInput());

      await ctx.userService.update(ADMIN_ID, user.id, { status: 'inactive' });

      expect(ctx.db.sessions.get(session.id)?.terminatedAt).toEqual(expect.any(Date));
    });

    it('prevents admins from deactivating themselves', async () => {
      const user = await createUser();

      await expect(
        ctx.userService.update(user.id, user.id, { status: 'inactive' }),
      ).rejects.toBeInstanceOf(CannotModifySelfError);
    });

    it('lets admins update their own name', async () => {
      const user = await createUser();

      const updated = await ctx.userService.update(user.id, user.id, { firstName: 'Me' });

      expect(updated.firstName).toBe('Me');
    });

    it('rejects e-mails that belong to another user', async () => {
      await createUser({ email: 'taken@example.com' });
      const user = await createUser();

      await expect(
        ctx.userService.update(ADMIN_ID, user.id, { email: 'taken@example.com' }),
      ).rejects.toBeInstanceOf(EmailTakenError);
    });

    it('throws when the user does not exist', async () => {
      await expect(
        ctx.userService.update(ADMIN_ID, ADMIN_ID, { firstName: 'x' }),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it('reports the name lock when the user is deactivated concurrently', async () => {
      const user = await createUser();
      // Simulate a concurrent deactivation between the read and the guarded write.
      const original = ctx.db.userRepository.update;
      ctx.db.userRepository.update = async (id, changes, options) => {
        ctx.db.users.set(id, { ...ctx.db.users.get(id)!, status: 'inactive' });
        return original(id, changes, options);
      };

      await expect(
        ctx.userService.update(ADMIN_ID, user.id, { firstName: 'Racy' }),
      ).rejects.toBeInstanceOf(UserInactiveNameLockedError);
    });
  });

  describe('remove', () => {
    it('deletes the user and their sessions', async () => {
      const { session, user } = await ctx.sessionService.signUp(newUserInput());

      await ctx.userService.remove(ADMIN_ID, user.id);

      expect(ctx.db.users.has(user.id)).toBe(false);
      expect(ctx.db.sessions.has(session.id)).toBe(false);
    });

    it('prevents admins from deleting themselves', async () => {
      const user = await createUser();

      await expect(ctx.userService.remove(user.id, user.id)).rejects.toBeInstanceOf(
        CannotModifySelfError,
      );
    });

    it('throws when the user does not exist', async () => {
      await expect(ctx.userService.remove(ADMIN_ID, crypto.randomUUID())).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
    });
  });
});
