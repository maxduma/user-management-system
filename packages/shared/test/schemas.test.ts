import { describe, expect, it } from 'vitest';
import {
  createUserRequestSchema,
  emailSchema,
  paginationQuerySchema,
  signUpFormSchema,
  updateUserRequestSchema,
  USERS_PAGE_SIZE,
} from '../src';

const validSignUp = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse',
  confirmPassword: 'correct-horse',
};

describe('emailSchema', () => {
  it('normalises e-mails by trimming and lower-casing them', () => {
    expect(emailSchema.parse('  Ada@Example.COM ')).toBe('ada@example.com');
  });

  it('rejects malformed e-mails', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('   ').success).toBe(false);
  });
});

describe('signUpFormSchema', () => {
  it('accepts matching passwords', () => {
    expect(signUpFormSchema.safeParse(validSignUp).success).toBe(true);
  });

  it('rejects mismatching passwords on the confirmPassword field', () => {
    const result = signUpFormSchema.safeParse({ ...validSignUp, confirmPassword: 'different' });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['confirmPassword'], message: 'Passwords do not match' }),
    ]);
  });

  it('enforces the minimum password length', () => {
    const result = signUpFormSchema.safeParse({
      ...validSignUp,
      password: 'short',
      confirmPassword: 'short',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['password']);
  });

  it('rejects blank names after trimming', () => {
    expect(signUpFormSchema.safeParse({ ...validSignUp, firstName: '   ' }).success).toBe(false);
  });
});

describe('createUserRequestSchema', () => {
  it('defaults status to active', () => {
    const { confirmPassword: _ignored, ...payload } = validSignUp;
    expect(createUserRequestSchema.parse(payload).status).toBe('active');
  });
});

describe('updateUserRequestSchema', () => {
  it('accepts a partial update', () => {
    expect(updateUserRequestSchema.parse({ status: 'inactive' })).toEqual({ status: 'inactive' });
  });

  it('rejects an empty update', () => {
    expect(updateUserRequestSchema.safeParse({}).success).toBe(false);
  });

  it.each(['id', 'createdAt', 'updatedAt', 'loginsCount'])(
    'rejects attempts to change the server-managed field "%s"',
    (field) => {
      const result = updateUserRequestSchema.safeParse({ firstName: 'Ada', [field]: 'x' });
      expect(result.success).toBe(false);
    },
  );
});

describe('paginationQuerySchema', () => {
  it('defaults to the first page with the dashboard page size', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: USERS_PAGE_SIZE });
  });

  it('coerces query-string values', () => {
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '10' })).toEqual({
      page: 3,
      pageSize: 10,
    });
  });

  it('rejects out-of-range values', () => {
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ pageSize: '1000' }).success).toBe(false);
  });
});
