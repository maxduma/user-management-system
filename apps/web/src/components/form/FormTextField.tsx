import { TextField, type TextFieldProps } from '@mui/material';
import {
  type FieldValues,
  type Path,
  useController,
  type UseControllerProps,
} from 'react-hook-form';

type FormTextFieldProps<T extends FieldValues, TTransformed> = UseControllerProps<
  T,
  Path<T>,
  TTransformed
> &
  Omit<TextFieldProps, 'name' | 'defaultValue' | 'value' | 'onChange' | 'onBlur'>;

/** MUI TextField bound to react-hook-form, showing the field's validation error. */
export function FormTextField<T extends FieldValues, TTransformed = T>({
  name,
  control,
  rules,
  shouldUnregister,
  helperText,
  ...props
}: FormTextFieldProps<T, TTransformed>) {
  const {
    field: { ref, ...field },
    fieldState: { error },
  } = useController({ name, control, rules, shouldUnregister });

  return (
    <TextField
      {...props}
      {...field}
      value={field.value ?? ''}
      inputRef={ref}
      error={Boolean(error)}
      helperText={error?.message ?? helperText}
    />
  );
}
