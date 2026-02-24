import SearchIcon from '@mui/icons-material/Search';
import {
  Autocomplete,
  InputAdornment,
  TextFieldProps,
  InputLabelProps,
  AutocompleteRenderInputParams,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { CustomTextField } from './styles';

type ValueObject = {
  id: number;
  [key: string]: unknown;
};

type Value = number | string | boolean | ValueObject;

export type AutocompleteInputItem = {
  value: Value;
  label: string;
  [key: string]: unknown;
};

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'size'> & {
  value?: Value;
  items: AutocompleteInputItem[];
  onChange: (value: Value) => void;
  renderValue?: (option: AutocompleteInputItem) => string;
  selectedItems?: AutocompleteInputItem[];
  isOptionEqualToValue?: (
    option: AutocompleteInputItem,
    value: AutocompleteInputItem,
  ) => boolean;
  cleanOnSelect?: boolean;
  size?: 'medium' | 'small';
  openOnFocus?: boolean;
  blurOnSelect?: boolean;
  disableCloseOnSelect?: boolean;
  TextFieldLabelProps?: InputLabelProps;
  maxOptionLength?: number;
  loading?: boolean;
};
export function AutocompleteSearchInput({
  value,
  cleanOnSelect,
  onChange,
  isOptionEqualToValue,
  renderValue,
  disabled,
  required,
  size = 'medium',
  disableCloseOnSelect,
  openOnFocus = true,
  blurOnSelect = true,
  TextFieldLabelProps,
  maxOptionLength,
  loading,
  items,
  ...rest
}: Props) {
  const [inputValue, setInputValue] = useState('');

  const handleGetValue = () => {
    return items.find((item) => item.value === value) ?? null;
  };

  const handleOnChange = (
    _: React.SyntheticEvent,
    newValue: AutocompleteInputItem | null,
  ) => {
    if (newValue && typeof newValue !== 'string') {
      onChange(newValue.value ?? '');

      if (cleanOnSelect) {
        setInputValue('');
      }
    }

    if (!newValue) {
      onChange('');
    }
  };

  const handleIsOptionEqualToValue = () => {
    if (isOptionEqualToValue) return isOptionEqualToValue;

    return (option: AutocompleteInputItem, item: AutocompleteInputItem) =>
      option.value === item.value;
  };

  const getInputValue = useCallback(() => {
    if (!value) return '';

    const item = items.find((item) => item.value === value);

    return item?.label ?? '';
  }, [value, items]);

  const getOptionValue = (option?: AutocompleteInputItem) => {
    if (!option) return '';

    if (renderValue) {
      return renderValue(option);
    }

    return option.label ?? '';
  };

  useEffect(() => {
    setInputValue(getInputValue());
  }, [getInputValue]);

  return (
    <Autocomplete
      size={size}
      openOnFocus={openOnFocus}
      blurOnSelect={blurOnSelect}
      disableCloseOnSelect={disableCloseOnSelect}
      disabled={disabled}
      inputValue={inputValue}
      onInputChange={(_, newValue) => setInputValue(newValue)}
      options={items}
      value={handleGetValue()}
      onChange={handleOnChange}
      getOptionLabel={(option) => getOptionValue(option)}
      isOptionEqualToValue={handleIsOptionEqualToValue()}
      loading={loading}
      loadingText="Carregando..."
      fullWidth={rest.fullWidth}
      noOptionsText="Sem opções"
      forcePopupIcon={false}
      filterOptions={(options) => options}
      renderOption={(props, option) => (
        <li {...props}>
          {(() => {
            if (maxOptionLength) {
              const value = getOptionValue(option);

              return value.length > maxOptionLength
                ? `${value.substring(0, maxOptionLength)}...`
                : value;
            }

            return getOptionValue(option);
          })()}
        </li>
      )}
      renderInput={(params: AutocompleteRenderInputParams) => (
        <CustomTextField
          {...rest}
          {...params}
          size={size}
          slotProps={{
            inputLabel: {
              ...TextFieldLabelProps,
              required,
            },
            input: {
              ...params.InputProps,
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
              disableUnderline: true,
            },
          }}
        />
      )}
    />
  );
}
