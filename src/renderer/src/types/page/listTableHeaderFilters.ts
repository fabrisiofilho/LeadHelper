import type { BaseTextFieldProps } from '@mui/material';
import type { AsyncThunk } from '@reduxjs/toolkit';
import type { IPage, IPageRequestParams } from './page';

export interface IListTableFilterItem {
  id: number | string;
  name: string;
}

export type GetPaginatedFilterItemsFunction<T, P> = AsyncThunk<
  IPage<T> | null,
  IPageRequestParams & P,
  {}
>;

export interface IListTableFilterPaginated {
  getItems: GetPaginatedFilterItemsFunction<unknown, unknown>;
  filterId?: string;
  disabled?: boolean;
  size?: 'medium' | 'small';
  params?: unknown;
  containerWidth?: string;
  disableCloseOnSelect?: boolean;
  emptyAsAll?: boolean;
}

interface IListTableHeaderFieldDefaultValues<T> {
  id: keyof T;
  flex?: number;
  width?: string;
  size?: BaseTextFieldProps['size'];
  disabled?: boolean;
}

interface IListTableHeaderSelectCheckboxField<T>
  extends IListTableHeaderFieldDefaultValues<T> {
  variant: 'selectCheckbox';
  label: string;
  items: IListTableFilterItem[];
  paginatedFilter?: IListTableFilterPaginated;
}

interface IListTableHeaderSelectField<T>
  extends IListTableHeaderFieldDefaultValues<T> {
  variant: 'select';
  label: string;
  items: IListTableFilterItem[];
  defaultValueName?: string;
}

interface IListTableHeaderDateField<T>
  extends IListTableHeaderFieldDefaultValues<T> {
  variant: 'date';
  label: string;
  maxDate?: Date | string;
  minDate?: Date | string;
}

interface IListTableHeaderButtonField<T>
  extends IListTableHeaderFieldDefaultValues<T> {
  variant: 'button';
  label: string;
  onClick: () => void;
}

interface IListTableHeaderTabField<T>
  extends IListTableHeaderFieldDefaultValues<T> {
  variant: 'tab';
  items: IListTableFilterItem[];
}

interface IListTableHeaderToggleField<T>
  extends IListTableHeaderFieldDefaultValues<T> {
  variant: 'toggle';
  items: IListTableFilterItem[];
}

export type IListTableHeaderField<T> =
  | IListTableHeaderSelectCheckboxField<T>
  | IListTableHeaderSelectField<T>
  | IListTableHeaderDateField<T>
  | IListTableHeaderButtonField<T>
  | IListTableHeaderTabField<T>
  | IListTableHeaderToggleField<T>;
