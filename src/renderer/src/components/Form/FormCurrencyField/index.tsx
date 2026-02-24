import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { TextFieldProps } from '@mui/material';
import { CurrencyInput } from '../CurrencyInput';

type FormCurrencyFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'value' | 'onChange'
> & {
  name: Path<T>;
  control: Control<T>;
  rules?: object;
};

export function FormCurrencyField<T extends FieldValues>({
  name,
  control,
  rules,
  ...props
}: FormCurrencyFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
        <CurrencyInput
          {...props}
          ref={ref}
          value={value}
          onChange={onChange}
          error={!!error}
          helperText={error?.message ?? props.helperText}
        />
      )}
    />
  );
}
