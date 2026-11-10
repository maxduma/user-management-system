import { Box, Paper } from '@mui/material';
import { Outlet } from 'react-router';
import { BrandMark } from '../components/BrandMark';
import { ThemeModeToggle } from '../theme/ThemeModeToggle';

/** Centered card used by the sign-up and sign-in pages. */
export function AuthLayout() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 4,
        bgcolor: 'background.default',
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
        <ThemeModeToggle />
      </Box>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <BrandMark />
        </Box>
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
          <Outlet />
        </Paper>
      </Box>
    </Box>
  );
}
