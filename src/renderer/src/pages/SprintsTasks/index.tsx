import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  ViewKanban as ViewKanbanIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeams } from '@renderer/hooks/useTeams';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useTaskStatusConfig } from '@renderer/hooks/useTaskStatusConfig';
import { useAllocations } from '@renderer/hooks/useAllocations';
import {
  PageContainer,
  TopSelectorBar,
  ContentArea,
  PlaceholderContent,
} from './styles';
import { SprintSelector } from './components/SprintSelector';
import { KanbanBoard } from './components/KanbanBoard';
import {
  KanbanFilters,
  EMPTY_FILTERS,
  type KanbanFiltersState,
} from './components/KanbanFilters';
import { SprintModal } from './components/SprintModal';
import { TaskModal } from '@renderer/components/TaskModal';
import { StatusManagerModal } from './components/StatusManagerModal';
import type {
  Sprint,
  Task,
  TaskStatusConfig,
  CreateSprintInput,
  UpdateSprintInput,
  CreateTaskInput,
  UpdateTaskInput,
} from '@shared/interfaces/config/index.types';

export function SprintsTasksPage() {
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [sprintModalLoading, setSprintModalLoading] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskModalLoading, setTaskModalLoading] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [kanbanStatuses, setKanbanStatuses] = useState<TaskStatusConfig[]>([]);
  const [allStatuses, setAllStatuses] = useState<TaskStatusConfig[]>([]);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[] | null>(null);
  const [kanbanFilters, setKanbanFilters] =
    useState<KanbanFiltersState>(EMPTY_FILTERS);

  // Hooks
  const {
    sprints,
    loading: sprintsLoading,
    error: sprintsError,
    findAll: findAllSprints,
    create: createSprint,
    update: updateSprint,
    clearError: clearSprintsError,
  } = useSprints();

  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    findAll: findAllTasks,
    create: createTask,
    update: updateTask,
    clearError: clearTasksError,
  } = useTasks();

  const {
    loading: statusesLoading,
    findAll: fetchAllStatuses,
    findKanban: fetchKanbanStatuses,
    create: createStatus,
    update: updateStatus,
    delete: deleteStatus,
  } = useTaskStatusConfig();

  const { teams, findAll: findAllTeams } = useTeams();
  const { teamMembers, findAll: findAllTeamMembers } = useTeamMembers();
  const {
    create: createAllocation,
    delete: deleteAllocation,
    findByTask: findAllocationsByTask,
  } = useAllocations();

  // Load functions
  const loadSprints = useCallback(async () => {
    await findAllSprints();
  }, [findAllSprints]);

  const loadStatuses = useCallback(async () => {
    const [kanban, all] = await Promise.all([
      fetchKanbanStatuses(),
      fetchAllStatuses(),
    ]);
    setKanbanStatuses(kanban);
    setAllStatuses(all);
  }, [fetchKanbanStatuses, fetchAllStatuses]);

  useEffect(() => {
    loadSprints();
    loadStatuses();
    findAllTeams({ isActive: true });
    findAllTeamMembers({ isActive: true });
  }, [loadSprints, loadStatuses, findAllTeams, findAllTeamMembers]);

  // Load tasks when sprint is selected
  useEffect(() => {
    if (selectedSprint) {
      findAllTasks({ sprintId: selectedSprint.id });
    }
  }, [selectedSprint, findAllTasks]);

  // Sprint handlers
  const handleSelectSprint = (sprint: Sprint | null) => {
    setSelectedSprint(sprint);
    setKanbanFilters(EMPTY_FILTERS);
  };

  const handleNewSprint = () => {
    setEditingSprint(null);
    setIsSprintModalOpen(true);
  };

  const handleEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setIsSprintModalOpen(true);
  };

  const handleCloseSprintModal = () => {
    setIsSprintModalOpen(false);
    setEditingSprint(null);
    clearSprintsError();
  };

  const handleSaveSprint = async (
    data: CreateSprintInput | UpdateSprintInput,
  ) => {
    setSprintModalLoading(true);
    try {
      if (editingSprint) {
        const result = await updateSprint(
          editingSprint.id,
          data as UpdateSprintInput,
        );
        if (result) {
          handleCloseSprintModal();
          if (selectedSprint?.id === editingSprint.id) {
            setSelectedSprint(result);
          }
        }
      } else {
        const result = await createSprint(data as CreateSprintInput);
        if (result) {
          handleCloseSprintModal();
        }
      }
    } finally {
      setSprintModalLoading(false);
    }
  };

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
        if (result) {
          handleCloseTaskModal();
        }
      } else {
        const result = await createTask(data as CreateTaskInput);
        if (result) {
          handleCloseTaskModal();
        }
      }
    } finally {
      setTaskModalLoading(false);
    }
  };

  const handleRemoveTask = (task: Task) => {
    console.log('Remove task:', task.id);
  };

  // Assign task to a team member via allocations table
  const handleAssignTask = async (taskId: number, memberId: number | null) => {
    // First, remove any existing allocation for this task
    const existingAllocations = await findAllocationsByTask(taskId);
    for (const alloc of existingAllocations) {
      await deleteAllocation(alloc.id);
    }

    // If assigning (not removing), create a new allocation
    if (memberId !== null) {
      const task = tasks.find((t) => t.id === taskId);
      const today = new Date();
      await createAllocation({
        teamMemberId: memberId,
        taskId,
        startDate: task?.startDate ?? today,
        endDate: task?.endDate ?? today,
      });
    }

    // Reload tasks so the derived assignee updates
    if (selectedSprint) {
      await findAllTasks({ sprintId: selectedSprint.id });
    }
  };

  // Kanban drag handler — optimistic update to avoid flash
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    // Optimistically update the local tasks so the card moves instantly without flash
    setOptimisticTasks((prev) => {
      const base = prev ?? tasks;
      return base.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t,
      );
    });
    await updateTask(taskId, {
      status: newStatus as UpdateTaskInput['status'],
    });
    // Clear optimistic override so we use the real data from the hook
    setOptimisticTasks(null);
  };

  // Status manager handlers
  const handleManageStatuses = () => {
    setIsStatusModalOpen(true);
  };

  const handleCloseStatusModal = () => {
    setIsStatusModalOpen(false);
    loadStatuses();
  };

  const handleRefresh = async () => {
    await loadSprints();
    await loadStatuses();
    if (selectedSprint) {
      await findAllTasks({ sprintId: selectedSprint.id });
    }
  };

  // Client-side filtering for the Kanban
  const baseTasks = optimisticTasks ?? tasks;
  const filteredTasks = useMemo(() => {
    let result = baseTasks;

    if (kanbanFilters.search.trim()) {
      const term = kanbanFilters.search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term),
      );
    }

    if (kanbanFilters.priorities.length > 0) {
      result = result.filter((t) =>
        kanbanFilters.priorities.includes(t.priority as any),
      );
    }

    if (kanbanFilters.teamId) {
      result = result.filter((t) => t.teamId === kanbanFilters.teamId);
    }

    return result;
  }, [baseTasks, kanbanFilters]);

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
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Sprints e Tarefas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie sprints e suas tarefas no Kanban
          </Typography>
        </Box>
        <Tooltip title="Atualizar">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <TopSelectorBar>
        <SprintSelector
          sprints={sprints}
          selectedSprint={selectedSprint}
          loading={sprintsLoading}
          onSelectSprint={handleSelectSprint}
          onNewSprint={handleNewSprint}
          onEditSprint={handleEditSprint}
        />
      </TopSelectorBar>

      <ContentArea>
        {selectedSprint ? (
          <>
            <KanbanFilters
              filters={kanbanFilters}
              teams={teams}
              onChange={setKanbanFilters}
            />
            <KanbanBoard
              sprint={selectedSprint}
              tasks={filteredTasks}
              statuses={kanbanStatuses}
              teamMembers={teamMembers}
              loading={tasksLoading}
              onNewTask={handleNewTask}
              onEditTask={handleEditTask}
              onRemoveTask={handleRemoveTask}
              onStatusChange={handleStatusChange}
              onAssignTask={handleAssignTask}
              onManageStatuses={handleManageStatuses}
            />
          </>
        ) : (
          <PlaceholderContent>
            <ViewKanbanIcon
              sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Selecione uma sprint
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Escolha uma sprint no seletor acima para visualizar e gerenciar
              suas tarefas no Kanban
            </Typography>
          </PlaceholderContent>
        )}
      </ContentArea>

      <SprintModal
        open={isSprintModalOpen}
        sprint={editingSprint}
        loading={sprintModalLoading}
        error={sprintsError}
        onClose={handleCloseSprintModal}
        onSave={handleSaveSprint}
      />

      <TaskModal
        open={isTaskModalOpen}
        task={editingTask}
        fixedSprint={selectedSprint}
        teams={teams}
        statusOptions={allStatuses}
        loading={taskModalLoading}
        error={tasksError}
        onClose={handleCloseTaskModal}
        onSave={handleSaveTask}
      />

      <StatusManagerModal
        open={isStatusModalOpen}
        statuses={allStatuses}
        loading={statusesLoading}
        onClose={handleCloseStatusModal}
        onCreate={createStatus}
        onUpdate={updateStatus}
        onDelete={deleteStatus}
        onRefresh={loadStatuses}
      />
    </PageContainer>
  );
}

export default SprintsTasksPage;
