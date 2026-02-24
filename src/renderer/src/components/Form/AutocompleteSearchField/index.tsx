import { TextFieldProps } from '@mui/material';
import { Control, Controller, FieldValues } from 'react-hook-form';
import {
  AutocompleteInputItem,
  AutocompleteSearchInput,
} from '../AutocompleteSearchInput';

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'size'> & {
  control: Control<FieldValues>;
  name: string;
  items: AutocompleteInputItem[];
  renderValue?: (option: AutocompleteInputItem) => string;
  selectedItems?: AutocompleteInputItem[];
  isOptionEqualToValue?: (
    option: AutocompleteInputItem,
    value: AutocompleteInputItem,
  ) => boolean;
  cleanOnSelect?: boolean;
  size?: 'medium' | 'small';
  onSelectOption?: (option: AutocompleteInputItem['value']) => void;
};

export function AutocompleteSearchField({
  control,
  name,
  required,
  onSelectOption,
  ...rest
}: Props) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        return (
          <AutocompleteSearchInput
            value={value ?? null}
            onChange={(data) => {
              onChange(data);
              onSelectOption?.(data);
            }}
            error={!!error}
            helperText={error?.message ?? ''}
            required={required}
            {...rest}
          />
        );
      }}
    />
  );
}
