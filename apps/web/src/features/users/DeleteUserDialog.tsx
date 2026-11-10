import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { UserDto } from '@ums/shared';
import { isApiError } from '../../api/http';
import { useNotify } from '../../components/notifications/notifications-context';
import { fullName } from './format';
import { useDeleteUser } from './use-users';

interface DeleteUserDialogProps {
  user: UserDto;
  onClose: () => void;
}

export function DeleteUserDialog({ user, onClose }: DeleteUserDialogProps) {
  const notify = useNotify();
  const deleteUser = useDeleteUser();

  const confirm = async () => {
    try {
      await deleteUser.mutateAsync(user.id);
      notify('User deleted');
      onClose();
    } catch (error) {
      notify(isApiError(error) ? error.message : 'Could not delete the user', 'error');
    }
  };

  return (
    <Dialog
      open
      onClose={deleteUser.isPending ? undefined : onClose}
      aria-labelledby="delete-user-title"
      aria-describedby="delete-user-description"
    >
      <DialogTitle id="delete-user-title">Delete user?</DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-user-description">
          {fullName(user)} ({user.email}) and all of their sessions will be permanently removed.
          This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={deleteUser.isPending}>
          Cancel
        </Button>
        <Button color="error" variant="contained" onClick={confirm} loading={deleteUser.isPending}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
