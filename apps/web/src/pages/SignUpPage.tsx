import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Link, Stack, Typography } from '@mui/material';
import { signUpFormSchema } from '@ums/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { FormTextField } from '../components/form/FormTextField';
import { PasswordField } from '../components/form/PasswordField';
import { applyServerError } from '../components/form/server-errors';

const FIELDS = ['firstName', 'lastName', 'email', 'password'] as const;

export function SignUpPage() {
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(signUpFormSchema),
    mode: 'onTouched',
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  // The schema guarantees both passwords match before the request is sent.
  const onSubmit = handleSubmit(async ({ confirmPassword: _confirmed, ...values }) => {
    setFormError(null);
    try {
      // On success the session is established and the route guard redirects.
      await signUp(values);
    } catch (error) {
      setFormError(applyServerError(error, setError, FIELDS));
    }
  });

  return (
    <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit}>
      <div>
        <Typography variant="h5" component="h1" gutterBottom>
          Create your account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Register to access the back-office.
        </Typography>
      </div>

      {formError && <Alert severity="error">{formError}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormTextField
          control={control}
          name="firstName"
          label="First name"
          autoComplete="given-name"
          required
        />
        <FormTextField
          control={control}
          name="lastName"
          label="Last name"
          autoComplete="family-name"
          required
        />
      </Stack>
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
        autoComplete="new-password"
        helperText="At least 8 characters"
        required
      />
      <PasswordField
        control={control}
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        required
      />

      <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
        Sign up
      </Button>

      <Typography variant="body2" sx={{ textAlign: 'center' }}>
        Already have an account?{' '}
        <Link component={RouterLink} to="/sign-in">
          Sign in
        </Link>
      </Typography>
    </Stack>
  );
}
