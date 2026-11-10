import type { UserDto } from '@ums/shared';
import type { User } from './user.types';

/** Entity -> API representation (explicit allow-list of fields). */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: user.status,
    loginsCount: user.loginsCount,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
