import { z } from 'zod';
import { emailSchema, idSchema, isoDateTimeSchema, nameSchema, passwordSchema } from './common';
import { userSchema } from './user';

export const sessionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  createdAt: isoDateTimeSchema,
  terminatedAt: isoDateTimeSchema.nullable(),
});
export type SessionDto = z.infer<typeof sessionSchema>;

/**
 * Returned by sign-in, sign-up and "current session". `id` is the session
 * identifier the client must send on every subsequent request.
 */
export const sessionWithUserSchema = sessionSchema.extend({ user: userSchema });
export type SessionWithUserDto = z.infer<typeof sessionWithUserSchema>;

export const sessionIdParamsSchema = z.object({ id: idSchema });

export const signInRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Required' }),
});
export type SignInRequest = z.infer<typeof signInRequestSchema>;

export const signUpRequestSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpRequest = z.infer<typeof signUpRequestSchema>;

/**
 * Client-side sign-up form: the password is typed twice and both values must
 * match before the sign-up request is sent to the backend.
 */
export const signUpFormSchema = signUpRequestSchema
  .extend({ confirmPassword: z.string().min(1, { error: 'Required' }) })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match',
  });
export type SignUpForm = z.infer<typeof signUpFormSchema>;
