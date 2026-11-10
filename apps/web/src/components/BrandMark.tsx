import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { Avatar, Stack, Typography } from '@mui/material';

export function BrandMark({ size = 'medium' }: { size?: 'small' | 'medium' }) {
  const small = size === 'small';
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Avatar
        variant="rounded"
        sx={{ bgcolor: 'primary.main', width: small ? 32 : 40, height: small ? 32 : 40 }}
      >
        <ManageAccountsIcon fontSize={small ? 'small' : 'medium'} />
      </Avatar>
      <Typography variant={small ? 'subtitle1' : 'h6'} component="span" sx={{ fontWeight: 700 }}>
        User Management
      </Typography>
    </Stack>
  );
}
