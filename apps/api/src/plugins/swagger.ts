import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

/** OpenAPI 3.1 document generated from the zod route schemas + Swagger UI at /api/docs. */
export const swaggerPlugin = fp(
  async (app: FastifyInstance) => {
    await app.register(swagger, {
      openapi: {
        openapi: '3.1.0',
        info: {
          title: 'User Management API',
          description:
            'Back-office API for user and session management. Authenticate with the session ' +
            'id returned by sign-in / sign-up: `Authorization: Bearer <sessionId>`.',
          version: '1.0.0',
        },
        tags: [
          { name: 'auth', description: 'Registration' },
          { name: 'sessions', description: 'Sign-in / sign-out' },
          { name: 'users', description: 'User management (authenticated)' },
          { name: 'health', description: 'Probes' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', description: 'Session id' },
          },
        },
      },
      transform: jsonSchemaTransform,
    });

    await app.register(swaggerUi, {
      routePrefix: '/api/docs',
      uiConfig: { validatorUrl: null, persistAuthorization: true },
    });
  },
  { name: 'swagger' },
);
