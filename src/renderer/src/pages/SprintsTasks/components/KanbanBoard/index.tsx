import { useMemo, useRef, useCallback, useState } from 'react';
import {
  Typography,
  Button,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  Timer as TimerIcon,
  Speed as SpeedIcon,
  CalendarMonth as CalendarIcon,
  Group as GroupIcon,
  FiberManualRecord as DotIcon,
  PersonAdd as PersonAddIcon,
  PersonOff as PersonOffIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DraggableStateSnapshot,
} from '@hello-pangea/dnd';
import type {
  Sprint,
  Task,
  TaskStatusConfig,
  TeamMember,
} from '@shared/interfaces/config/index.types';
import { getInitials, getRoleColor } from '@renderer/utils/member';
import { getTaskTypeOption } from '@renderer/utils/task-type';
import { HtmlContent } from '@renderer/components/HtmlContent';
import {
  KanbanContainer,
  KanbanColumn,
  ColumnHeader,
  ColumnContent,
  KanbanCard,
  HeaderContainer,
} from './styles';

export interface KanbanBoardProps {
  sprint: Sprint;
  tasks: Task[];
  statuses: TaskStatusConfig[];
  teamMembers: TeamMember[];
  loading: boolean;
  onNewTask: () => void;
  onLinkTask: () => void;
  onEditTask: (task: Task) => void;
  onRemoveTask: (task: Task) => void;
  onStatusChange: (taskId: number, newStatus: string) => void;
  onAssignTask: (taskId: number, assigneeId: number | null) => void;
  onManageStatuses: () => void;
}

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#4caf50' },
  medium: { label: 'Média', color: '#ff9800' },
  high: { label: 'Alta', color: '#f44336' },
  critical: { label: 'Crítica', color: '#9c27b0' },
};

const formatDate = (date: Date | string | undefined) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
};

