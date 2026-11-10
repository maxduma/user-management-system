import type { User } from '../users/user.types';

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  terminatedAt: Date | null;
}

export interface SessionWithUser {
  session: Session;
  user: User;
}
