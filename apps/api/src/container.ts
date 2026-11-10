import { systemClock } from './common/clock';
import { ScryptPasswordHasher } from './common/password-hasher';
import type { Env } from './config/env';
import { createPrismaClient } from './infrastructure/prisma';
import { PrismaSessionRepository } from './modules/sessions/prisma-session.repository';
import { SessionService } from './modules/sessions/session.service';
import { PrismaUserRepository } from './modules/users/prisma-user.repository';
import { UserService } from './modules/users/user.service';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Composition root: the only place that knows about concrete
 * implementations. Everything else depends on interfaces.
 */
export function createContainer(env: Env) {
  const prisma = createPrismaClient(env.DATABASE_URL);
  const users = new PrismaUserRepository(prisma);
  const sessions = new PrismaSessionRepository(prisma);
  const passwordHasher = new ScryptPasswordHasher();

  return {
    userService: new UserService({ users, passwordHasher, clock: systemClock }),
    sessionService: new SessionService({
      users,
      sessions,
      passwordHasher,
      clock: systemClock,
      sessionTtlMs: env.SESSION_TTL_HOURS * HOUR_MS,
    }),
    checkDatabase: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    dispose: () => prisma.$disconnect(),
  };
}
