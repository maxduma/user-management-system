import { ErrorCode, type ErrorDetail } from '@ums/shared';

/**
 * Base class for expected (business) failures. The global error handler maps
 * these to HTTP responses; anything else is treated as an internal error.
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(code: ErrorCode = ErrorCode.UNAUTHORIZED, message = 'Authentication required') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(409, code, message);
  }
}

/** A well-formed request that violates a domain rule. */
export class DomainRuleError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(422, code, message);
  }
}
