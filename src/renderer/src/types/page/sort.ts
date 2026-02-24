export enum PageSortDirectionEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface IPageSort {
  property: string;
  direction: PageSortDirectionEnum;
}

export interface ISort {
  sorted: boolean;
  empty: boolean;
  unsorted: boolean;
}
