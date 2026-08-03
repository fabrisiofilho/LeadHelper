import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Tooltip,
  Skeleton,
} from '@mui/material';
import { Cloud as CloudIcon } from '@mui/icons-material';
import type {
  Task,
  TaskStatusConfig,
} from '@shared/interfaces/config/index.types';
import { useTableSort } from '@renderer/hooks/useTableSort';
import { SortableTableCell } from '@renderer/components/SortableTableCell';
import { WorkItemTypeChip } from '@renderer/components/WorkItemTypeChip';

interface TaskListViewProps {
  tasks: Task[];
  statuses: TaskStatusConfig[];
  loading: boolean;
  onReadOnlyAction?: () => void;
  onTaskClick?: (task: Task) => void;
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#16A34A' },
  medium: { label: 'Média', color: '#D97706' },
  high: { label: 'Alta', color: '#DC2626' },
  critical: { label: 'Crítica', color: '#9333EA' },
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

export function TaskListView({
  tasks,
  statuses,
  loading,
  onTaskClick,
}: TaskListViewProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const {
    sortedItems: sortedTasks,
    sortConfig,
    handleSort,
  } = useTableSort(tasks, { property: 'title', direction: 'asc' });

  const statusMap = useMemo(() => {
    const map: Record<string, TaskStatusConfig> = {};
    for (const s of statuses) {
      map[s.name] = s;
    }
    return map;
  }, [statuses]);

  const paginatedTasks = useMemo(() => {
    return sortedTasks.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [sortedTasks, page, rowsPerPage]);

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Skeleton
          variant="rounded"
          height={48}
          sx={{ borderRadius: '4px 4px 0 0' }}
        />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={52}
            sx={{ borderRadius: 0, mt: '1px' }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <SortableTableCell
                id="title"
                label="Título"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableTableCell
                id="type"
                label="Tipo"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableTableCell
                id="team.name"
                label="Equipe"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableTableCell
                id="sprint.name"
                label="Sprint"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableTableCell
                id="status"
                label="Status"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableTableCell
                id="priority"
                label="Prioridade"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableTableCell
                id="assignedToName"
                label="Responsável"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableTableCell
                id="startDate"
                label="Período"
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <SortableTableCell
                id="origin"
                label="Origem"
                sortConfig={sortConfig}
                onSort={handleSort}
                noSort
                align="center"
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    Nenhuma tarefa encontrada
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTasks.map((task) => {
                const priority = PRIORITY_LABELS[task.priority] || {
                  label: task.priority,
                  color: '#64748B',
                };
                const statusConfig = statusMap[task.status];

                return (
                  <TableRow
                    key={task.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        noWrap
                        sx={{ maxWidth: 250 }}
                      >
                        {task.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <WorkItemTypeChip type={task.type || 'Task'} />
                    </TableCell>
                    <TableCell>
                      {task.team ? (
                        <Chip
                          label={task.team.name}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.sprint ? (
                        <Chip
                          label={task.sprint.name}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusConfig?.label || task.status}
                        size="small"
                        sx={{
                          bgcolor: statusConfig?.color
                            ? `${statusConfig.color}20`
                            : undefined,
                          color: statusConfig?.color,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={priority.label}
                        size="small"
                        sx={{
                          bgcolor: `${priority.color}20`,
                          color: priority.color,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {task.assignedToName || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(task.startDate)} -{' '}
                        {formatDate(task.endDate)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Azure DevOps">
                        <CloudIcon
                          sx={{ fontSize: 16, color: 'text.disabled' }}
                        />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sortedTasks.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 15, 25, 50]}
        labelRowsPerPage="Por página:"
        sx={{ flexShrink: 0 }}
      />
    </Box>
  );
}
