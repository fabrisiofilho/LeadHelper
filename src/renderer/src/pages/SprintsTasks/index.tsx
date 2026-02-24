import { useEffect, useState, useCallback } from 'react';
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
import { useTaskStatusConfig } from '@renderer/hooks/useTaskStatusConfig';
import {
  PageContainer,
  ContentContainer,
  LeftPanel,
  RightPanel,
  PlaceholderContent,
} from './styles';
import { SprintList } from './components/SprintList';
import { KanbanBoard } from './components/KanbanBoard';
import { SprintModal } from './components/SprintModal';
import { TaskModal } from './components/TaskModal';
import { StatusManagerModal } from './components/StatusManagerModal';
import type {
  Sprint,
  Task,
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
    statuses,
    loading: statusesLoading,
    findAll: findAllStatuses,
    findKanban: findKanbanStatuses,
    create: createStatus,
    update: updateStatus,
    delete: deleteStatus,
  } = useTaskStatusConfig();

  // Load sprints and statuses on mount
  const loadSprints = useCallback(async () => {
    await findAllSprints();
  }, [findAllSprints]);

  const loadStatuses = useCallback(async () => {
    await findKanbanStatuses();
  }, [findKanbanStatuses]);

  useEffect(() => {
    loadSprints();
    loadStatuses();
  }, [loadSprints, loadStatuses]);

  // Load tasks when sprint is selected
  useEffect(() => {
    if (selectedSprint) {
      findAllTasks({ sprintId: selectedSprint.id });
    }
  }, [selectedSprint, findAllTasks]);

  // Sprint handlers
  const handleSelectSprint = (sprint: Sprint) => {
    setSelectedSprint(sprint);
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

  // Kanban drag handler - update task status
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    await updateTask(taskId, {
      status: newStatus as UpdateTaskInput['status'],
    });
  };

  // Status manager handlers
  const handleManageStatuses = () => {
    // Load all statuses (including hidden ones) for the manager
    findAllStatuses();
    setIsStatusModalOpen(true);
  };

  const handleCloseStatusModal = () => {
    setIsStatusModalOpen(false);
    // Reload kanban statuses after changes
    loadStatuses();
  };

  const handleRefresh = async () => {
    await loadSprints();
    await loadStatuses();
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
      {/* Page Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Sprints e Tarefas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie sprints e suas tarefas no Kanban
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

      {/* Two-Panel Layout */}
      <ContentContainer>
        {/* Left Panel - Sprint List (30%) */}
        <LeftPanel>
          <SprintList
            sprints={sprints}
            selectedSprint={selectedSprint}
            loading={sprintsLoading}
            onSelectSprint={handleSelectSprint}
            onNewSprint={handleNewSprint}
            onEditSprint={handleEditSprint}
          />
        </LeftPanel>

        {/* Right Panel - Kanban Board (70%) */}
        <RightPanel>
          {selectedSprint ? (
            <KanbanBoard
              sprint={selectedSprint}
              tasks={tasks}
              statuses={statuses}
              loading={tasksLoading}
              onNewTask={handleNewTask}
              onEditTask={handleEditTask}
              onRemoveTask={handleRemoveTask}
              onStatusChange={handleStatusChange}
              onManageStatuses={handleManageStatuses}
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
                Escolha uma sprint na lista à esquerda para visualizar e
                gerenciar suas tarefas no Kanban
              </Typography>
            </PlaceholderContent>
          )}
        </RightPanel>
      </ContentContainer>

      {/* Sprint Modal */}
      <SprintModal
        open={isSprintModalOpen}
        sprint={editingSprint}
        loading={sprintModalLoading}
        error={sprintsError}
        onClose={handleCloseSprintModal}
        onSave={handleSaveSprint}
      />

      {/* Task Modal */}
      <TaskModal
        open={isTaskModalOpen}
        task={editingTask}
        sprint={selectedSprint}
        loading={taskModalLoading}
        error={tasksError}
        statusOptions={statuses}
        onClose={handleCloseTaskModal}
        onSave={handleSaveTask}
      />

      {/* Status Manager Modal */}
      <StatusManagerModal
        open={isStatusModalOpen}
        statuses={statuses}
        loading={statusesLoading}
        onClose={handleCloseStatusModal}
        onCreate={createStatus}
        onUpdate={updateStatus}
        onDelete={deleteStatus}
      />
    </PageContainer>
  );
}

export default SprintsTasksPage;
