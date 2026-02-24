import { SelectInputItem } from '@renderer/components/Form/SelectInput';
import { ISelectCheckboxItem } from '@renderer/types/page/listTableSelectItem';

export function enumToOptions<E extends Record<string, string | number>>(
  enumObj: E,
): SelectInputItem[] {
  return Object.entries(enumObj)
    .filter(([key]) => isNaN(Number(key)))
    .map(([key, value]) => ({
      value: key,
      label: value as string,
    }));
}

export function enumToItems<E extends Record<string, string | number>>(
  enumObj: E,
): ISelectCheckboxItem[] {
  return Object.entries(enumObj)
    .filter(([key]) => isNaN(Number(key)))
    .map(([key, value]) => ({
      id: key,
      name: value as string,
    }));
}
