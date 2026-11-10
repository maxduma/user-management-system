import LogoutIcon from '@mui/icons-material/Logout';
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router';
import { useAuth, useAuthenticatedUser } from '../auth/auth-context';
import { BrandMark } from '../components/BrandMark';

/** Shell for authenticated pages: header with greeting and log out. */
export function AppLayout() {
  const user = useAuthenticatedUser();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    // RequireAuth sends the user to the sign-in page once the session is gone.
    await signOut();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          <BrandMark size="small" />
          <Box sx={{ flexGrow: 1 }} />
          <Typography
            sx={{ fontWeight: 500, display: { xs: 'none', sm: 'block' } }}
            data-testid="greeting"
          >
            Hello {user.firstName}
          </Typography>
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
            loading={signingOut}
          >
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
