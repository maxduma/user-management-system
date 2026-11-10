import {
  createUserRequestSchema,
  paginationQuerySchema,
  updateUserRequestSchema,
  userIdParamsSchema,
  userListSchema,
  userSchema,
} from '@ums/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../../plugins/auth';
import { toUserDto } from './user.mapper';
import type { UserService } from './user.service';

export interface UserRoutesOptions {
  userService: UserService;
}

const security = [{ bearerAuth: [] }];

/** Admin user management. Every route requires an authenticated session. */
export const userRoutes: FastifyPluginAsyncZod<UserRoutesOptions> = async (
  app,
  { userService },
) => {
  // onRequest runs before body parsing/validation: anonymous callers get 401.
  app.addHook('onRequest', app.authenticate);

  app.get(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'List users (paginated, newest first)',
        security,
        querystring: paginationQuerySchema,
        response: { 200: userListSchema },
      },
    },
    async (request) => {
      const result = await userService.list(request.query);
      return { ...result, items: result.items.map(toUserDto) };
    },
  );

  app.get(
    '/users/:id',
    {
      schema: {
        tags: ['users'],
        summary: 'Get a user',
        security,
        params: userIdParamsSchema,
        response: { 200: userSchema },
      },
    },
    async (request) => toUserDto(await userService.getById(request.params.id)),
  );

  app.post(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Create a user',
        security,
        body: createUserRequestSchema,
        response: { 201: userSchema },
      },
    },
    async (request, reply) => {
      const user = await userService.create(request.body);
      return reply.status(201).send(toUserDto(user));
    },
  );

  app.patch(
    '/users/:id',
    {
      schema: {
        tags: ['users'],
        summary: "Update a user's information",
        security,
        params: userIdParamsSchema,
        body: updateUserRequestSchema,
        response: { 200: userSchema },
      },
    },
    async (request) => {
      const actorId = requireAuth(request).user.id;
      return toUserDto(await userService.update(actorId, request.params.id, request.body));
    },
  );

  app.delete(
    '/users/:id',
    {
      schema: {
        tags: ['users'],
        summary: 'Delete a user (and their sessions)',
        security,
        params: userIdParamsSchema,
        response: { 204: z.null().describe('User deleted') },
      },
    },
    async (request, reply) => {
      await userService.remove(requireAuth(request).user.id, request.params.id);
      return reply.status(204).send(null);
    },
  );
};
