import type { CreateUserRequest, UpdateUserRequest, UserDto, UserListDto } from '@ums/shared';
import { apiRequest } from './http';

export const usersApi = {
  list: ({ page, pageSize }: { page: number; pageSize: number }, signal?: AbortSignal) =>
    apiRequest<UserListDto>(`/users?page=${page}&pageSize=${pageSize}`, { signal }),
  create: (body: CreateUserRequest) => apiRequest<UserDto>('/users', { method: 'POST', body }),
  update: (id: string, body: UpdateUserRequest) =>
    apiRequest<UserDto>(`/users/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
};
