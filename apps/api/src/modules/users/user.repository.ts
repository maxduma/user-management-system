import type { NewUserData, User, UserChanges, UserWithCredentials } from './user.types';

export interface ListUsersParams {
  offset: number;
  limit: number;
}

export interface CreateUserOptions {
  now: Date;
  /**
   * When set, the user's first session is created in the same transaction and
   * counted as a login (used by sign-up).
   */
  initialSessionId?: string;
}

export interface UpdateUserOptions {
  now: Date;
  /** Apply the update only if the user is currently active (atomic guard). */
  requireActive?: boolean;
  /** Terminate every active session of the user in the same transaction. */
  terminateActiveSessions?: boolean;
}

/** Persistence port for users. Implementations must throw EmailTakenError on duplicates. */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;
  /** Newest first, with a stable tie-breaker. */
  list(params: ListUsersParams): Promise<{ items: User[]; total: number }>;
  create(data: NewUserData, options: CreateUserOptions): Promise<User>;
  /** Resolves to null when no user matched (missing, or inactive while `requireActive`). */
  update(id: string, changes: UserChanges, options: UpdateUserOptions): Promise<User | null>;
  /** Resolves to false when the user did not exist. Sessions are removed by cascade. */
  delete(id: string): Promise<boolean>;
}
