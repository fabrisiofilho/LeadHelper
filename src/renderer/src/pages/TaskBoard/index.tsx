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
import { Refresh as RefreshIcon, Lock as LockIcon } from '@mui/icons-material';
import { enqueueSnackbar } from 'notistack';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeams } from '@renderer/hooks/useTeams';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { TaskViewModal } from '@renderer/components/TaskViewModal';
import { PageContainer, ContentArea } from './styles';
import { TeamOverview } from './components/TeamOverview';
import {
  TaskBoardFilters,
  EMPTY_FILTERS,
  type TaskBoardFiltersState,
  type ViewMode,
} from './components/TaskBoardFilters';
import { TaskListView } from './components/TaskListView';
import { TaskKanbanView } from './components/TaskKanbanView';
import type { Team, Task } from '@shared/interfaces/config/index.types';

const READ_ONLY_MESSAGE = 'Este dado é gerenciado no Azure DevOps';

export function TaskBoardPage() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<TaskBoardFiltersState>(EMPTY_FILTERS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const { tasks, loading: tasksLoading, findAll: findAllTasks } = useTasks();

  const { teams, findAll: findAllTeams } = useTeams();
  const { findAll: findAllSprints } = useSprints();
  const { findAll: findAllTeamMembers } = useTeamMembers();
  const allStatuses = useMemo<
    import('@shared/interfaces/config/index.types').TaskStatusConfig[]
  >(() => [], []);

  const loadData = useCallback(async () => {
    await Promise.all([
      findAllTasks(),
      findAllTeams({ isActive: true }),
      findAllSprints(),
      findAllTeamMembers({ isActive: true }),
    ]);
  }, [findAllTasks, findAllTeams, findAllSprints, findAllTeamMembers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by selected team
    if (selectedTeam) {
      result = result.filter((t) => t.teamId === selectedTeam.id);
    }

    // Search
    if (filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.assignedToName?.toLowerCase().includes(term),
      );
    }

    // Priority
    if (filters.priority !== 'all') {
      result = result.filter((t) => t.priority === filters.priority);
    }

    // Type
    if (filters.type !== 'all') {
      result = result.filter((t) => t.type === filters.type);
    }

    // Status
    if (filters.status !== 'all') {
      result = result.filter((t) => t.status === filters.status);
    }

    // Sprint filter
    if (filters.sprintFilter === 'with_sprint') {
      result = result.filter((t) => t.sprintId != null);
    } else if (filters.sprintFilter === 'without_sprint') {
      result = result.filter((t) => !t.sprintId);
    }

    return result;
  }, [tasks, selectedTeam, filters]);

  // Status options for filter
  const statusOptions = useMemo(() => {
    return allStatuses.map((s) => ({ value: s.name, label: s.label }));
  }, [allStatuses]);

  // Read-only: show snackbar when user tries to edit
  const handleReadOnlyAction = useCallback(() => {
    enqueueSnackbar(READ_ONLY_MESSAGE, { variant: 'info' });
  }, []);

  const handleRefresh = async () => {
    await loadData();
  };

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  }, []);

  const isLoading = tasksLoading && tasks.length === 0;

  if (isLoading) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando tarefas...
          </Typography>
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
            Gestão de Tarefas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Controle global de tarefas por equipe — sustentação, projetos e
            demandas avulsas
          </Typography>
        </Box>
        <Tooltip title="Atualizar">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Alert
        severity="info"
        icon={<LockIcon fontSize="small" />}
        sx={{ mb: 2, flexShrink: 0 }}
      >
        Dados gerenciados no Azure DevOps. Visualização somente leitura.
      </Alert>

      <TeamOverview
        teams={teams}
        tasks={tasks}
        selectedTeam={selectedTeam}
        onSelectTeam={setSelectedTeam}
      />

      <ContentArea sx={{ mt: 2 }}>
        <TaskBoardFilters
          filters={filters}
          viewMode={viewMode}
          statusOptions={statusOptions}
          onChange={setFilters}
          onViewModeChange={setViewMode}
        />

        {viewMode === 'list' ? (
          <TaskListView
            tasks={filteredTasks}
            statuses={allStatuses}
            loading={tasksLoading}
            onReadOnlyAction={handleReadOnlyAction}
            onTaskClick={handleTaskClick}
          />
        ) : (
          <TaskKanbanView
            tasks={filteredTasks}
            statuses={allStatuses}
            loading={tasksLoading}
            onReadOnlyAction={handleReadOnlyAction}
          />
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

export default TaskBoardPage;
