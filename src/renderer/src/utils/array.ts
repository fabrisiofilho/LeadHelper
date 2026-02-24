import { IListTableFilterItem } from '@renderer/types/page/listTableHeaderFilters';
import { PageSortDirectionEnum } from '@renderer/types/page/sort';

export function chunkArray<T>(array: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Size must be greater than 0');

  const result: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
}

type SortField = {
  property: string;
  direction?: PageSortDirectionEnum;
};

export function sortArrayByFields<T>(array: T[], fields: SortField[]): T[] {
  const compareValues = (a: unknown, b: unknown): number => {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    const strA = String(a);
    const strB = String(b);
    if (strA > strB) return 1;
    if (strA < strB) return -1;

    return 0;
  };

  return [...array].sort((a, b) => {
    for (const { property, direction = PageSortDirectionEnum.ASC } of fields) {
      const aValue = (a as Record<string, unknown>)[property];
      const bValue = (b as Record<string, unknown>)[property];
      const result = compareValues(aValue, bValue);

      if (result !== 0) {
        return direction === PageSortDirectionEnum.ASC ? result : -result;
      }
    }

    return 0;
  });
}

type Filters<T> = {
  [K in keyof T]?: IListTableFilterItem[];
};

export function applyFiltersByName<T>(list: T[], filters: Filters<T>): T[] {
  return list.filter((item) => {
    return Object.entries(filters).every(([field, filterValues]) => {
      const values = filterValues as IListTableFilterItem[] | undefined;
      if (!values || values.length === 0) return true;

      const allowedNames = values.map((f) => f.name);

      const itemValue = (item as Record<string, unknown>)[field];

      return allowedNames.includes(String(itemValue));
    });
  });
}
