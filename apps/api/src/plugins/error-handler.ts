import { type ApiErrorBody, ErrorCode } from '@ums/shared';
import type { FastifyError, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError } from '../common/errors';

function body(code: string, message: string, details?: ApiErrorBody['error']['details']) {
  return { error: { code, message, ...(details ? { details } : {}) } } satisfies ApiErrorBody;
}

/**
 * Translates every failure into the uniform `{ error: { code, message } }`
 * shape. Internal errors are logged with their stack but never leaked.
 */
export const errorHandlerPlugin = fp(
  async (app: FastifyInstance) => {
    app.setErrorHandler((error: FastifyError, request, reply) => {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send(body(error.code, error.message, error.details));
      }

      if (hasZodFastifySchemaValidationErrors(error)) {
        const details = error.validation.map((issue) => ({
          path: [error.validationContext, ...issue.instancePath.split('/').filter(Boolean)].join(
            '.',
          ),
          message: issue.message ?? 'Invalid value',
        }));
        return reply
          .status(400)
          .send(body(ErrorCode.VALIDATION_ERROR, 'Request validation failed', details));
      }

      const statusCode = error.statusCode ?? 500;

      if (statusCode === 429) {
        return reply
          .status(429)
          .send(body(ErrorCode.RATE_LIMITED, 'Too many requests, please try again later'));
      }

      if (statusCode >= 400 && statusCode < 500) {
        // Framework-level client errors (malformed JSON, unsupported media type, ...).
        return reply.status(statusCode).send(body(ErrorCode.BAD_REQUEST, error.message));
      }

      request.log.error({ err: error }, 'Unhandled error');
      return reply.status(500).send(body(ErrorCode.INTERNAL_ERROR, 'Internal server error'));
    });

    app.setNotFoundHandler((request, reply) =>
      reply
        .status(404)
        .send(body(ErrorCode.ROUTE_NOT_FOUND, `Route ${request.method} ${request.url} not found`)),
    );
  },
  { name: 'error-handler' },
);
