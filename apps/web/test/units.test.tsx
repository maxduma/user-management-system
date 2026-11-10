import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/http';
import { applyServerError } from '../src/components/form/server-errors';
import { createQueryClient } from '../src/query-client';
import { renderApp } from './utils/render-app';

describe('applyServerError', () => {
  const fields = ['email', 'password'] as const;

  it('maps API validation details onto known fields', () => {
    const setError = vi.fn();
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { path: 'body.email', message: 'Invalid e-mail' },
    ]);

    expect(applyServerError(error, setError, fields)).toBeNull();
    expect(setError).toHaveBeenCalledWith('email', { message: 'Invalid e-mail' });
  });

  it('falls back to a form-level message for unknown fields', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { path: 'querystring.page', message: 'Too small' },
    ]);

    expect(applyServerError(error, vi.fn(), fields)).toBe('Request validation failed');
  });

  it('puts EMAIL_TAKEN on the e-mail field', () => {
    const setError = vi.fn();

    applyServerError(new ApiError(409, 'EMAIL_TAKEN', 'Taken'), setError, fields);

    expect(setError).toHaveBeenCalledWith('email', { message: 'Taken' }, { shouldFocus: true });
  });

  it('returns a generic message for unexpected errors', () => {
    expect(applyServerError(new Error('boom'), vi.fn(), fields)).toMatch(/something went wrong/i);
  });
});

describe('createQueryClient', () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry as (
    failureCount: number,
    error: unknown,
  ) => boolean;

  it('does not retry client errors', () => {
    expect(retry(0, new ApiError(404, 'USER_NOT_FOUND', 'Not found'))).toBe(false);
  });

  it('retries network and server errors twice', () => {
    const serverError = new ApiError(503, 'UNKNOWN_ERROR', 'Unavailable');
    expect(retry(0, serverError)).toBe(true);
    expect(retry(1, serverError)).toBe(true);
    expect(retry(2, serverError)).toBe(false);
  });
});

describe('PasswordField', () => {
  it('toggles password visibility', async () => {
    const { user } = renderApp('/sign-in');
    const input = await screen.findByLabelText(/^password/i, { selector: 'input' });
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));

    expect(input).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
