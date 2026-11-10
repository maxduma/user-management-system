import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { type UserDto, USERS_PAGE_SIZE } from '@ums/shared';
import { formatDateTime, fullName, initials } from './format';

interface UsersTableProps {
  users: UserDto[] | undefined;
  currentUserId: string;
  onEdit: (user: UserDto) => void;
  onDelete: (user: UserDto) => void;
}

const COLUMNS = ['User', 'Status', 'Logins', 'Created', 'Last updated', 'Actions'];

function LoadingRows() {
  return Array.from({ length: USERS_PAGE_SIZE }, (_, row) => (
    <TableRow key={row} aria-hidden>
      {COLUMNS.map((column) => (
        <TableCell key={column}>
          <Skeleton />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function UsersTable({ users, currentUserId, onEdit, onDelete }: UsersTableProps) {
  return (
    <TableContainer>
      <Table aria-label="Users" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableCell
                key={column}
                align={column === 'Logins' || column === 'Actions' ? 'right' : 'left'}
              >
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {!users ? (
            <LoadingRows />
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6 }}>
                <Typography color="text.secondary">No users yet.</Typography>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const name = fullName(user);
              const isSelf = user.id === currentUserId;
              const active = user.status === 'active';
              return (
                <TableRow key={user.id} hover data-testid="user-row">
                  <TableCell>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Avatar
                        sx={{ width: 36, height: 36, fontSize: 14, bgcolor: 'primary.main' }}
                        aria-hidden
                      >
                        {initials(user)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography component="div" sx={{ fontWeight: 600 }} noWrap>
                          {name}
                          {isSelf && (
                            <Chip label="You" size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {user.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={active ? 'Active' : 'Inactive'}
                      color={active ? 'success' : 'default'}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{user.loginsCount}</TableCell>
                  <TableCell>{formatDateTime(user.createdAt)}</TableCell>
                  <TableCell>{formatDateTime(user.updatedAt)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Edit">
                      <IconButton aria-label={`Edit ${name}`} onClick={() => onEdit(user)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={isSelf ? 'You cannot delete your own account' : 'Delete'}>
                      <span>
                        <IconButton
                          aria-label={`Delete ${name}`}
                          onClick={() => onDelete(user)}
                          disabled={isSelf}
                          color="error"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
