import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeams } from '@renderer/hooks/useTeams';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useAllocations } from '@renderer/hooks/useAllocations';
import { useTaskStatusConfig } from '@renderer/hooks/useTaskStatusConfig';
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
import { TaskModal } from '@renderer/components/TaskModal';
import { Modal } from '@renderer/components/Modal';
import type {
  Team,
  Task,
  TeamMember,
  CreateTaskInput,
  UpdateTaskInput,
} from '@shared/interfaces/config/index.types';

export function TaskBoardPage() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<TaskBoardFiltersState>(EMPTY_FILTERS);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskModalLoading, setTaskModalLoading] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [taskToRemove, setTaskToRemove] = useState<Task | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    findAll: findAllTasks,
    create: createTask,
    update: updateTask,
    delete: deleteTask,
    clearError: clearTasksError,
  } = useTasks();

  const { teams, findAll: findAllTeams } = useTeams();
  const { sprints, findAll: findAllSprints } = useSprints();
  const { teamMembers, findAll: findAllTeamMembers } = useTeamMembers();
  const {
    create: createAllocation,
    delete: deleteAllocation,
    findByTask: findAllocationsByTask,
  } = useAllocations();
  const { statuses: allStatuses, findAll: fetchAllStatuses } =
    useTaskStatusConfig();

  const loadData = useCallback(async () => {
    await Promise.all([
      findAllTasks(),
      findAllTeams({ isActive: true }),
      findAllSprints(),
      findAllTeamMembers({ isActive: true }),
      fetchAllStatuses(),
    ]);
  }, [
    findAllTasks,
    findAllTeams,
    findAllSprints,
    findAllTeamMembers,
    fetchAllStatuses,
  ]);

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
          t.assignee?.name.toLowerCase().includes(term),
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

  // Task handlers
  const handleNewTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    clearTasksError();
  };

  const handleSaveTask = async (data: CreateTaskInput | UpdateTaskInput) => {
    setTaskModalLoading(true);
    try {
      if (editingTask) {
        const result = await updateTask(
          editingTask.id,
          data as UpdateTaskInput,
        );
        if (result) handleCloseTaskModal();
      } else {
        const result = await createTask(data as CreateTaskInput);
        if (result) handleCloseTaskModal();
      }
    } finally {
      setTaskModalLoading(false);
    }
  };

  const handleRemoveTask = (task: Task) => {
    setTaskToRemove(task);
    setIsRemoveModalOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!taskToRemove) return;
    setRemoveLoading(true);
    try {
      const success = await deleteTask(taskToRemove.id);
      if (success) {
        setIsRemoveModalOpen(false);
        setTaskToRemove(null);
      }
    } finally {
      setRemoveLoading(false);
    }
  };

  // Assign task to a team member via allocations
  const handleAssignTask = async (taskId: number, memberId: number | null) => {
    // Remove existing allocations for this task
    const existingAllocations = await findAllocationsByTask(taskId);
    for (const alloc of existingAllocations) {
      await deleteAllocation(alloc.id);
    }

    // Create new allocation if assigning
    if (memberId !== null) {
      const now = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      await createAllocation({
        teamMemberId: memberId,
        taskId,
        startDate: now,
        endDate,
      });
    }

    // Reload tasks to reflect the updated assignee
    await findAllTasks();
  };

  const handleRefresh = async () => {
    await loadData();
  };

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
            teamMembers={teamMembers}
            loading={tasksLoading}
            onNewTask={handleNewTask}
            onEditTask={handleEditTask}
            onRemoveTask={handleRemoveTask}
            onAssignTask={handleAssignTask}
          />
        ) : (
          <TaskKanbanView
            tasks={filteredTasks}
            statuses={allStatuses}
            teamMembers={teamMembers}
            loading={tasksLoading}
            onNewTask={handleNewTask}
            onEditTask={handleEditTask}
            onAssignTask={handleAssignTask}
          />
        )}
      </ContentArea>

      <TaskModal
        open={isTaskModalOpen}
        task={editingTask}
        sprints={sprints}
        teams={teams}
        statusOptions={allStatuses}
        loading={taskModalLoading}
        error={tasksError}
        onClose={handleCloseTaskModal}
        onSave={handleSaveTask}
      />

      <Modal
        variant="danger"
        open={isRemoveModalOpen}
        title="Excluir Tarefa"
        handleClose={() => {
          setIsRemoveModalOpen(false);
          setTaskToRemove(null);
        }}
        handleConfirm={handleConfirmRemove}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={removeLoading}
      >
        <Typography>
          Tem certeza que deseja excluir a tarefa{' '}
          <strong>{taskToRemove?.title}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Esta ação não pode ser desfeita.
        </Typography>
      </Modal>
    </PageContainer>
  );
}

export default TaskBoardPage;
