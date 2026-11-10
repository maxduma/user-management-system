import { z } from 'zod';

/** Fixed page size required by the user-management dashboard. */
export const USERS_PAGE_SIZE = 6;
export const MAX_PAGE_SIZE = 100;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;

export const idSchema = z.uuid({ error: 'Must be a valid UUID' });

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Trimmed, non-empty human name (first or last name). */
export const nameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Required' })
  .max(NAME_MAX_LENGTH, { error: `Must be at most ${NAME_MAX_LENGTH} characters` });

/** E-mail addresses are normalised (trimmed + lower-cased) before validation. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: 'Required' })
  .max(EMAIL_MAX_LENGTH, { error: `Must be at most ${EMAIL_MAX_LENGTH} characters` })
  .pipe(z.email({ error: 'Must be a valid e-mail address' }));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: `Must be at least ${PASSWORD_MIN_LENGTH} characters` })
  .max(PASSWORD_MAX_LENGTH, { error: `Must be at most ${PASSWORD_MAX_LENGTH} characters` });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(USERS_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  });

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