/** Card content shared between normal and clone renders */
function CardContent({
  task,
  priority,
  assigneeColor,
  onEditTask,
  onRemoveTask,
  onAssignClick,
}: {
  task: Task;
  priority: { label: string; color: string };
  assigneeColor: string;
  onEditTask: (task: Task) => void;
  onRemoveTask: (task: Task) => void;
  onAssignClick: (e: React.MouseEvent<HTMLElement>, task: Task) => void;
}) {
  return (
    <Stack spacing={1}>
      {/* Title + Actions */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Typography
          variant="body1"
          fontWeight={600}
          sx={{ flex: 1, minWidth: 0, lineHeight: 1.4, fontSize: '0.9rem' }}
        >
          {task.title}
        </Typography>
        <Stack direction="row" spacing={0.25} ml={1} flexShrink={0}>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEditTask(task);
              }}
              sx={{ p: 0.5 }}
            >
              <EditIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remover">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTask(task);
              }}
              sx={{ p: 0.5 }}
            >
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Description */}
      {task.description &&
        (/<[a-z][\s\S]*>/i.test(task.description) ? (
          <HtmlContent
            html={task.description}
            maxLines={2}
            sx={{ lineHeight: 1.4 }}
          />
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
            }}
          >
            {task.description}
          </Typography>
        ))}

      {/* Tags row: type + priority + estimation */}
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {(() => {
          const typeOpt = getTaskTypeOption(task.type);
          return (
            <Chip
              label={typeOpt.label}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                bgcolor: typeOpt.color + '18',
                color: typeOpt.color,
                fontWeight: 600,
              }}
            />
          );
        })()}
        <Chip
          icon={
            <DotIcon
              sx={{
                fontSize: '10px !important',
                color: `${priority.color} !important`,
              }}
            />
          }
          label={priority.label}
          size="small"
          sx={{
            height: 24,
            fontSize: '0.75rem',
            backgroundColor: priority.color + '15',
            color: priority.color,
            '& .MuiChip-icon': { ml: '4px' },
          }}
        />
        {task.estimationType === 'points' && task.estimationPoints != null && (
          <Chip
            icon={<SpeedIcon sx={{ fontSize: '14px !important' }} />}
            label={`${task.estimationPoints} pts`}
            size="small"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.75rem' }}
          />
        )}
        {task.estimationType === 'hours' && task.estimationHours != null && (
          <Chip
            icon={<TimerIcon sx={{ fontSize: '14px !important' }} />}
            label={`${task.estimationHours}h`}
            size="small"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.75rem' }}
          />
        )}
      </Stack>

      {/* Footer: assignee + dates + team */}
      <Stack spacing={0.5}>
        {/* Assignee row */}
        <Stack direction="row" alignItems="center" spacing={0.75}>
          {task.assignee ? (
            <Tooltip title={`Responsável: ${task.assignee.name}`}>
              <Chip
                avatar={
                  <Avatar
                    sx={{
                      width: 22,
                      height: 22,
                      fontSize: '0.65rem',
                      bgcolor: assigneeColor,
                    }}
                  >
                    {getInitials(task.assignee.name)}
                  </Avatar>
                }
                label={task.assignee.name}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignClick(e, task);
                }}
                sx={{
                  height: 26,
                  fontSize: '0.75rem',
                  maxWidth: '100%',
                  cursor: 'pointer',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Atribuir responsável">
              <Chip
                icon={<PersonAddIcon sx={{ fontSize: '14px !important' }} />}
                label="Atribuir"
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignClick(e, task);
                }}
                sx={{
                  height: 26,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  borderStyle: 'dashed',
                }}
              />
            </Tooltip>
          )}
        </Stack>

        {/* Dates + team row */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          {task.startDate || task.endDate ? (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                {formatDate(task.startDate)}
                {task.startDate && task.endDate && ' - '}
                {formatDate(task.endDate)}
              </Typography>
            </Stack>
          ) : (
            <Box />
          )}
          {task.team && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <GroupIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
                noWrap
              >
                {task.team.name}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

export function KanbanBoard({
  sprint,
  tasks,
  statuses,
  teamMembers,
  loading,
  onNewTask,
  onLinkTask,
  onEditTask,
  onRemoveTask,
  onStatusChange,
  onAssignTask,
  onManageStatuses,
}: KanbanBoardProps) {
  const dragWidthRef = useRef<number>(0);

  // Assignee menu state
  const [assignMenuAnchor, setAssignMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [assignMenuTask, setAssignMenuTask] = useState<Task | null>(null);

  const handleAssignClick = useCallback(
    (e: React.MouseEvent<HTMLElement>, task: Task) => {
      setAssignMenuAnchor(e.currentTarget);
      setAssignMenuTask(task);
    },
    [],
  );

  const handleAssignClose = useCallback(() => {
    setAssignMenuAnchor(null);
  }, []);

  const handleMenuExited = useCallback(() => {
    setAssignMenuTask(null);
  }, []);

  const handleAssignMember = useCallback(
    (memberId: number | null) => {
      if (assignMenuTask) {
        onAssignTask(assignMenuTask.id, memberId);
      }
      handleAssignClose();
    },
    [assignMenuTask, onAssignTask, handleAssignClose],
  );

  // Show all active team members (teams relation is not always populated from findAll)
  const availableMembers = teamMembers;

  // Lookup role by member id for avatar colors
  const memberRoleMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const m of teamMembers) map[m.id] = m.role;
    return map;
  }, [teamMembers]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    statuses.forEach((s) => {
      grouped[s.name] = [];
    });
    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        const firstStatus = statuses[0]?.name;
        if (firstStatus && grouped[firstStatus]) {
          grouped[firstStatus].push(task);
        }
      }
    });
    return grouped;
  }, [tasks, statuses]);

  const handleBeforeDragStart = useCallback(
    (start: { draggableId: string }) => {
      const el = document.querySelector(
        `[data-rfd-draggable-id="${start.draggableId}"]`,
      );
      if (el) {
        dragWidthRef.current = (
          el as HTMLElement
        ).getBoundingClientRect().width;
      }
    },
    [],
  );

  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const taskId = parseInt(draggableId.replace('task-', ''), 10);
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      onStatusChange(taskId, newStatus);
    }
  };

  const renderCard = (
    task: Task,
    provided: DraggableProvided,
    snapshot: DraggableStateSnapshot,
  ) => {
    const priority = PRIORITY_MAP[task.priority] ?? PRIORITY_MAP.medium;
    const style = {
      ...provided.draggableProps.style,
      ...(snapshot.isDragging && dragWidthRef.current
        ? { width: dragWidthRef.current }
        : {}),
    };

    return (
      <KanbanCard
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        isDragging={snapshot.isDragging}
        elevation={snapshot.isDragging ? 8 : 1}
        style={style}
      >
        <CardContent
          task={task}
          priority={priority}
          assigneeColor={getRoleColor(
            task.assignee ? memberRoleMap[task.assignee.id] : undefined,
          )}
          onEditTask={onEditTask}
          onRemoveTask={onRemoveTask}
          onAssignClick={handleAssignClick}
        />
      </KanbanCard>
    );
  };

  if (loading && tasks.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        height="100%"
        minHeight={0}
        overflow="hidden"
      >
        <HeaderContainer>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {sprint.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
            </Typography>
          </Box>
        </HeaderContainer>
        <Stack alignItems="center" justifyContent="center" flex={1}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary" mt={2}>
            Carregando tarefas...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      minHeight={0}
      overflow="hidden"
    >
      <HeaderContainer>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {sprint.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Gerenciar Status">
            <IconButton size="small" onClick={onManageStatuses}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Vincular tarefa existente à sprint">
            <Button
              variant="outlined"
              size="small"
              startIcon={<LinkIcon />}
              onClick={onLinkTask}
              sx={{ borderRadius: '0.5rem' }}
            >
              Vincular Tarefa
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onNewTask}
            sx={{ borderRadius: '0.5rem' }}
          >
            Nova Tarefa
          </Button>
        </Stack>
      </HeaderContainer>

      {statuses.length === 0 ? (
        <Stack alignItems="center" justifyContent="center" flex={1} p={4}>
          <AssignmentIcon
            sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Nenhum status configurado para o Kanban
          </Typography>
          <Button variant="outlined" size="small" onClick={onManageStatuses}>
            Configurar Status
          </Button>
        </Stack>
      ) : (
        <DragDropContext
          onBeforeDragStart={handleBeforeDragStart}
          onDragEnd={handleDragEnd}
        >
          <KanbanContainer>
            {statuses.map((status) => {
              const columnTasks = tasksByStatus[status.name] ?? [];
              return (
                <KanbanColumn key={status.name}>
                  <ColumnHeader bordercolor={status.color}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {status.label}
                      </Typography>
                      <Chip
                        label={columnTasks.length}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: status.color + '20',
                          color: status.color,
                          fontWeight: 600,
                        }}
                      />
                    </Stack>
                  </ColumnHeader>
                  <Droppable
                    droppableId={status.name}
                    renderClone={(provided, snapshot, rubric) => {
                      const task = columnTasks[rubric.source.index];
                      if (!task) return <div ref={provided.innerRef} />;
                      return renderCard(task, provided, snapshot);
                    }}
                  >
                    {(provided, snapshot) => (
                      <ColumnContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        isDragOver={snapshot.isDraggingOver}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={`task-${task.id}`}
                            index={index}
                          >
                            {(provided, snapshot) =>
                              renderCard(task, provided, snapshot)
                            }
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </ColumnContent>
                    )}
                  </Droppable>
                </KanbanColumn>
              );
            })}
          </KanbanContainer>
        </DragDropContext>
      )}

      {/* Assignee selection menu */}
      <Menu
        anchorEl={assignMenuAnchor}
        open={Boolean(assignMenuAnchor)}
        onClose={handleAssignClose}
        TransitionProps={{ onExited: handleMenuExited }}
        slotProps={{ paper: { sx: { maxHeight: 320, minWidth: 220 } } }}
      >
        {assignMenuTask?.assignee && (
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
        {assignMenuTask?.assignee && <Divider />}
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
              selected={member.id === assignMenuTask?.assignee?.id}
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

export default KanbanBoard;
