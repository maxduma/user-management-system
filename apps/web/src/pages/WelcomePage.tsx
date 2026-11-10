import LogoutIcon from '@mui/icons-material/Logout';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth, useAuthenticatedUser } from '../auth/auth-context';

export function WelcomePage() {
  const user = useAuthenticatedUser();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    // The guard sends the user to the sign-in page once the session is gone.
    await signOut();
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', maxWidth: 480, width: '100%' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Hello {user.firstName}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          You are signed in as {user.email}.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={handleSignOut}
          loading={signingOut}
        >
          Log out
        </Button>
      </Paper>
    </Box>
  );
}
