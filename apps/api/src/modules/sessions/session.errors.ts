import { ErrorCode } from '@ums/shared';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../common/errors';

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super(ErrorCode.INVALID_CREDENTIALS, 'Invalid e-mail or password');
  }
}

export class InvalidSessionError extends UnauthorizedError {
  constructor(message = 'Session is invalid or has expired') {
    super(ErrorCode.SESSION_INVALID, message);
  }
}

export class UserInactiveError extends ForbiddenError {
  constructor() {
    super(ErrorCode.USER_INACTIVE, 'This account is inactive');
  }
}

export class SessionNotFoundError extends NotFoundError {
  constructor() {
    super(ErrorCode.SESSION_NOT_FOUND, 'Session not found');
  }
}
