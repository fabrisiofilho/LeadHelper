import { Show } from '@renderer/components/Show';
import { useDebounce } from '@renderer/hooks/debounce';
import { useResponsiveSize } from '@renderer/hooks/responsiveSize';
import type { IListTableFilters } from '@renderer/types/page/listTableFilters';
import type {
  IListTableFilterItem,
  IListTableHeaderField,
} from '@renderer/types/page/listTableHeaderFilters';
import { type BaseTextFieldProps, Box, IconButton, Stack } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { HeaderField } from '../HeaderField';
import { SearchTextField } from '../HeaderField/SearchTextField';
import { BackspaceIcon } from './styles';

type Props<T> = {
  searchLabel?: string;
  searchPosition?: 'right' | 'left';
  iconPosition?: 'right' | 'left';
  headerFields?: IListTableHeaderField<T>[];
  filters?: IListTableFilters<T>;
  defaultFilters?: IListTableFilters<T>;
  padding?: string;
  hideSearch?: boolean;
  initialSearchValue?: string;
  onChangeSearch: (search: string) => void;
  onChangeFilters?: (filters: IListTableFilters<T>) => void;
  onCleanSorts?: () => void;
  hideWipeFieldsButton?: boolean;
  searchFieldSize?: BaseTextFieldProps['size'];
};

export function ListTableHeaderDesktop<T>({
  headerFields = [],
  searchPosition = 'right',
  padding = '1.25rem',
  filters = {} as IListTableFilters<T>,
  onChangeFilters = () => {},
  onCleanSorts = () => {},
  searchLabel,
  onChangeSearch,
  iconPosition = 'left',
  hideSearch,
  hideWipeFieldsButton,
  defaultFilters,
  searchFieldSize = 'medium',
}: Readonly<Props<T>>) {
  const [searchValue, setSearchValue] = useState('');
  const searchValueDebounced = useDebounce(searchValue, 500);

  const handleSearch = useCallback(
    (value: string) => {
      onChangeSearch(value);
    },
    [onChangeSearch],
  );

  useEffect(() => {
    handleSearch(searchValueDebounced.trim());
  }, [searchValueDebounced, handleSearch]);

  const searchPositionLeft = searchPosition === 'left';

  const handleChangeFilters = (key: string, items: IListTableFilterItem[]) => {
    if (!onChangeFilters) return;

    const updatedFilters = {
      ...filters,
      [key]: items,
    };

    onChangeFilters(updatedFilters);
  };

  const handleWipeFields = () => {
    if (!onChangeFilters) return;
    if (onCleanSorts) onCleanSorts();

    onChangeSearch('');
    setSearchValue('');

    onChangeFilters(defaultFilters ?? ({} as IListTableFilters<T>));
  };

  const responsiveSearchSize = useResponsiveSize('small', searchFieldSize);

  const muiSearchSize =
    responsiveSearchSize === 'large' ? 'medium' : responsiveSearchSize;

  return (
    <Stack
      padding={padding}
      direction="row"
      flexWrap="wrap"
      gap={{ xs: 1, sm: 1.5, md: 2 }}
      alignItems="flex-start"
    >
      <Show.When isTrue={searchPositionLeft}>
        <Stack
          flex={1}
          direction="row"
          flexWrap="wrap"
          gap={{ xs: 1, sm: 1.5, md: 2 }}
          alignItems="center"
        >
          <Show.When isTrue={!hideSearch}>
            <Box minWidth={{ xs: '100%', sm: '15rem', md: '20rem' }} flex={1}>
              <SearchTextField
                label={searchLabel ?? ''}
                value={searchValue}
                onChange={setSearchValue}
                size={muiSearchSize}
                iconPosition={iconPosition}
              />
            </Box>
          </Show.When>

          <Show.When isTrue={!!headerFields}>
            {headerFields.map((headerField, index) => (
              <HeaderField<T>
                key={String(headerField.id)}
                isLastItem={index === headerFields.length - 1}
                filters={filters}
                headerField={headerField}
                handleChangeFilters={handleChangeFilters}
              />
            ))}
          </Show.When>
        </Stack>
      </Show.When>

      <Show.When isTrue={!searchPositionLeft}>
        <Stack
          flex={1}
          justifyContent="flex-start"
          direction="row"
          flexWrap="wrap"
          gap={{ xs: 1, sm: 1.5, md: 2 }}
          alignItems="center"
        >
          <Show.When isTrue={!!headerFields}>
            {headerFields.map((headerField, index) => (
              <HeaderField
                key={String(headerField.id)}
                isLastItem={index === headerFields.length - 1}
                filters={filters}
                headerField={headerField}
                handleChangeFilters={handleChangeFilters}
              />
            ))}
          </Show.When>

          <Show.When isTrue={!hideSearch}>
            <Box minWidth={{ xs: '100%', sm: '15rem', md: '20rem' }} flex={1}>
              <SearchTextField
                label={searchLabel ?? ''}
                value={searchValue}
                onChange={setSearchValue}
                size={muiSearchSize}
                iconPosition={iconPosition}
              />
            </Box>
          </Show.When>
        </Stack>
      </Show.When>

      <Show.When isTrue={!hideWipeFieldsButton}>
        <Stack alignItems="center" justifyContent="center">
          <IconButton size="small" onClick={handleWipeFields}>
            <BackspaceIcon />
          </IconButton>
        </Stack>
      </Show.When>
    </Stack>
  );
}
