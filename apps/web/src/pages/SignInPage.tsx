import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Link, Stack, Typography } from '@mui/material';
import { ErrorCode, signInRequestSchema } from '@ums/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation } from 'react-router';
import { isApiError } from '../api/http';
import type { AnonymousReason } from '../auth/auth-context';
import { useAuth } from '../auth/auth-context';
import { FormTextField } from '../components/form/FormTextField';
import { PasswordField } from '../components/form/PasswordField';
import { applyServerError } from '../components/form/server-errors';

const FIELDS = ['email', 'password'] as const;

const REASON_MESSAGES: Record<AnonymousReason, string> = {
  'signed-out': 'You have been signed out.',
  expired: 'Your session has expired. Please sign in again.',
};

export function SignInPage() {
  const { signIn } = useAuth();
  const location = useLocation();
  const reason = (location.state as { reason?: AnonymousReason } | null)?.reason;
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(signInRequestSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values);
    } catch (error) {
      if (isApiError(error, ErrorCode.INVALID_CREDENTIALS)) {
        setFormError('Invalid email or password.');
      } else if (isApiError(error, ErrorCode.USER_INACTIVE)) {
        setFormError('Your account is inactive. Please contact an administrator.');
      } else {
        setFormError(applyServerError(error, setError, FIELDS));
      }
    }
  });

  return (
    <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit}>
      <div>
        <Typography variant="h5" component="h1" gutterBottom>
          Sign in
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welcome back! Enter your credentials to continue.
        </Typography>
      </div>

      {formError ? (
        <Alert severity="error">{formError}</Alert>
      ) : (
        reason && <Alert severity="info">{REASON_MESSAGES[reason]}</Alert>
      )}

      <FormTextField
        control={control}
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
      />
      <PasswordField
        control={control}
        name="password"
        label="Password"
        autoComplete="current-password"
        required
      />

      <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
        Sign in
      </Button>

      <Typography variant="body2" sx={{ textAlign: 'center' }}>
        Don&apos;t have an account?{' '}
        <Link component={RouterLink} to="/sign-up">
          Sign up
        </Link>
      </Typography>
    </Stack>
  );
}
