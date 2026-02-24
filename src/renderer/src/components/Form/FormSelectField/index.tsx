import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { SelectInput, type SelectInputProps } from '../SelectInput';

type Props<T, TFieldValues extends FieldValues> = SelectInputProps & {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  onChangeCb?: (value: T) => void;
};

export function FormSelectField<
  T = string,
  TFieldValues extends FieldValues = FieldValues,
>({ control, name, onChangeCb, ...rest }: Readonly<Props<T, TFieldValues>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <SelectInput
          {...rest}
          {...field}
          value={field.value ?? ''}
          onChange={(event) => {
            field.onChange(event);
            onChangeCb?.(event.target.value as T);
          }}
          helperText={error?.message ?? ''}
          error={!!error}
        />
      )}
    />
  );
}
