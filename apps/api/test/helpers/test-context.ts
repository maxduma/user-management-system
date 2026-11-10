import { SessionService } from '../../src/modules/sessions/session.service';
import { UserService } from '../../src/modules/users/user.service';
import { FakeClock } from '../doubles/fake-clock';
import { FakePasswordHasher } from '../doubles/fake-password-hasher';
import { InMemoryDatabase } from '../doubles/in-memory-database';

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Services wired to in-memory adapters and a controllable clock. */
export function createTestContext() {
  const db = new InMemoryDatabase();
  const clock = new FakeClock();
  const passwordHasher = new FakePasswordHasher();

  const userService = new UserService({ users: db.userRepository, passwordHasher, clock });
  const sessionService = new SessionService({
    users: db.userRepository,
    sessions: db.sessionRepository,
    passwordHasher,
    clock,
    sessionTtlMs: SESSION_TTL_MS,
  });

  return { db, clock, passwordHasher, userService, sessionService };
}

export type TestContext = ReturnType<typeof createTestContext>;

let counter = 0;
/** Unique, valid sign-up payload. */
export function newUserInput(overrides: Partial<Record<string, string>> = {}) {
  counter += 1;
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: `user${counter}@example.com`,
    password: 'secret-password',
    ...overrides,
  };
}
