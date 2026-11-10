import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { IconButton, InputAdornment } from '@mui/material';
import { type ComponentProps, useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import { FormTextField } from './FormTextField';

type PasswordFieldProps<T extends FieldValues, TTransformed> = ComponentProps<
  typeof FormTextField<T, TTransformed>
>;

export function PasswordField<T extends FieldValues, TTransformed = T>(
  props: PasswordFieldProps<T, TTransformed>,
) {
  const [visible, setVisible] = useState(false);

  return (
    <FormTextField
      {...props}
      type={visible ? 'text' : 'password'}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={visible ? `Hide ${props.label}` : `Show ${props.label}`}
                onClick={() => setVisible((current) => !current)}
                edge="end"
              >
                {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
