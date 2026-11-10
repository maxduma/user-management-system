import type { SessionWithUser } from './session.types';

export interface CreateSessionParams {
  id: string;
  userId: string;
  now: Date;
}

/** Persistence port for sessions. */
export interface SessionRepository {
  /**
   * Creates a session and increments the user's logins counter in one
   * transaction, only if the user exists and is active; otherwise null.
   */
  createForActiveUser(params: CreateSessionParams): Promise<SessionWithUser | null>;
  findByIdWithUser(id: string): Promise<SessionWithUser | null>;
  /** Marks the session as terminated. Idempotent. */
  terminate(id: string, now: Date): Promise<void>;
}
