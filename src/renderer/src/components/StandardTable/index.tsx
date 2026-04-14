import { type ReactNode, type MouseEvent } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Stack,
  Box,
} from '@mui/material';
import { SortableTableCell } from '@renderer/components/SortableTableCell';
import type { TableSortConfig } from '@renderer/hooks/useTableSort';

// ── Types ──

export interface StandardColumn {
  id: string;
  label: string | ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string | number;
  noSort?: boolean;
}

export interface StandardRow {
  id: string | number;
  cells: Record<string, ReactNode>;
  onClick?: () => void;
}

interface StandardTableProps {
  columns: StandardColumn[];
  rows: StandardRow[];
  sortConfig: TableSortConfig | null;
  onSort: (property: string) => void;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  stickyHeader?: boolean;
  fullHeight?: boolean;
  hidePagination?: boolean;
}

export function StandardTable({
  columns,
  rows,
  sortConfig,
  onSort,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 25],
  emptyIcon,
  emptyTitle = 'Nenhum resultado encontrado',
  emptyDescription,
  emptyAction,
  stickyHeader = true,
  fullHeight = false,
  hidePagination = false,
}: StandardTableProps) {
  if (rows.length === 0 && totalCount === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" py={6}>
        {emptyIcon && <Box mb={2}>{emptyIcon}</Box>}
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {emptyTitle}
        </Typography>
        {emptyDescription && (
          <Typography variant="body2" color="text.secondary" mb={3}>
            {emptyDescription}
          </Typography>
        )}
        {emptyAction}
      </Stack>
    );
  }

  return (
    <Paper
      sx={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: '1rem',
        ...(fullHeight && {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }),
      }}
    >
      <TableContainer
        sx={fullHeight ? { flex: 1, overflow: 'auto' } : undefined}
      >
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <SortableTableCell
                  key={col.id}
                  id={col.id}
                  label={col.label}
                  sortConfig={sortConfig}
                  onSort={onSort}
                  align={col.align as 'left' | 'right' | 'center'}
                  width={col.width}
                  noSort={col.noSort}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                hover
                onClick={row.onClick}
                sx={row.onClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align as 'left' | 'right' | 'center'}
                  >
                    {row.cells[col.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!hidePagination && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_: unknown, newPage: number) => onPageChange(newPage)}
          onRowsPerPageChange={(e) => {
            onRowsPerPageChange(parseInt(e.target.value, 10));
            onPageChange(0);
          }}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      )}
    </Paper>
  );
}
