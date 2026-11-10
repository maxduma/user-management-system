import type { UserStatus } from '@ums/shared';

export type { UserStatus };

/** User entity as seen by the application (never carries credentials). */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  loginsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Only used by authentication; keeps the hash out of every other code path. */
export interface UserWithCredentials extends User {
  passwordHash: string;
}

export interface NewUserData {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
}

export interface UserChanges {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: UserStatus;
}
