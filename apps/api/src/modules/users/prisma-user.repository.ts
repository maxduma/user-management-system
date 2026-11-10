import type { Prisma } from '../../generated/prisma/client';
import {
  isRecordNotFound,
  isUniqueViolation,
  type PrismaClient,
} from '../../infrastructure/prisma';
import { EmailTakenError } from './user.errors';
import type {
  CreateUserOptions,
  ListUsersParams,
  UpdateUserOptions,
  UserRepository,
} from './user.repository';
import type { NewUserData, User, UserChanges, UserWithCredentials } from './user.types';

/** Explicit projection so the password hash is never loaded by accident. */
const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  status: true,
  loginsCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id }, select: userSelect });
  }

  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, passwordHash: true },
    });
  }

  async list({ offset, limit }: ListUsersParams) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: userSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return { items, total };
  }

  async create(data: NewUserData, { now, initialSessionId }: CreateUserOptions): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          ...data,
          createdAt: now,
          updatedAt: now,
          loginsCount: initialSessionId ? 1 : 0,
          ...(initialSessionId && {
            sessions: { create: { id: initialSessionId, createdAt: now } },
          }),
        },
        select: userSelect,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailTakenError();
      throw error;
    }
  }

  async update(
    id: string,
    changes: UserChanges,
    { now, requireActive, terminateActiveSessions }: UpdateUserOptions,
  ): Promise<User | null> {
    try {
      // A single UPDATE (plus nested session update) runs in one transaction;
      // the optional status filter makes the "inactive users keep their name"
      // rule race-free.
      return await this.prisma.user.update({
        where: { id, ...(requireActive && { status: 'active' }) },
        data: {
          ...changes,
          updatedAt: now,
          ...(terminateActiveSessions && {
            sessions: {
              updateMany: { where: { terminatedAt: null }, data: { terminatedAt: now } },
            },
          }),
        },
        select: userSelect,
      });
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      if (isUniqueViolation(error)) throw new EmailTakenError();
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.user.deleteMany({ where: { id } });
    return count > 0;
  }
}
