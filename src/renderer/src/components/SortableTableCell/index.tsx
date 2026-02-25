import { TableCell, TableSortLabel } from '@mui/material';
import type { ReactNode } from 'react';
import type { SortDirection, TableSortConfig } from '@renderer/hooks/useTableSort';

interface SortableTableCellProps {
  id: string;
  label: string | ReactNode;
  sortConfig: TableSortConfig | null;
  onSort: (property: string) => void;
  align?: 'left' | 'right' | 'center';
  width?: string | number;
  noSort?: boolean;
  padding?: 'normal' | 'checkbox' | 'none';
}

export function SortableTableCell({
  id,
  label,
  sortConfig,
  onSort,
  align = 'left',
  width,
  noSort = false,
  padding,
}: SortableTableCellProps) {
  if (noSort) {
    return (
      <TableCell align={align} sx={{ width }} padding={padding}>
        {label}
      </TableCell>
    );
  }

  const active = sortConfig?.property === id;
  const direction: SortDirection = active ? sortConfig.direction : 'asc';

  return (
    <TableCell
      align={align}
      sx={{ width }}
      padding={padding}
      sortDirection={active ? direction : false}
    >
      <TableSortLabel
        active={active}
        direction={direction}
        onClick={() => onSort(id)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}
