import type { OutlinedInputProps } from '@mui/material';
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { PasswordInput } from '../PasswordInput';

type AutofillValues = 'current-password' | 'new-password';

type Props<T extends FieldValues> = OutlinedInputProps & {
  control: Control<T>;
  label: string;
  name: Path<T>;
  disabled?: boolean;
  helperText?: string;
  autoComplete?: AutofillValues;
  onChangeCb?: (password: string) => void;
};

export function FormPasswordField<T extends FieldValues>({
  control,
  name,
  disabled,
  onChangeCb,
  ...rest
}: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <PasswordInput
          {...rest}
          {...field}
          value={field.value ?? ''}
          onChange={(event) => {
            field.onChange(event);
            onChangeCb?.(event.target.value);
          }}
          disabled={disabled}
          helperText={error?.message ?? ''}
          error={!!error}
        />
      )}
    />
  );
}
