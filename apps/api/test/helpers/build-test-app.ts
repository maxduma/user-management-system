import { type AppConfig, buildApp } from '../../src/app';
import { createTestContext, newUserInput } from './test-context';

/** Real Fastify app (routes, validation, error handling) over in-memory adapters. */
export async function buildTestApp(config: Partial<AppConfig> = {}) {
  const context = createTestContext();
  const app = await buildApp({
    config: {
      LOG_LEVEL: 'silent',
      TRUST_PROXY: false,
      CORS_ORIGIN: [],
      RATE_LIMIT_MAX: 10_000,
      AUTH_RATE_LIMIT_MAX: 10_000,
      SWAGGER_ENABLED: false,
      ...config,
    },
    userService: context.userService,
    sessionService: context.sessionService,
    checkDatabase: async () => {},
    logger: false,
  });

  /** Signs up a fresh user over HTTP and returns the session + auth header. */
  async function signUp(overrides: Partial<Record<string, string>> = {}) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-up',
      payload: newUserInput(overrides),
    });
    const body = response.json<{ id: string; userId: string }>();
    return { ...body, headers: { authorization: `Bearer ${body.id}` } };
  }

  return { app, ...context, signUp };
}
