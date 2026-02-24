import {
  Checkbox,
  type CheckboxProps,
  FormControl,
  FormControlLabel,
  FormHelperText,
} from '@mui/material';
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from 'react-hook-form';

type Props<T extends FieldValues> = CheckboxProps & {
  control: Control<T>;
  name: Path<T>;
  label: string;
  helperText?: string;
  disabled?: boolean;
};

export function FormCheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  helperText,
  disabled,
}: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <FormControl error={!!error} component="fieldset" disabled={disabled}>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={(event) => onChange(event.target.checked)}
                value={!!value}
              />
            }
            label={label}
          />
          <FormHelperText>{error?.message ?? helperText}</FormHelperText>
        </FormControl>
      )}
    />
  );
}
