import { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Timer as TimerIcon,
  Speed as SpeedIcon,
  PersonOff as PersonOffIcon,
} from '@mui/icons-material';
import type {
  Task,
  TaskStatusConfig,
  TeamMember,
} from '@shared/interfaces/config/index.types';
import { getInitials, getRoleColor } from '@renderer/utils/member';
import { getTaskTypeOption } from '@renderer/utils/task-type';

interface TaskKanbanViewProps {
  tasks: Task[];
  statuses: TaskStatusConfig[];
  teamMembers: TeamMember[];
  loading: boolean;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onAssignTask: (taskId: number, memberId: number | null) => Promise<void>;
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
  teamMembers,
  loading,
  onNewTask,
  onEditTask,
  onAssignTask,
}: TaskKanbanViewProps) {
  const [assignAnchor, setAssignAnchor] = useState<HTMLElement | null>(null);
  const [assignTask, setAssignTask] = useState<Task | null>(null);

  const columns = useMemo(() => {
    const kanbanStatuses = statuses.filter((s) => s.showInKanban);
    return kanbanStatuses.map((status) => ({
      status,
      tasks: tasks.filter((t) => t.status === status.name),
    }));
  }, [statuses, tasks]);

  // Show all active team members (teams relation is not always populated)
  const availableMembers = teamMembers;

  // Lookup role by member id for avatar colors
  const memberRoleMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const m of teamMembers) map[m.id] = m.role;
    return map;
  }, [teamMembers]);

  const handleAssignClick = useCallback(
    (e: React.MouseEvent<HTMLElement>, task: Task) => {
      e.stopPropagation();
      setAssignAnchor(e.currentTarget);
      setAssignTask(task);
    },
    [],
  );

  const handleAssignClose = useCallback(() => {
    setAssignAnchor(null);
  }, []);

  const handleMenuExited = useCallback(() => {
    setAssignTask(null);
  }, []);

  const handleAssignMember = useCallback(
    (memberId: number | null) => {
      if (assignTask) {
        onAssignTask(assignTask.id, memberId);
      }
      handleAssignClose();
    },
    [assignTask, onAssignTask, handleAssignClose],
  );

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
      <Stack
        direction="row"
        justifyContent="flex-end"
        px={2}
        py={1}
        flexShrink={0}
      >
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onNewTask}
        >
          Nova Tarefa
        </Button>
      </Stack>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          gap: 2,
          px: 2,
          pb: 2,
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
                    onClick={() => onEditTask(task)}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || '#757575'}`,
                      transition: 'all 0.15s',
                      '&:hover': {
                        borderColor: 'primary.light',
                        boxShadow: 1,
                      },
                    }}
                  >
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {task.title}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={0.5}
                      mt={0.75}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {(() => {
                        const typeOpt = getTaskTypeOption(task.type);
                        return (
                          <Chip
                            label={typeOpt.label}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              bgcolor: typeOpt.color + '18',
                              color: typeOpt.color,
                              fontWeight: 600,
                            }}
                          />
                        );
                      })()}
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

                    {/* Assignee chip — clickable */}
                    <Tooltip title="Clique para atribuir responsável">
                      <Chip
                        icon={
                          task.assignee ? (
                            <Avatar
                              sx={{
                                width: 18,
                                height: 18,
                                fontSize: '0.55rem',
                                bgcolor: getRoleColor(
                                  memberRoleMap[task.assignee.id],
                                ),
                              }}
                            >
                              {getInitials(task.assignee.name)}
                            </Avatar>
                          ) : undefined
                        }
                        label={task.assignee?.name || 'Atribuir'}
                        size="small"
                        variant={task.assignee ? 'filled' : 'outlined'}
                        color={task.assignee ? 'primary' : 'default'}
                        onClick={(e) => handleAssignClick(e as any, task)}
                        sx={{
                          mt: 0.75,
                          height: 22,
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      />
                    </Tooltip>

                    {task.estimationType && (
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        mt={0.5}
                      >
                        {task.estimationType === 'points' ? (
                          <>
                            <SpeedIcon
                              sx={{ fontSize: 12, color: 'text.secondary' }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {task.estimationPoints} pts
                            </Typography>
                          </>
                        ) : (
                          <>
                            <TimerIcon
                              sx={{ fontSize: 12, color: 'text.secondary' }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {task.estimationHours}h
                            </Typography>
                          </>
                        )}
                      </Stack>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Assignee selection menu */}
      <Menu
        anchorEl={assignAnchor}
        open={Boolean(assignAnchor)}
        onClose={handleAssignClose}
        TransitionProps={{ onExited: handleMenuExited }}
        slotProps={{ paper: { sx: { maxHeight: 320, minWidth: 220 } } }}
      >
        {assignTask?.assignee && (
          <MenuItem onClick={() => handleAssignMember(null)}>
            <ListItemAvatar sx={{ minWidth: 36 }}>
              <PersonOffIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            </ListItemAvatar>
            <ListItemText
              primary="Remover responsável"
              primaryTypographyProps={{
                variant: 'body2',
                color: 'text.secondary',
              }}
            />
          </MenuItem>
        )}
        {assignTask?.assignee && <Divider />}
        {availableMembers.length === 0 ? (
          <MenuItem disabled>
            <ListItemText
              primary="Nenhum membro disponível"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </MenuItem>
        ) : (
          availableMembers.map((member) => (
            <MenuItem
              key={member.id}
              selected={member.id === assignTask?.assignee?.id}
              onClick={() => handleAssignMember(member.id)}
            >
              <ListItemAvatar sx={{ minWidth: 36 }}>
                <Avatar
                  sx={{
                    width: 26,
                    height: 26,
                    fontSize: '0.7rem',
                    bgcolor: getRoleColor(member.role),
                  }}
                >
                  {getInitials(member.name)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={member.name}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
}
