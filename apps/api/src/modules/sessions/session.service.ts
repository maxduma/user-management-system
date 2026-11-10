import { randomUUID } from 'node:crypto';
import type { Clock } from '../../common/clock';
import type { PasswordHasher } from '../../common/password-hasher';
import type { UserRepository } from '../users/user.repository';
import {
  InvalidCredentialsError,
  InvalidSessionError,
  SessionNotFoundError,
  UserInactiveError,
} from './session.errors';
import type { SessionRepository } from './session.repository';
import type { SessionWithUser } from './session.types';

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SessionServiceDeps {
  users: UserRepository;
  sessions: SessionRepository;
  passwordHasher: PasswordHasher;
  clock: Clock;
  /** Session lifetime measured from its creation. */
  sessionTtlMs: number;
  generateId?: () => string;
}

/**
 * Session (authentication) use-cases: sign-up, sign-in (create session),
 * authenticate a request and sign-out (terminate session).
 */
export class SessionService {
  private readonly generateId: () => string;
  private dummyHash?: Promise<string>;

  constructor(private readonly deps: SessionServiceDeps) {
    this.generateId = deps.generateId ?? randomUUID;
  }

  /** Registers an active user and opens their first session atomically. */
  async signUp({ password, ...profile }: SignUpInput): Promise<SessionWithUser> {
    const passwordHash = await this.deps.passwordHasher.hash(password);
    const now = this.deps.clock.now();
    const sessionId = this.generateId();

    const user = await this.deps.users.create(
      { ...profile, passwordHash, status: 'active' },
      { now, initialSessionId: sessionId },
    );
    return {
      session: { id: sessionId, userId: user.id, createdAt: now, terminatedAt: null },
      user,
    };
  }

  async signIn({ email, password }: SignInInput): Promise<SessionWithUser> {
    const user = await this.deps.users.findByEmailWithCredentials(email);
    // Always run a hash comparison so response time does not reveal whether
    // the e-mail exists.
    const passwordMatches = await this.deps.passwordHasher.verify(
      password,
      user?.passwordHash ?? (await this.getDummyHash()),
    );
    if (!user || !passwordMatches) throw new InvalidCredentialsError();

    // Checked only after the password, so account status is not disclosed to
    // someone who doesn't know the credentials.
    if (user.status !== 'active') throw new UserInactiveError();

    const created = await this.deps.sessions.createForActiveUser({
      id: this.generateId(),
      userId: user.id,
      now: this.deps.clock.now(),
    });
    // Deactivated (or deleted) between the read above and the insert.
    if (!created) throw new UserInactiveError();
    return created;
  }

  /** Resolves the session behind a bearer identifier or throws 401. */
  async authenticate(sessionId: string): Promise<SessionWithUser> {
    const found = await this.deps.sessions.findByIdWithUser(sessionId);
    if (!found || found.session.terminatedAt || found.user.status !== 'active') {
      throw new InvalidSessionError();
    }

    const now = this.deps.clock.now();
    if (now.getTime() - found.session.createdAt.getTime() >= this.deps.sessionTtlMs) {
      await this.deps.sessions.terminate(sessionId, now);
      throw new InvalidSessionError('Session has expired');
    }
    return found;
  }

  /** Users may only terminate their own sessions; others look like 404. */
  async terminate(actorUserId: string, sessionId: string): Promise<void> {
    const found = await this.deps.sessions.findByIdWithUser(sessionId);
    if (!found || found.session.userId !== actorUserId) throw new SessionNotFoundError();
    await this.deps.sessions.terminate(sessionId, this.deps.clock.now());
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.deps.passwordHasher.hash(randomUUID());
    return this.dummyHash;
  }
}
