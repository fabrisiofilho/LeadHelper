export interface ISelectCheckboxItem {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

export interface ISelectWithSubcategoriesItem {
  id: number | string;
  name: string;
  subList?: ISelectWithSubcategoriesItem[];
  parentId?: number | null;
}
