import type { SessionDto, SessionWithUserDto } from '@ums/shared';
import { toUserDto } from '../users/user.mapper';
import type { Session, SessionWithUser } from './session.types';

export function toSessionDto(session: Session): SessionDto {
  return {
    id: session.id,
    userId: session.userId,
    createdAt: session.createdAt.toISOString(),
    terminatedAt: session.terminatedAt?.toISOString() ?? null,
  };
}

export function toSessionWithUserDto({ session, user }: SessionWithUser): SessionWithUserDto {
  return { ...toSessionDto(session), user: toUserDto(user) };
}
