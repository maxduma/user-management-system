import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export interface HealthRoutesOptions {
  /** Resolves when the database is reachable; rejects otherwise. */
  checkDatabase: () => Promise<void>;
}

const healthResponse = z.object({ status: z.literal('ok') });

export const healthRoutes: FastifyPluginAsyncZod<HealthRoutesOptions> = async (app, options) => {
  app.get(
    '/health',
    {
      config: { rateLimit: false },
      schema: {
        tags: ['health'],
        summary: 'Liveness probe',
        response: { 200: healthResponse },
      },
    },
    async () => ({ status: 'ok' as const }),
  );

  app.get(
    '/health/ready',
    {
      config: { rateLimit: false },
      schema: {
        tags: ['health'],
        summary: 'Readiness probe (checks database connectivity)',
        response: { 200: healthResponse },
      },
    },
    async () => {
      await options.checkDatabase();
      return { status: 'ok' as const };
    },
  );
};
