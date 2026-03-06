import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  Alert,
} from '@mui/material';
import {
  ViewKanban as ViewKanbanIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { enqueueSnackbar } from 'notistack';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeams } from '@renderer/hooks/useTeams';
import { TaskViewModal } from '@renderer/components/TaskViewModal';
import { PageContainer, ContentArea, PlaceholderContent } from './styles';
import { SprintOverview } from './components/SprintOverview';
import { TaskListView } from '@renderer/pages/TaskBoard/components/TaskListView';
import type { Sprint, Task } from '@shared/interfaces/config/index.types';

const READ_ONLY_MESSAGE = 'Este dado é gerenciado no Azure DevOps';

export function SprintsTasksPage() {
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const {
    sprints,
    loading: sprintsLoading,
    error: sprintsError,
    findAll: findAllSprints,
  } = useSprints();

  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    findAll: findAllTasks,
  } = useTasks();

  const { findAll: findAllTeams } = useTeams();

  const allStatuses = useMemo<
    import('@shared/interfaces/config/index.types').TaskStatusConfig[]
  >(() => [], []);

  const loadSprints = useCallback(async () => {
    // Load only active sprints (not finished)
    const allSprints = await findAllSprints({ isActive: true });

    // Filter to show only current and future sprints
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeOrFutureSprints = allSprints.filter((sprint) => {
      const endDate = new Date(sprint.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today;
    });

    // If no active/future sprints, load the most recent finished sprint
    if (activeOrFutureSprints.length === 0) {
      const allSprintsIncludingFinished = await findAllSprints();
      const finishedSprints = allSprintsIncludingFinished
        .filter((sprint) => {
          const endDate = new Date(sprint.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate < today;
        })
        .sort(
          (a, b) =>
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
        );

      // Keep only the most recent finished sprint
      if (finishedSprints.length > 0) {
        return [finishedSprints[0]];
      }
    }

    return activeOrFutureSprints;
  }, [findAllSprints]);

  useEffect(() => {
    loadSprints();
    findAllTeams({ isActive: true });
  }, [loadSprints, findAllTeams]);

  // Load tasks when sprint is selected
  useEffect(() => {
    if (selectedSprint) {
      findAllTasks({ sprintId: selectedSprint.id });
    }
  }, [selectedSprint, findAllTasks]);

  // Sprint handlers (read-only: only selection)
  const handleSelectSprint = (sprint: Sprint | null) => {
    setSelectedSprint(sprint);
  };

  // Read-only: show snackbar when user tries to edit
  const handleReadOnlyAction = useCallback(() => {
    enqueueSnackbar(READ_ONLY_MESSAGE, { variant: 'info' });
  }, []);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  }, []);

  const handleRefresh = async () => {
    await loadSprints();
    if (selectedSprint) {
      await findAllTasks({ sprintId: selectedSprint.id });
    }
  };

  // Loading state
  const isLoading = sprintsLoading && sprints.length === 0;
  const hasError = (sprintsError || tasksError) && sprints.length === 0;

  if (isLoading) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando sprints...
          </Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (hasError) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {sprintsError || tasksError}
          </Typography>
          <IconButton onClick={handleRefresh} sx={{ mt: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexShrink={0}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Sprints e Tarefas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visualização de tarefas agrupadas por sprint
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Atualizar">
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Alert
        severity="info"
        icon={<LockIcon fontSize="small" />}
        sx={{ mb: 2, flexShrink: 0 }}
      >
        Dados gerenciados no Azure DevOps. Visualização somente leitura.
      </Alert>

      <SprintOverview
        sprints={sprints}
        selectedSprint={selectedSprint}
        onSelectSprint={handleSelectSprint}
      />

      <ContentArea sx={{ mt: 2 }}>
        {selectedSprint ? (
          <TaskListView
            tasks={tasks}
            statuses={allStatuses}
            loading={tasksLoading}
            onReadOnlyAction={handleReadOnlyAction}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <PlaceholderContent>
            <ViewKanbanIcon
              sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Selecione uma sprint
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Escolha uma sprint no seletor acima para visualizar as tarefas
            </Typography>
          </PlaceholderContent>
        )}
      </ContentArea>

      <TaskViewModal
        open={isTaskModalOpen}
        task={selectedTask}
        onClose={handleCloseTaskModal}
      />
    </PageContainer>
  );
}

export default SprintsTasksPage;
