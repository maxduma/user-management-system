import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  TablePagination,
  Typography,
} from '@mui/material';
import { type UserDto, USERS_PAGE_SIZE } from '@ums/shared';
import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useAuthenticatedUser } from '../auth/auth-context';
import { DeleteUserDialog } from '../features/users/DeleteUserDialog';
import { UserFormDialog } from '../features/users/UserFormDialog';
import { UsersTable } from '../features/users/UsersTable';
import { useUsersPage } from '../features/users/use-users';

type DialogState =
  { type: 'create' } | { type: 'edit'; user: UserDto } | { type: 'delete'; user: UserDto } | null;

/** User management dashboard: paginated list (6 per page) with CRUD actions. */
export function DashboardPage() {
  const currentUser = useAuthenticatedUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const [dialog, setDialog] = useState<DialogState>(null);

  const { data, error, isFetching, refetch } = useUsersPage(page);

  // e.g. the last user of the last page was deleted, or a stale bookmarked URL.
  if (data && data.totalPages > 0 && page > data.totalPages) {
    return <Navigate replace to={{ search: `?page=${data.totalPages}` }} />;
  }

  const goToPage = (zeroBasedPage: number) =>
    setSearchParams(zeroBasedPage === 0 ? {} : { page: String(zeroBasedPage + 1) });

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <div>
          <Typography variant="h5" component="h1">
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data ? `${data.total} user${data.total === 1 ? '' : 's'} in total` : 'Loading…'}
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<PersonAddAlt1Icon />}
          onClick={() => setDialog({ type: 'create' })}
        >
          New user
        </Button>
      </Stack>

      {error && !data ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Could not load users: {error.message}
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Box sx={{ height: 4 }}>{isFetching && data && <LinearProgress />}</Box>
          <UsersTable
            users={data?.items}
            currentUserId={currentUser.id}
            onEdit={(user) => setDialog({ type: 'edit', user })}
            onDelete={(user) => setDialog({ type: 'delete', user })}
          />
          <TablePagination
            component="div"
            count={data?.total ?? 0}
            page={data ? page - 1 : 0}
            rowsPerPage={USERS_PAGE_SIZE}
            rowsPerPageOptions={[]}
            onPageChange={(_event, nextPage) => goToPage(nextPage)}
          />
        </Paper>
      )}

      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <UserFormDialog
          user={dialog.type === 'edit' ? dialog.user : undefined}
          currentUserId={currentUser.id}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'delete' && (
        <DeleteUserDialog user={dialog.user} onClose={() => setDialog(null)} />
      )}
    </Stack>
  );
}
