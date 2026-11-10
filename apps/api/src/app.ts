import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Env } from './config/env';
import { healthRoutes } from './modules/health/health.routes';
import { sessionRoutes } from './modules/sessions/session.routes';
import type { SessionService } from './modules/sessions/session.service';
import { userRoutes } from './modules/users/user.routes';
import type { UserService } from './modules/users/user.service';
import { authPlugin } from './plugins/auth';
import { errorHandlerPlugin } from './plugins/error-handler';

export type AppConfig = Pick<Env, 'LOG_LEVEL' | 'TRUST_PROXY'>;

export interface AppDependencies {
  config: AppConfig;
  userService: UserService;
  sessionService: SessionService;
  checkDatabase: () => Promise<void>;
  /** Override the logger (tests pass `false`). */
  logger?: FastifyServerOptions['logger'];
}

/**
 * Application factory. All collaborators are injected so the very same app
 * can run against PostgreSQL (server.ts) or in-memory fakes (tests).
 */
export async function buildApp(deps: AppDependencies) {
  const { config } = deps;

  const app = Fastify({
    logger: deps.logger ?? {
      level: config.LOG_LEVEL,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    trustProxy: config.TRUST_PROXY,
    bodyLimit: 64 * 1024,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Echo the request id so clients and logs can be correlated.
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  await app.register(errorHandlerPlugin);
  await app.register(authPlugin, { sessionService: deps.sessionService });

  await app.register(
    async (api) => {
      await api.register(healthRoutes, { checkDatabase: deps.checkDatabase });
      await api.register(sessionRoutes, { sessionService: deps.sessionService });
      await api.register(userRoutes, { userService: deps.userService });
    },
    { prefix: '/api' },
  );

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
