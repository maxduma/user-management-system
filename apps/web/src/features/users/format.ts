import type { UserDto } from '@ums/shared';

const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export const formatDateTime = (iso: string) => dateFormatter.format(new Date(iso));

export const fullName = (user: Pick<UserDto, 'firstName' | 'lastName'>) =>
  `${user.firstName} ${user.lastName}`;

export const initials = (user: Pick<UserDto, 'firstName' | 'lastName'>) =>
  `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
