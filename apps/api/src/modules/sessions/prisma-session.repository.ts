import { isRecordNotFound, type PrismaClient } from '../../infrastructure/prisma';
import { userSelect } from '../users/prisma-user.repository';
import type { CreateSessionParams, SessionRepository } from './session.repository';
import type { SessionWithUser } from './session.types';

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createForActiveUser({
    id,
    userId,
    now,
  }: CreateSessionParams): Promise<SessionWithUser | null> {
    try {
      // One UPDATE on the user (guarded by status) with a nested INSERT of the
      // session: inactive users can never obtain a session, even under races.
      const user = await this.prisma.user.update({
        where: { id: userId, status: 'active' },
        data: {
          loginsCount: { increment: 1 },
          updatedAt: now,
          sessions: { create: { id, createdAt: now } },
        },
        select: userSelect,
      });
      return { session: { id, userId, createdAt: now, terminatedAt: null }, user };
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }

  async findByIdWithUser(id: string): Promise<SessionWithUser | null> {
    const row = await this.prisma.session.findUnique({
      where: { id },
      include: { user: { select: userSelect } },
    });
    if (!row) return null;
    const { user, ...session } = row;
    return { session, user };
  }

  async terminate(id: string, now: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id, terminatedAt: null },
      data: { terminatedAt: now },
    });
  }
}
