import {
  Typography,
  Button,
  Stack,
  CircularProgress,
  IconButton,
  Chip,
  Tooltip,
  Box,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import type {
  Sprint,
  Task,
  TaskStatusConfig,
} from '@shared/interfaces/config/index.types';
import { getTaskTypeOption } from '@renderer/utils/task-type';
import {
  TaskListContainer,
  HeaderContainer,
  ContentContainer,
  TaskItem,
  EmptyState,
} from './styles';

export interface TaskListProps {
  sprint: Sprint;
  tasks: Task[];
  statuses: TaskStatusConfig[];
  loading: boolean;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onRemoveTask: (task: Task) => void;
}

export function TaskList({
  sprint,
  tasks,
  statuses,
  loading,
  onNewTask,
  onEditTask,
  onRemoveTask,
}: TaskListProps) {
  const getStatusLabel = (status: string) => {
    return statuses.find((s) => s.name === status)?.label ?? status;
  };

  const getStatusColor = (status: string) => {
    return statuses.find((s) => s.name === status)?.color ?? '#9e9e9e';
  };

  // Format date for display
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <TaskListContainer>
        <HeaderContainer>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {sprint.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onNewTask}
            sx={{ borderRadius: '0.5rem' }}
            disabled
          >
            Nova Tarefa
          </Button>
        </HeaderContainer>
        <ContentContainer>
          <Stack alignItems="center" justifyContent="center" height="100%">
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Carregando tarefas...
            </Typography>
          </Stack>
        </ContentContainer>
      </TaskListContainer>
    );
  }

  return (
    <TaskListContainer>
      <HeaderContainer>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {sprint.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onNewTask}
          sx={{ borderRadius: '0.5rem' }}
        >
          Nova Tarefa
        </Button>
      </HeaderContainer>

      <ContentContainer>
        {tasks.length > 0 ? (
          <Stack spacing={1.5}>
            {tasks.map((task) => (
              <TaskItem key={task.id}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Box flex={1}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mb={0.5}
                    >
                      <Typography variant="subtitle2" fontWeight={500}>
                        {task.title}
                      </Typography>
                      <Chip
                        label={getStatusLabel(task.status)}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: getStatusColor(task.status) + '20',
                          color: getStatusColor(task.status),
                          fontWeight: 500,
                        }}
                      />
                      {(() => {
                        const typeOpt = getTaskTypeOption(task.type);
                        return (
                          <Chip
                            label={typeOpt.label}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: typeOpt.color + '18',
                              color: typeOpt.color,
                              fontWeight: 600,
                            }}
                          />
                        );
                      })()}
                    </Stack>

                    {task.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {task.description}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={0.5} ml={2}>
                    <Tooltip title="Editar tarefa">
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
                    <Tooltip title="Remover tarefa">
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
                </Stack>
              </TaskItem>
            ))}
          </Stack>
        ) : (
          <EmptyState>
            <AssignmentIcon
              sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Nenhuma tarefa nesta sprint
            </Typography>
            <Typography variant="caption" color="text.secondary" mb={2}>
              Clique em "Nova Tarefa" para adicionar tarefas à sprint
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={onNewTask}
            >
              Nova Tarefa
            </Button>
          </EmptyState>
        )}
      </ContentContainer>
    </TaskListContainer>
  );
}

export default TaskList;
