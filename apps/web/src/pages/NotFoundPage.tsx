import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';

export function NotFoundPage() {
  return (
    <Box
      component="main"
      sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}
    >
      <div>
        <Typography variant="h3" component="h1" gutterBottom>
          404
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          The page you are looking for does not exist.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Go home
        </Button>
      </div>
    </Box>
  );
}
