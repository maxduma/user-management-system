import type { Paginated, PaginationQuery } from '@ums/shared';
import type { Clock } from '../../common/clock';
import type { PasswordHasher } from '../../common/password-hasher';
import {
  CannotModifySelfError,
  UserInactiveNameLockedError,
  UserNotFoundError,
} from './user.errors';
import type { UserRepository } from './user.repository';
import type { User, UserChanges, UserStatus } from './user.types';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  status: UserStatus;
}

export interface UserServiceDeps {
  users: UserRepository;
  passwordHasher: PasswordHasher;
  clock: Clock;
}

const isChanged = (next: string | undefined, current: string) =>
  next !== undefined && next !== current;

/**
 * User management use-cases. Holds the domain rules:
 * - creation time is immutable and the last-update time is refreshed on every update;
 * - first/last name cannot change while the (persisted) status is inactive;
 * - deactivating a user terminates their active sessions;
 * - an admin cannot delete or deactivate their own account.
 */
export class UserService {
  constructor(private readonly deps: UserServiceDeps) {}

  async list({ page, pageSize }: PaginationQuery): Promise<Paginated<User>> {
    const { items, total } = await this.deps.users.list({
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string): Promise<User> {
    const user = await this.deps.users.findById(id);
    if (!user) throw new UserNotFoundError();
    return user;
  }

  async create({ password, ...data }: CreateUserInput): Promise<User> {
    const passwordHash = await this.deps.passwordHasher.hash(password);
    return this.deps.users.create({ ...data, passwordHash }, { now: this.deps.clock.now() });
  }

  async update(actorId: string, id: string, changes: UserChanges): Promise<User> {
    if (id === actorId && changes.status === 'inactive') {
      throw new CannotModifySelfError('You cannot deactivate your own account');
    }

    const current = await this.getById(id);
    // Re-sending the current name (e.g. a full form submit) is not a change.
    const renaming =
      isChanged(changes.firstName, current.firstName) ||
      isChanged(changes.lastName, current.lastName);

    if (renaming && current.status === 'inactive') {
      throw new UserInactiveNameLockedError();
    }

    const updated = await this.deps.users.update(id, changes, {
      now: this.deps.clock.now(),
      requireActive: renaming,
      terminateActiveSessions: changes.status === 'inactive',
    });
    if (updated) return updated;

    // The user was deleted or deactivated between the read and the write.
    await this.getById(id);
    throw new UserInactiveNameLockedError();
  }

  async remove(actorId: string, id: string): Promise<void> {
    if (id === actorId) {
      throw new CannotModifySelfError('You cannot delete your own account');
    }
    const deleted = await this.deps.users.delete(id);
    if (!deleted) throw new UserNotFoundError();
  }
}
