import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Cloud as CloudIcon } from '@mui/icons-material';
import type {
  Task,
  TaskStatusConfig,
} from '@shared/interfaces/config/index.types';
import { getTaskTypeOption } from '@renderer/utils/task-type';
import { WorkItemTypeChip } from '@renderer/components/WorkItemTypeChip';

interface TaskKanbanViewProps {
  tasks: Task[];
  statuses: TaskStatusConfig[];
  loading: boolean;
  onReadOnlyAction: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
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
      <Stack alignItems="center" justifyContent="center" py={6}>
        <CircularProgress size={36} />
      </Stack>
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
                      borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || '#757575'}`,
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
                      <WorkItemTypeChip
                        type={task.type || 'Task'}
                        sx={{ height: 18, fontSize: '0.6rem' }}
                      />
                      {task.team && (
                        <Chip
                          label={task.team.name}
                          size="small"
                          sx={{ height: 18, fontSize: '0.6rem' }}
                        />
                      )}
                      {task.sprint && (
                        <Chip
                          label={task.sprint.name}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.6rem' }}
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
                          height: 22,
                          fontSize: '0.65rem',
                          fontWeight: 500,
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
