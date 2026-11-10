import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  type UpdateUserRequest,
  type UserDto,
  userStatusSchema,
} from '@ums/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormTextField } from '../../components/form/FormTextField';
import { PasswordField } from '../../components/form/PasswordField';
import { applyServerError } from '../../components/form/server-errors';
import { useNotify } from '../../components/notifications/notifications-context';
import { useCreateUser, useUpdateUser } from './use-users';

const createSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  status: userStatusSchema,
});
// Passwords are not edited from the dashboard; the field is not rendered in edit mode.
const editSchema = createSchema.extend({ password: z.string() });

const FIELDS = ['firstName', 'lastName', 'email', 'password', 'status'] as const;
const EDITABLE = ['firstName', 'lastName', 'email', 'status'] as const;

interface UserFormDialogProps {
  /** The user to edit; omit to create a new one. */
  user?: UserDto;
  currentUserId: string;
  onClose: () => void;
}

export function UserFormDialog({ user, currentUserId, onClose }: UserFormDialogProps) {
  const isEdit = user !== undefined;
  const isSelf = user?.id === currentUserId;
  // Mirrors the API rule: names are locked while the *stored* status is inactive.
  const namesLocked = user?.status === 'inactive';

  const notify = useNotify();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(currentUserId);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      password: '',
      status: user?.status ?? 'active',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (!user) {
        await createUser.mutateAsync(values);
        notify('User created');
      } else {
        // Send only what actually changed (PATCH semantics).
        const changes = Object.fromEntries(
          EDITABLE.filter((field) => values[field] !== user[field]).map((field) => [
            field,
            values[field],
          ]),
        ) as UpdateUserRequest;
        if (Object.keys(changes).length > 0) {
          await updateUser.mutateAsync({ id: user.id, changes });
          notify('User updated');
        }
      }
      onClose();
    } catch (error) {
      setFormError(applyServerError(error, setError, FIELDS));
    }
  });

  return (
    <Dialog
      open
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="user-form-title"
    >
      <DialogTitle id="user-form-title">{isEdit ? 'Edit user' : 'New user'}</DialogTitle>
      <DialogContent>
        <Stack
          id="user-form"
          component="form"
          noValidate
          onSubmit={onSubmit}
          spacing={2.5}
          sx={{ pt: 1 }}
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          {namesLocked && (
            <Alert severity="info">
              This user is inactive. First and last name can only be changed after the user has been
              activated.
            </Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField
              control={control}
              name="firstName"
              label="First name"
              disabled={namesLocked}
              required
            />
            <FormTextField
              control={control}
              name="lastName"
              label="Last name"
              disabled={namesLocked}
              required
            />
          </Stack>
          <FormTextField control={control} name="email" label="Email" type="email" required />
          {!isEdit && (
            <PasswordField
              control={control}
              name="password"
              label="Password"
              autoComplete="new-password"
              helperText="At least 8 characters"
              required
            />
          )}
          <FormTextField
            control={control}
            name="status"
            label="Status"
            select
            disabled={isSelf}
            helperText={isSelf ? 'You cannot deactivate your own account' : undefined}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </FormTextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" form="user-form" variant="contained" loading={isSubmitting}>
          {isEdit ? 'Save changes' : 'Create user'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
