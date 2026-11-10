import {
  sessionIdParamsSchema,
  sessionWithUserSchema,
  signInRequestSchema,
  signUpRequestSchema,
} from '@ums/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../../plugins/auth';
import { toSessionWithUserDto } from './session.mapper';
import type { SessionService } from './session.service';

export interface SessionRoutesOptions {
  sessionService: SessionService;
}

export const sessionRoutes: FastifyPluginAsyncZod<SessionRoutesOptions> = async (
  app,
  { sessionService },
) => {
  app.post(
    '/auth/sign-up',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register a new user and open their first session',
        body: signUpRequestSchema,
        response: { 201: sessionWithUserSchema },
      },
    },
    async (request, reply) => {
      const result = await sessionService.signUp(request.body);
      return reply.status(201).send(toSessionWithUserDto(result));
    },
  );

  app.post(
    '/sessions',
    {
      schema: {
        tags: ['sessions'],
        summary: 'Sign in (create a new session)',
        body: signInRequestSchema,
        response: { 201: sessionWithUserSchema },
      },
    },
    async (request, reply) => {
      const result = await sessionService.signIn(request.body);
      return reply.status(201).send(toSessionWithUserDto(result));
    },
  );

  app.get(
    '/sessions/current',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['sessions'],
        summary: 'Get the session identified by the bearer token',
        security: [{ bearerAuth: [] }],
        response: { 200: sessionWithUserSchema },
      },
    },
    async (request) => toSessionWithUserDto(requireAuth(request)),
  );

  app.delete(
    '/sessions/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['sessions'],
        summary: 'Terminate one of your sessions (sign out)',
        security: [{ bearerAuth: [] }],
        params: sessionIdParamsSchema,
        response: { 204: z.null().describe('Session terminated') },
      },
    },
    async (request, reply) => {
      await sessionService.terminate(requireAuth(request).user.id, request.params.id);
      return reply.status(204).send(null);
    },
  );
};
