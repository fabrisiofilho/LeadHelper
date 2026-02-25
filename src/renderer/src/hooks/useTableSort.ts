import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface TableSortConfig {
  property: string;
  direction: SortDirection;
}

/**
 * Hook reutilizável para ordenação client-side em tabelas.
 * Suporta ordenação por múltiplas propriedades aninhadas (ex: "team.name").
 */
export function useTableSort<T>(items: T[], defaultSort?: TableSortConfig) {
  const [sortConfig, setSortConfig] = useState<TableSortConfig | null>(
    defaultSort ?? null,
  );

  const handleSort = useCallback(
    (property: string) => {
      setSortConfig((prev) => {
        if (prev?.property === property) {
          if (prev.direction === 'asc') return { property, direction: 'desc' };
          // Third click removes sort
          return null;
        }
        return { property, direction: 'asc' };
      });
    },
    [],
  );

  const sortedItems = useMemo(() => {
    if (!sortConfig) return items;

    const { property, direction } = sortConfig;

    return [...items].sort((a, b) => {
      const getValue = (obj: unknown, path: string): unknown => {
        return path.split('.').reduce((acc: unknown, key: string) => {
          if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
          return undefined;
        }, obj);
      };

      let aVal = getValue(a, property);
      let bVal = getValue(b, property);

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? 1 : -1;
      if (bVal == null) return direction === 'asc' ? -1 : 1;

      // Handle dates
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();

      // Handle date strings
      if (typeof aVal === 'string' && !isNaN(Date.parse(aVal)) && typeof bVal === 'string' && !isNaN(Date.parse(bVal))) {
        const aDate = new Date(aVal).getTime();
        const bDate = new Date(bVal).getTime();
        if (!isNaN(aDate) && !isNaN(bDate)) {
          return direction === 'asc' ? aDate - bDate : bDate - aDate;
        }
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle booleans
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return direction === 'asc'
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal);
      }

      // Default: string comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig]);

  return { sortedItems, sortConfig, handleSort };
}
