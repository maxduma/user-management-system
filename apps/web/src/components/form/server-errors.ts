import { ErrorCode } from '@ums/shared';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '../../api/http';

/**
 * Maps an API failure onto the form: field-level errors where the API points
 * at a field, otherwise a form-level message (returned).
 */
export function applyServerError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!isApiError(error)) return 'Something went wrong. Please try again.';

  if (error.code === ErrorCode.EMAIL_TAKEN && fields.includes('email' as Path<T>)) {
    setError('email' as Path<T>, { message: error.message }, { shouldFocus: true });
    return null;
  }

  if (error.code === ErrorCode.VALIDATION_ERROR) {
    let mapped = false;
    for (const detail of error.details) {
      const field = detail.path.replace(/^body\./, '') as Path<T>;
      if (fields.includes(field)) {
        setError(field, { message: detail.message });
        mapped = true;
      }
    }
    if (mapped) return null;
  }

  return error.message;
}
