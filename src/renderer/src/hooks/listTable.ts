import type { IListTableFilters } from '@renderer/types/page/listTableFilters';
import type { IPageSort } from '@renderer/types/page/sort';
import { useState } from 'react';

type Props<T> = {
  defaultSorts?: IPageSort[];
  defaultFilters?: IListTableFilters<T>;
  defaultRowsPerPage?: number;
};

export function useListTable<T>({
  defaultSorts = [],
  defaultFilters = {} as IListTableFilters<T>,
  defaultRowsPerPage = 10,
}: Readonly<Props<T>> = {}) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [sorts, setSorts] = useState<IPageSort[]>(defaultSorts);
  const [filters, setFilters] = useState<IListTableFilters<T>>(defaultFilters);

  const onChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const onChangeRowsPerPage = (rowsPerPage: number) => {
    setRowsPerPage(rowsPerPage);
  };

  const onChangeSorts = (sorts: IPageSort[]) => {
    setSorts(sorts);
  };

  const onCleanSorts = () => {
    setSorts([]);
  };

  const onCleanFilters = () => {
    setFilters({} as IListTableFilters<T>);
  };

  const onChangeFilters = (filters: IListTableFilters<T>) => {
    setFilters(filters);
    setPage(0);
  };

  const onChangeSearch = (text: string) => {
    setSearch(text);
    setPage(0);
  };

  return {
    sorts,
    page,
    rowsPerPage,
    search,
    filters,
    defaultFilters,
    onChangePage,
    onChangeRowsPerPage,
    onChangeSorts,
    onCleanSorts,
    onChangeFilters,
    onChangeSearch,
    onCleanFilters,
  };
}
