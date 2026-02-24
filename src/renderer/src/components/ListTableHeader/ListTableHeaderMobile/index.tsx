import { Show } from '@renderer/components/Show';
import { useDebounce } from '@renderer/hooks/debounce';
import type { IListTableFilters } from '@renderer/types/page/listTableFilters';
import type {
  IListTableFilterItem,
  IListTableHeaderField,
} from '@renderer/types/page/listTableHeaderFilters';
import { styledTheme } from '@renderer/styles/styledTheme';
import { Box, Stack, useMediaQuery } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { HeaderField } from '../HeaderField';
import { SearchTextField } from '../HeaderField/SearchTextField';

type Props<T> = {
  searchLabel?: string;
  headerFields?: IListTableHeaderField<T>[];
  filters?: IListTableFilters<T>;
  padding?: string;
  hideSearch?: boolean;
  onChangeSearch: (search: string) => void;
  onChangeFilters?: (filters: IListTableFilters<T>) => void;
};

export function ListTableHeaderMobile<T>({
  headerFields = [],
  padding = '1.25rem',
  filters = {} as IListTableFilters<T>,
  onChangeFilters = () => {},
  hideSearch,
  searchLabel,
  onChangeSearch,
}: Readonly<Props<T>>) {
  const [searchValue, setSearchValue] = useState('');
  const searchValueDebounced = useDebounce(searchValue, 500);

  const isMobile = useMediaQuery(styledTheme.SIZES.xs);

  const handleSearch = useCallback(
    (value: string) => {
      onChangeSearch(value);
    },
    [onChangeSearch],
  );

  useEffect(() => {
    handleSearch(searchValueDebounced.trim());
  }, [searchValueDebounced, handleSearch]);

  const handleChangeFilters = (key: string, items: IListTableFilterItem[]) => {
    if (!onChangeFilters) return;

    const updatedFilters = {
      ...filters,
      [key]: items,
    };

    onChangeFilters(updatedFilters);
  };

  return (
    <Stack padding={isMobile ? '0.5rem' : padding} gap={1}>
      <Stack flex={1} direction="row" gap={1}>
        <Show.When isTrue={!hideSearch}>
          <Box flex={3}>
            <SearchTextField
              label={searchLabel ?? ''}
              value={searchValue}
              onChange={setSearchValue}
              size="small"
              iconPosition="right"
            />
          </Box>
        </Show.When>
      </Stack>

      <Show.When isTrue={!!filters}>
        <Stack direction="column" flexWrap="wrap" gap={2} mt={1}>
          {headerFields.map((headerField, index) => (
            <HeaderField<T>
              key={String(headerField.id)}
              isLastItem={index === headerFields.length - 1}
              filters={filters}
              headerField={headerField}
              handleChangeFilters={handleChangeFilters}
            />
          ))}
        </Stack>
      </Show.When>
    </Stack>
  );
}
