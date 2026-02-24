import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { DatePicker, type DatePickerProps } from '../DatePicker';

type Props<T extends FieldValues> = Omit<
  DatePickerProps,
  'value' | 'onChange'
> & {
  control: Control<T>;
  name: Path<T>;
  disabled?: boolean;
};

export function FormDatePickerField<T extends FieldValues>({
  control,
  name,
  disabled,
  ...rest
}: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <DatePicker
          {...rest}
          {...field}
          value={field.value ?? null}
          disabled={disabled}
          helperText={error?.message ?? ''}
          error={!!error}
        />
      )}
    />
  );
}
