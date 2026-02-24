import { useMemo } from 'react';
import {
  Typography,
  Button,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  Box,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import type { Sprint, Task } from '@shared/interfaces/config/index.types';
import type { TaskStatusConfig } from '@shared/interfaces/config/index.types';
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
  loading: boolean;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onRemoveTask: (task: Task) => void;
  onStatusChange: (taskId: number, newStatus: string) => void;
  onManageStatuses: () => void;
}

const formatDate = (date: Date | string | undefined) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
};

export function KanbanBoard({
  sprint,
  tasks,
  statuses,
  loading,
  onNewTask,
  onEditTask,
  onRemoveTask,
  onStatusChange,
  onManageStatuses,
}: KanbanBoardProps) {
  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    statuses.forEach((s) => {
      grouped[s.name] = [];
    });
    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        // Task has a status not in kanban columns - put in first column
        const firstStatus = statuses[0]?.name;
        if (firstStatus && grouped[firstStatus]) {
          grouped[firstStatus].push(task);
        }
      }
    });
    return grouped;
  }, [tasks, statuses]);

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

  if (loading && tasks.length === 0) {
    return (
      <Box display="flex" flexDirection="column" height="100%">
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
    <Box display="flex" flexDirection="column" height="100%">
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <KanbanContainer>
            {statuses.map((status) => (
              <KanbanColumn key={status.name}>
                <ColumnHeader bordercolor={status.color}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {status.label}
                    </Typography>
                    <Chip
                      label={tasksByStatus[status.name]?.length ?? 0}
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
                <Droppable droppableId={status.name}>
                  {(provided, snapshot) => (
                    <ColumnContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        backgroundColor: snapshot.isDraggingOver
                          ? (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(0,0,0,0.04)'
                          : undefined,
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      {(tasksByStatus[status.name] ?? []).map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={`task-${task.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <KanbanCard
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              elevation={snapshot.isDragging ? 6 : 1}
                              sx={{
                                transform: snapshot.isDragging
                                  ? 'rotate(2deg)'
                                  : undefined,
                              }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                              >
                                <Box flex={1} minWidth={0}>
                                  <Typography
                                    variant="body2"
                                    fontWeight={500}
                                    noWrap
                                  >
                                    {task.title}
                                  </Typography>
                                  {task.description && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        mt: 0.5,
                                      }}
                                    >
                                      {task.description}
                                    </Typography>
                                  )}
                                  {(task.startDate || task.endDate) && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ mt: 0.5, display: 'block' }}
                                    >
                                      {formatDate(task.startDate)}
                                      {task.startDate && task.endDate && ' - '}
                                      {formatDate(task.endDate)}
                                    </Typography>
                                  )}
                                </Box>
                                <Stack direction="row" spacing={0} ml={0.5}>
                                  <Tooltip title="Editar">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTask(task);
                                      }}
                                      sx={{ p: 0.5 }}
                                    >
                                      <EditIcon sx={{ fontSize: 16 }} />
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
                                      <DeleteIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Stack>
                            </KanbanCard>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ColumnContent>
                  )}
                </Droppable>
              </KanbanColumn>
            ))}
          </KanbanContainer>
        </DragDropContext>
      )}
    </Box>
  );
}

export default KanbanBoard;
