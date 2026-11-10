import { z } from 'zod';

/**
 * Machine-readable error codes returned by the API. The web client relies on
 * these (never on messages) to decide how to present a failure.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_INVALID: 'SESSION_INVALID',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  CANNOT_MODIFY_SELF: 'CANNOT_MODIFY_SELF',
  USER_INACTIVE_NAME_LOCKED: 'USER_INACTIVE_NAME_LOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const errorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
