import { ErrorCode } from '@ums/shared';
import { ConflictError, DomainRuleError, NotFoundError } from '../../common/errors';

export class UserNotFoundError extends NotFoundError {
  constructor() {
    super(ErrorCode.USER_NOT_FOUND, 'User not found');
  }
}

export class EmailTakenError extends ConflictError {
  constructor() {
    super(ErrorCode.EMAIL_TAKEN, 'This e-mail is already registered');
  }
}

export class CannotModifySelfError extends ConflictError {
  constructor(message: string) {
    super(ErrorCode.CANNOT_MODIFY_SELF, message);
  }
}

export class UserInactiveNameLockedError extends DomainRuleError {
  constructor() {
    super(
      ErrorCode.USER_INACTIVE_NAME_LOCKED,
      'First and last name cannot be changed while the user is inactive',
    );
  }
}
