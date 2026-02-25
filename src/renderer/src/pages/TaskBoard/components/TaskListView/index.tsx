import { useMemo, useState, useCallback } from 'react';
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
  IconButton,
  Tooltip,
  Stack,
  CircularProgress,
  Button,
  Menu,
  MenuItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Timer as TimerIcon,
  Speed as SpeedIcon,
  PersonOff as PersonOffIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import type {
  Task,
  TaskStatusConfig,
  TeamMember,
} from '@shared/interfaces/config/index.types';
import { getInitials, getRoleColor } from '@renderer/utils/member';
import { getTaskTypeOption } from '@renderer/utils/task-type';

interface TaskListViewProps {
  tasks: Task[];
  statuses: TaskStatusConfig[];
  teamMembers: TeamMember[];
  loading: boolean;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onRemoveTask: (task: Task) => void;
  onAssignTask: (taskId: number, memberId: number | null) => Promise<void>;
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#4caf50' },
  medium: { label: 'Média', color: '#ff9800' },
  high: { label: 'Alta', color: '#f44336' },
  critical: { label: 'Crítica', color: '#9c27b0' },
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

export function TaskListView({
  tasks,
  statuses,
  teamMembers,
  loading,
  onNewTask,
  onEditTask,
  onRemoveTask,
  onAssignTask,
}: TaskListViewProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [assignAnchor, setAssignAnchor] = useState<HTMLElement | null>(null);
  const [assignTask, setAssignTask] = useState<Task | null>(null);

  const statusMap = useMemo(() => {
    const map: Record<string, TaskStatusConfig> = {};
    for (const s of statuses) {
      map[s.name] = s;
    }
    return map;
  }, [statuses]);

  // Lookup role by member id for avatar colors
  const memberRoleMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const m of teamMembers) map[m.id] = m.role;
    return map;
  }, [teamMembers]);

  const paginatedTasks = useMemo(() => {
    return tasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [tasks, page, rowsPerPage]);

  // Show all active team members (teams relation is not always populated)
  const availableMembers = teamMembers;

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
    // Don't clear assignTask here — let onExited do it to avoid flash
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

      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Equipe</TableCell>
              <TableCell>Sprint</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Prioridade</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Estimativa</TableCell>
              <TableCell>Período</TableCell>
              <TableCell align="right">Ações</TableCell>
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
                  color: '#757575',
                };
                const statusConfig = statusMap[task.status];

                return (
                  <TableRow
                    key={task.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onEditTask(task)}
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
                      {(() => {
                        const typeOpt = getTaskTypeOption(task.type);
                        return (
                          <Chip
                            label={typeOpt.label}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              bgcolor: typeOpt.color + '18',
                              color: typeOpt.color,
                              fontWeight: 600,
                            }}
                          />
                        );
                      })()}
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
                      <Tooltip title="Clique para atribuir">
                        <Chip
                          icon={
                            task.assignee ? (
                              <Avatar
                                sx={{
                                  width: 20,
                                  height: 20,
                                  fontSize: '0.6rem',
                                  bgcolor: getRoleColor(
                                    memberRoleMap[task.assignee.id],
                                  ),
                                }}
                              >
                                {getInitials(task.assignee.name)}
                              </Avatar>
                            ) : (
                              <PersonAddIcon sx={{ fontSize: 16 }} />
                            )
                          }
                          label={task.assignee?.name || 'Atribuir'}
                          size="small"
                          variant={task.assignee ? 'filled' : 'outlined'}
                          color={task.assignee ? 'primary' : 'default'}
                          onClick={(e) => handleAssignClick(e as any, task)}
                          sx={{
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {task.estimationType === 'points' &&
                      task.estimationPoints != null ? (
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                        >
                          <SpeedIcon
                            sx={{ fontSize: 14, color: 'text.secondary' }}
                          />
                          <Typography variant="caption">
                            {task.estimationPoints} pts
                          </Typography>
                        </Stack>
                      ) : task.estimationType === 'hours' &&
                        task.estimationHours != null ? (
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.5}
                        >
                          <TimerIcon
                            sx={{ fontSize: 14, color: 'text.secondary' }}
                          />
                          <Typography variant="caption">
                            {task.estimationHours}h
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(task.startDate)} -{' '}
                        {formatDate(task.endDate)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                      >
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveTask(task);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
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
        count={tasks.length}
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
