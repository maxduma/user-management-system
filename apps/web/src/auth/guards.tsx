import { Alert, Box, Button } from '@mui/material';
import { Navigate, Outlet } from 'react-router';
import { FullPageLoader } from '../components/FullPageLoader';
import { type AuthContextValue, useAuth } from './auth-context';

export const HOME_PATH = '/dashboard';

function SessionCheckFailed({ auth }: { auth: Extract<AuthContextValue, { status: 'error' }> }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={auth.retry}>
            Retry
          </Button>
        }
      >
        {auth.error.message}
      </Alert>
    </Box>
  );
}

/**
 * Protects private routes. Visitors without a session land on the sign-up
 * page; after signing out (or when a session expires) they land on sign-in.
 */
export function RequireAuth() {
  const auth = useAuth();

  if (auth.status === 'loading') return <FullPageLoader />;
  if (auth.status === 'error') return <SessionCheckFailed auth={auth} />;
  if (auth.status === 'anonymous') {
    return auth.reason ? (
      <Navigate to="/sign-in" replace state={{ reason: auth.reason }} />
    ) : (
      <Navigate to="/sign-up" replace />
    );
  }
  return <Outlet />;
}

/** Sign-in / sign-up are only for anonymous visitors. */
export function RedirectIfAuthenticated() {
  const auth = useAuth();

  if (auth.status === 'loading') return <FullPageLoader />;
  if (auth.status === 'authenticated') return <Navigate to={HOME_PATH} replace />;
  return <Outlet />;
}
