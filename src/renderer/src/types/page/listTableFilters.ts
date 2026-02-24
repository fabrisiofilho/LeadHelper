import type { IListTableFilterItem } from './listTableHeaderFilters';

export type IListTableFilters<T> = {
  [Property in keyof T]?: IListTableFilterItem[];
};
