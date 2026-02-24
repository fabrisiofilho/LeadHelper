import TextField, { type TextFieldProps } from '@mui/material/TextField';
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from 'react-hook-form';

type Props<T extends FieldValues> = TextFieldProps & {
  control: Control<T>;
  name: Path<T>;
  disabled?: boolean;
  helperText?: string;
  onChangeCb?: (value: string) => void;
};

export function FormTextField<T extends FieldValues>({
  control,
  name,
  disabled,
  helperText,
  onChangeCb,
  ...rest
}: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...rest}
          {...field}
          value={field.value ?? ''}
          onChange={(event) => {
            field.onChange(event);
            onChangeCb?.(event.target.value);
          }}
          disabled={disabled}
          helperText={error?.message ?? helperText ?? ''}
          error={!!error}
        />
      )}
    />
  );
}
