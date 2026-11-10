import { z } from 'zod';
import {
  emailSchema,
  idSchema,
  isoDateTimeSchema,
  nameSchema,
  paginatedSchema,
  passwordSchema,
} from './common';

export const USER_STATUSES = ['active', 'inactive'] as const;
export const userStatusSchema = z.enum(USER_STATUSES);
export type UserStatus = z.infer<typeof userStatusSchema>;

/** Public representation of a user. Credentials are never exposed. */
export const userSchema = z.object({
  id: idSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  status: userStatusSchema,
  loginsCount: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type UserDto = z.infer<typeof userSchema>;

export const userListSchema = paginatedSchema(userSchema);
export type UserListDto = z.infer<typeof userListSchema>;

export const userIdParamsSchema = z.object({ id: idSchema });

/** Admin "create user" payload. */
export const createUserRequestSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  status: userStatusSchema.default('active'),
});
export type CreateUserRequest = z.input<typeof createUserRequestSchema>;

/**
 * Partial update. The object is strict so attempts to change immutable or
 * server-managed fields (id, createdAt, updatedAt, loginsCount) are rejected
 * with a validation error instead of being silently ignored.
 */
export const updateUserRequestSchema = z
  .strictObject({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    email: emailSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: 'At least one field must be provided',
  });
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
