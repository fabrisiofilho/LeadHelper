import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Skeleton,
  Tooltip,
} from '@mui/material';
import { Cloud as CloudIcon } from '@mui/icons-material';
import type {
  Task,
  TaskStatusConfig,
} from '@shared/interfaces/config/index.types';
import { WorkItemTypeChip } from '@renderer/components/WorkItemTypeChip';

interface TaskKanbanViewProps {
  tasks: Task[];
  statuses: TaskStatusConfig[];
  loading: boolean;
  onReadOnlyAction: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#16A34A',
  medium: '#D97706',
  high: '#DC2626',
  critical: '#9333EA',
};

export function TaskKanbanView({
  tasks,
  statuses,
  loading,
  onReadOnlyAction,
}: TaskKanbanViewProps) {
  const columns = useMemo(() => {
    const kanbanStatuses = statuses.filter((s) => s.showInKanban);
    return kanbanStatuses.map((status) => ({
      status,
      tasks: tasks.filter((t) => t.status === status.name),
    }));
  }, [statuses, tasks]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 2, px: 2, py: 2, overflowX: 'auto' }}>
        {Array.from({ length: 4 }).map((_, col) => (
          <Box key={col} sx={{ minWidth: 280, flex: 1 }}>
            <Skeleton
              variant="rounded"
              height={36}
              sx={{ mb: 1, borderRadius: 1 }}
            />
            {Array.from({ length: 3 + col }).map((_, row) => (
              <Skeleton
                key={row}
                variant="rounded"
                height={90}
                sx={{ mb: 1, borderRadius: 1.5 }}
              />
            ))}
          </Box>
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
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          gap: 2,
          px: 2,
          py: 2,
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {columns.map(({ status, tasks: columnTasks }) => (
          <Box
            key={status.name}
            sx={{
              minWidth: 280,
              maxWidth: 320,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'action.hover',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ p: 1.5, flexShrink: 0 }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: status.color || 'primary.main',
                }}
              />
              <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                {status.label}
              </Typography>
              <Chip
                label={columnTasks.length}
                size="small"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Stack>

            <Box sx={{ flex: 1, overflow: 'auto', px: 1, pb: 1 }}>
              <Stack spacing={1}>
                {columnTasks.map((task) => (
                  <Paper
                    key={task.id}
                    elevation={0}
                    onClick={onReadOnlyAction}
                    sx={{
                      p: 1.5,
                      cursor: 'default',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || '#64748B'}`,
                      transition: 'all 0.15s',
                      '&:hover': {
                        borderColor: 'divider',
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        noWrap
                        sx={{ flex: 1 }}
                      >
                        {task.title}
                      </Typography>
                      <Tooltip title="Azure DevOps">
                        <CloudIcon
                          sx={{
                            fontSize: 14,
                            color: 'text.disabled',
                            flexShrink: 0,
                          }}
                        />
                      </Tooltip>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={0.5}
                      mt={0.75}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <WorkItemTypeChip type={task.type || 'Task'} />
                      {task.team && (
                        <Chip label={task.team.name} size="small" />
                      )}
                      {task.sprint && (
                        <Chip
                          label={task.sprint.name}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    {/* Assigned to — read-only display */}
                    {task.assignedToName && (
                      <Chip
                        label={task.assignedToName}
                        size="small"
                        variant="outlined"
                        sx={{
                          mt: 0.75,
                          cursor: 'default',
                        }}
                      />
                    )}
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
