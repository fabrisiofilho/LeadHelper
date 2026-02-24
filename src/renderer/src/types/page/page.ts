import type { IPageFilter } from './filter';
import type { IPageSort } from './sort';

export interface IPage<T> {
  content: T[];
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  totalPages: number;
  totalElements: number;
}

export interface IPageRequestParams {
  page: number;
  size: number;
  sorts: IPageSort[];
  filters: IPageFilter[];
}
