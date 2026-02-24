import {
  Autocomplete,
  type BaseTextFieldProps,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CustomTextField } from './styles';
import { useWindowSize } from '@renderer/hooks/windowSize';
import type { IListTableFilterItem } from '@renderer/types/page/listTableHeaderFilters';

type Props = {
  label: string;
  items: IListTableFilterItem[];
  value: IListTableFilterItem[];
  loading?: boolean;
  isPaginating?: boolean;
  endReached?: () => void;
  disabled?: boolean;
  onChange: (selectedItem: IListTableFilterItem[]) => void;
  size?: BaseTextFieldProps['size'];
};

export function SelectCheckboxFilterField({
  onChange,
  value,
  label,
  items,
  loading,
  size,
  ...rest
}: Readonly<Props>) {
  const defaultItem: IListTableFilterItem = {
    id: '',
    name: 'Todos',
  };
  const [maxWidth, setMaxWidth] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);

  const [width, height] = useWindowSize();

  const valueItems = items.filter((item) =>
    value.some((selectedItem) => selectedItem.id === item.id),
  );

  const selectedItems = valueItems.length ? valueItems : [defaultItem];

  const renderValue = (selected: IListTableFilterItem[]) => {
    return selected.map((item) => item.name).join(', ');
  };

  const isChecked = (item: IListTableFilterItem) => {
    return !!value.find((itemSelected) => itemSelected.id === item.id);
  };

  const memoizedItems = useMemo(() => items, [items]);

  const handleChange = (_: unknown, value: unknown) => {
    const valueWithoutPlaceholder = (value as IListTableFilterItem[]).filter(
      (item) => item.id !== defaultItem.id,
    );

    onChange(valueWithoutPlaceholder);
  };

  const LoadingContainer = (
    <Box display="flex" justifyContent="center" alignItems="center">
      <CircularProgress size={20} />
    </Box>
  );

  useEffect(() => {
    if (inputRef.current) {
      setMaxWidth(inputRef.current.clientWidth - 64);
    }
  }, [inputRef, width, height]);

  return (
    <Autocomplete
      multiple
      disableClearable
      noOptionsText="Nenhuma opção"
      openOnFocus
      loadingText={LoadingContainer}
      options={memoizedItems}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;

        return option.name;
      }}
      value={selectedItems}
      disableCloseOnSelect
      loading={loading}
      onChange={handleChange}
      renderOption={(props, option) => (
        <li {...props}>
          <Checkbox checked={isChecked(option)} />
          <Typography variant="body1" whiteSpace="nowrap" overflow="visible">
            {option.name}
          </Typography>
        </li>
      )}
      renderInput={(params) => (
        <CustomTextField
          ref={inputRef}
          {...params}
          InputProps={{
            ...params.InputProps,
            onKeyDown: (event) => {
              return event.preventDefault();
            },
          }}
          label={label}
          size={size}
        />
      )}
      renderTags={() => (
        <Typography maxWidth={maxWidth ? `${maxWidth / 16}rem` : 'auto'}>
          {renderValue(selectedItems)}
        </Typography>
      )}
      {...rest}
    />
  );
}
