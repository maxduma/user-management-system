import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type UpdateUserRequest, USERS_PAGE_SIZE } from '@ums/shared';
import { usersApi } from '../../api/users.api';

export const usersKeys = {
  all: ['users'] as const,
  page: (page: number) => ['users', 'list', { page, pageSize: USERS_PAGE_SIZE }] as const,
};

/** One page of users (6 per page). Keeps showing the previous page while the next loads. */
export function useUsersPage(page: number) {
  return useQuery({
    queryKey: usersKeys.page(page),
    queryFn: ({ signal }) => usersApi.list({ page, pageSize: USERS_PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useUpdateUser(currentUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateUserRequest }) =>
      usersApi.update(id, changes),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: usersKeys.all });
      // Editing yourself changes the greeting in the header.
      if (user.id === currentUserId) await queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}
