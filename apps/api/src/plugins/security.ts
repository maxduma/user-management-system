import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export interface SecurityPluginOptions {
  /** Allowed browser origins; empty = same-origin only (no CORS headers). */
  corsOrigins: string[];
  /** Requests per minute per client IP. */
  rateLimitMax: number;
}

export const securityPlugin = fp<SecurityPluginOptions>(
  async (app: FastifyInstance, { corsOrigins, rateLimitMax }) => {
    await app.register(helmet);

    if (corsOrigins.length > 0) {
      await app.register(cors, {
        origin: corsOrigins,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
        exposedHeaders: ['X-Request-Id'],
        maxAge: 600,
      });
    }

    // Routes can override the limit through `config.rateLimit`.
    await app.register(rateLimit, { global: true, max: rateLimitMax, timeWindow: '1 minute' });
  },
  { name: 'security' },
);
