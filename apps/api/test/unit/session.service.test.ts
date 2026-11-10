import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InvalidCredentialsError,
  InvalidSessionError,
  SessionNotFoundError,
  UserInactiveError,
} from '../../src/modules/sessions/session.errors';
import { EmailTakenError } from '../../src/modules/users/user.errors';
import {
  createTestContext,
  newUserInput,
  SESSION_TTL_MS,
  type TestContext,
} from '../helpers/test-context';

describe('SessionService', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  describe('signUp', () => {
    it('creates an active user and opens a session counted as the first login', async () => {
      const { session, user } = await ctx.sessionService.signUp(newUserInput({ firstName: 'Ada' }));

      expect(user).toMatchObject({ firstName: 'Ada', status: 'active', loginsCount: 1 });
      expect(session).toMatchObject({ userId: user.id, terminatedAt: null });
      expect(ctx.db.sessions.get(session.id)).toBeDefined();
    });

    it('rejects an already registered e-mail', async () => {
      await ctx.sessionService.signUp(newUserInput({ email: 'dup@example.com' }));

      await expect(
        ctx.sessionService.signUp(newUserInput({ email: 'dup@example.com' })),
      ).rejects.toBeInstanceOf(EmailTakenError);
    });
  });

  describe('signIn', () => {
    it('creates a new session and increments the logins counter', async () => {
      const input = newUserInput();
      const first = await ctx.sessionService.signUp(input);
      ctx.clock.advance(1000);

      const second = await ctx.sessionService.signIn({
        email: input.email,
        password: input.password,
      });

      expect(second.session.id).not.toBe(first.session.id);
      expect(second.user.loginsCount).toBe(2);
      expect(second.user.updatedAt.getTime()).toBeGreaterThan(first.user.updatedAt.getTime());
    });

    it('rejects a wrong password', async () => {
      const input = newUserInput();
      await ctx.sessionService.signUp(input);

      await expect(
        ctx.sessionService.signIn({ email: input.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('rejects an unknown e-mail after still comparing a (dummy) hash', async () => {
      const verify = vi.spyOn(ctx.passwordHasher, 'verify');

      await expect(
        ctx.sessionService.signIn({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(verify).toHaveBeenCalledTimes(1);
    });

    it('does not allow inactive users to create sessions', async () => {
      const input = newUserInput();
      const { user } = await ctx.sessionService.signUp(input);
      await ctx.userService.update('admin', user.id, { status: 'inactive' });
      const sessionsBefore = ctx.db.sessions.size;

      await expect(
        ctx.sessionService.signIn({ email: input.email, password: input.password }),
      ).rejects.toBeInstanceOf(UserInactiveError);
      expect(ctx.db.sessions.size).toBe(sessionsBefore);
    });

    it('reveals inactivity only to callers who know the password', async () => {
      const input = newUserInput();
      const { user } = await ctx.sessionService.signUp(input);
      await ctx.userService.update('admin', user.id, { status: 'inactive' });

      await expect(
        ctx.sessionService.signIn({ email: input.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('fails if the user is deactivated between verification and session creation', async () => {
      const input = newUserInput();
      await ctx.sessionService.signUp(input);
      vi.spyOn(ctx.db.sessionRepository, 'createForActiveUser').mockResolvedValueOnce(null);

      await expect(
        ctx.sessionService.signIn({ email: input.email, password: input.password }),
      ).rejects.toBeInstanceOf(UserInactiveError);
    });
  });

  describe('authenticate', () => {
    it('resolves an active session with its user', async () => {
      const { session, user } = await ctx.sessionService.signUp(newUserInput());

      const result = await ctx.sessionService.authenticate(session.id);

      expect(result.session.id).toBe(session.id);
      expect(result.user.id).toBe(user.id);
    });

    it('rejects unknown sessions', async () => {
      await expect(ctx.sessionService.authenticate(crypto.randomUUID())).rejects.toBeInstanceOf(
        InvalidSessionError,
      );
    });

    it('rejects terminated sessions', async () => {
      const { session, user } = await ctx.sessionService.signUp(newUserInput());
      await ctx.sessionService.terminate(user.id, session.id);

      await expect(ctx.sessionService.authenticate(session.id)).rejects.toBeInstanceOf(
        InvalidSessionError,
      );
    });

    it('rejects sessions of users that became inactive', async () => {
      const { session, user } = await ctx.sessionService.signUp(newUserInput());
      ctx.db.users.set(user.id, { ...ctx.db.users.get(user.id)!, status: 'inactive' });

      await expect(ctx.sessionService.authenticate(session.id)).rejects.toBeInstanceOf(
        InvalidSessionError,
      );
    });

    it('expires and terminates sessions older than the TTL', async () => {
      const { session } = await ctx.sessionService.signUp(newUserInput());
      ctx.clock.advance(SESSION_TTL_MS - 1);
      await expect(ctx.sessionService.authenticate(session.id)).resolves.toBeDefined();

      ctx.clock.advance(1);

      await expect(ctx.sessionService.authenticate(session.id)).rejects.toBeInstanceOf(
        InvalidSessionError,
      );
      expect(ctx.db.sessions.get(session.id)?.terminatedAt).toEqual(ctx.clock.now());
    });
  });

  describe('terminate', () => {
    it('sets the termination time of the caller’s session', async () => {
      const { session, user } = await ctx.sessionService.signUp(newUserInput());
      ctx.clock.advance(5000);

      await ctx.sessionService.terminate(user.id, session.id);

      expect(ctx.db.sessions.get(session.id)?.terminatedAt).toEqual(ctx.clock.now());
    });

    it('is idempotent', async () => {
      const { session, user } = await ctx.sessionService.signUp(newUserInput());
      await ctx.sessionService.terminate(user.id, session.id);
      const terminatedAt = ctx.db.sessions.get(session.id)?.terminatedAt;
      ctx.clock.advance(5000);

      await ctx.sessionService.terminate(user.id, session.id);

      expect(ctx.db.sessions.get(session.id)?.terminatedAt).toEqual(terminatedAt);
    });

    it('does not let users terminate sessions of other users', async () => {
      const victim = await ctx.sessionService.signUp(newUserInput());
      const attacker = await ctx.sessionService.signUp(newUserInput());

      await expect(
        ctx.sessionService.terminate(attacker.user.id, victim.session.id),
      ).rejects.toBeInstanceOf(SessionNotFoundError);
      expect(ctx.db.sessions.get(victim.session.id)?.terminatedAt).toBeNull();
    });
  });
});
