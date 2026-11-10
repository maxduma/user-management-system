import { randomUUID } from 'node:crypto';
import type {
  CreateSessionParams,
  SessionRepository,
} from '../../src/modules/sessions/session.repository';
import type { Session, SessionWithUser } from '../../src/modules/sessions/session.types';
import { EmailTakenError } from '../../src/modules/users/user.errors';
import type {
  CreateUserOptions,
  ListUsersParams,
  UpdateUserOptions,
  UserRepository,
} from '../../src/modules/users/user.repository';
import type {
  NewUserData,
  User,
  UserChanges,
  UserWithCredentials,
} from '../../src/modules/users/user.types';

const toPublic = ({ passwordHash: _hash, ...user }: UserWithCredentials): User => ({ ...user });

/**
 * In-memory implementation of both repository ports, mirroring the
 * semantics of the Prisma adapters (unique e-mail, guarded updates,
 * cascade delete, ordering). Used by unit and HTTP tests.
 */
export class InMemoryDatabase {
  readonly users = new Map<string, UserWithCredentials>();
  readonly sessions = new Map<string, Session>();

  readonly userRepository: UserRepository = {
    findById: async (id) => {
      const user = this.users.get(id);
      return user ? toPublic(user) : null;
    },

    findByEmailWithCredentials: async (email) => {
      const user = [...this.users.values()].find((candidate) => candidate.email === email);
      return user ? { ...user } : null;
    },

    list: async ({ offset, limit }: ListUsersParams) => {
      const sorted = [...this.users.values()].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
      );
      return { items: sorted.slice(offset, offset + limit).map(toPublic), total: sorted.length };
    },

    create: async (data: NewUserData, { now, initialSessionId }: CreateUserOptions) => {
      this.assertEmailAvailable(data.email);
      const user: UserWithCredentials = {
        ...data,
        id: randomUUID(),
        loginsCount: initialSessionId ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      };
      this.users.set(user.id, user);
      if (initialSessionId) {
        this.sessions.set(initialSessionId, {
          id: initialSessionId,
          userId: user.id,
          createdAt: now,
          terminatedAt: null,
        });
      }
      return toPublic(user);
    },

    update: async (
      id: string,
      changes: UserChanges,
      { now, requireActive, terminateActiveSessions }: UpdateUserOptions,
    ) => {
      const user = this.users.get(id);
      if (!user || (requireActive && user.status !== 'active')) return null;
      if (changes.email !== undefined && changes.email !== user.email) {
        this.assertEmailAvailable(changes.email);
      }
      const updated = { ...user, ...stripUndefined(changes), updatedAt: now };
      this.users.set(id, updated);
      if (terminateActiveSessions) this.terminateSessionsOf(id, now);
      return toPublic(updated);
    },

    delete: async (id) => {
      if (!this.users.delete(id)) return false;
      for (const session of this.sessions.values()) {
        if (session.userId === id) this.sessions.delete(session.id);
      }
      return true;
    },
  };

  readonly sessionRepository: SessionRepository = {
    createForActiveUser: async ({ id, userId, now }: CreateSessionParams) => {
      const user = this.users.get(userId);
      if (!user || user.status !== 'active') return null;
      const updated = { ...user, loginsCount: user.loginsCount + 1, updatedAt: now };
      this.users.set(userId, updated);
      const session: Session = { id, userId, createdAt: now, terminatedAt: null };
      this.sessions.set(id, session);
      return { session: { ...session }, user: toPublic(updated) };
    },

    findByIdWithUser: async (id): Promise<SessionWithUser | null> => {
      const session = this.sessions.get(id);
      const user = session && this.users.get(session.userId);
      return session && user ? { session: { ...session }, user: toPublic(user) } : null;
    },

    terminate: async (id, now) => {
      const session = this.sessions.get(id);
      if (session && !session.terminatedAt)
        this.sessions.set(id, { ...session, terminatedAt: now });
    },
  };

  private assertEmailAvailable(email: string) {
    if ([...this.users.values()].some((user) => user.email === email)) throw new EmailTakenError();
  }

  private terminateSessionsOf(userId: string, now: Date) {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.terminatedAt) {
        this.sessions.set(session.id, { ...session, terminatedAt: now });
      }
    }
  }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as Partial<T>;
}
