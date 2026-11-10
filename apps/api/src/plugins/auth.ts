import { idSchema } from '@ums/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { UnauthorizedError } from '../common/errors';
import { InvalidSessionError } from '../modules/sessions/session.errors';
import type { SessionService } from '../modules/sessions/session.service';
import type { SessionWithUser } from '../modules/sessions/session.types';

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated by `app.authenticate` for protected routes. */
    auth: SessionWithUser | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

export interface AuthPluginOptions {
  sessionService: SessionService;
}

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

/**
 * Session-based authentication. Clients send the session id received on
 * sign-in/sign-up as `Authorization: Bearer <sessionId>`.
 */
export const authPlugin = fp<AuthPluginOptions>(
  async (app: FastifyInstance, { sessionService }) => {
    app.decorateRequest('auth', null);

    app.decorate('authenticate', async (request: FastifyRequest) => {
      const token = request.headers.authorization?.match(BEARER_PATTERN)?.[1];
      if (!token) throw new UnauthorizedError();
      // Reject malformed identifiers before touching the database.
      if (!idSchema.safeParse(token).success) throw new InvalidSessionError();
      request.auth = await sessionService.authenticate(token);
    });
  },
  { name: 'auth' },
);

/** Returns the authenticated context; only call from protected routes. */
export function requireAuth(request: FastifyRequest): SessionWithUser {
  if (!request.auth) throw new UnauthorizedError();
  return request.auth;
}
