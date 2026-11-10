import type { Env } from './config/env';
import { createPrismaClient } from './infrastructure/prisma';

/**
 * Composition root: the only place that knows about concrete
 * implementations. Everything else depends on interfaces.
 */
export function createContainer(env: Env) {
  const prisma = createPrismaClient(env.DATABASE_URL);

  return {
    checkDatabase: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
    dispose: () => prisma.$disconnect(),
  };
}
