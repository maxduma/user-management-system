import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { Avatar, Stack, Typography } from '@mui/material';

interface BrandMarkProps {
  size?: 'small' | 'medium';
  /** Hide the product name on narrow screens (keeps the header uncluttered). */
  compactOnMobile?: boolean;
}

export function BrandMark({ size = 'medium', compactOnMobile = false }: BrandMarkProps) {
  const small = size === 'small';
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Avatar
        variant="rounded"
        sx={{ bgcolor: 'primary.main', width: small ? 32 : 40, height: small ? 32 : 40 }}
      >
        <ManageAccountsIcon fontSize={small ? 'small' : 'medium'} />
      </Avatar>
      <Typography
        variant={small ? 'subtitle1' : 'h6'}
        component="span"
        sx={{
          fontWeight: 700,
          display: compactOnMobile ? { xs: 'none', sm: 'inline' } : undefined,
        }}
      >
        User Management
      </Typography>
    </Stack>
  );
}
