import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  InputAdornment,
  Alert,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Cloud as CloudIcon,
  Sync as SyncIcon,
  Timer as TimerIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { useTasks } from '@renderer/hooks/useTasks';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTeams } from '@renderer/hooks/useTeams';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import {
  PageContainer,
  PlaceholderContent,
  FiltersContainer,
  FormContainer,
} from './styles';
import type {
  Task,
  TaskStatus,
  TaskOrigin,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  EstimationType,
} from '@shared/interfaces/task.interface';

/**
 * Tasks management page
 * Allows CRUD operations for tasks/demands
 */

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
];

const statusFilterOptions = [
  { value: 'all', label: 'Todos' },
  ...statusOptions,
];

const originFilterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'manual', label: 'Manual' },
  { value: 'azure_devops', label: 'Azure DevOps' },
];

const getStatusLabel = (status: TaskStatus): string => {
  const option = statusOptions.find((opt) => opt.value === status);
  return option?.label ?? status;
};

const getStatusColor = (
  status: TaskStatus,
):
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'error' => {
  const colorMap: Record<
    TaskStatus,
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'info'
    | 'error'
  > = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    cancelled: 'default',
  };
  return colorMap[status] ?? 'default';
};

const getOriginLabel = (origin: TaskOrigin): string => {
  const labelMap: Record<TaskOrigin, string> = {
    manual: 'Manual',
    azure_devops: 'Azure DevOps',
  };
  return labelMap[origin] ?? origin;
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

interface TaskFormData {
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  status: TaskStatus;
  sprintId: number | null;
  teamId: number | null;
  estimationType: EstimationType | null;
  estimationPoints: number | null;
  estimationHours: number | null;
}

export function TasksPage() {
  const {
    tasks,
    loading,
    error,
    findAll,
    create,
    update,
    delete: deleteTask,
    clearError,
  } = useTasks();

  const { sprints, findAll: findAllSprints } = useSprints();
  const { teams, findAll: findAllTeams } = useTeams();

  const {
    syncTask,
    syncAllImportedTasks,
    loading: syncLoading,
    error: syncError,
    syncResult,
    clearError: clearSyncError,
    clearSyncResult,
  } = useAzureDevOps();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [syncingTaskId, setSyncingTaskId] = useState<number | null>(null);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [originFilter, setOriginFilter] = useState<TaskOrigin | 'all'>('all');
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      description: '',
      startDate: null,
      endDate: null,
      status: 'pending',
      sprintId: null,
      teamId: null,
      estimationType: null,
      estimationPoints: null,
      estimationHours: null,
    },
  });

  const watchedEstimationType = watch('estimationType');

  const loadTasks = useCallback(async () => {
    const filters: TaskFilters = {};

    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }

    if (originFilter !== 'all') {
      filters.origin = originFilter;
    }

    if (startDateFilter) {
      filters.startDate = startDateFilter;
    }

    if (endDateFilter) {
      filters.endDate = endDateFilter;
    }

    await findAll(filters);
  }, [findAll, statusFilter, originFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    loadTasks();
    findAllSprints({ isActive: true });
    findAllTeams({ isActive: true });
  }, [loadTasks, findAllSprints, findAllTeams]);

  // Filter tasks by search term (client-side)
  const filteredTasks = tasks.filter((task) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      task.title.toLowerCase().includes(search) ||
      (task.description?.toLowerCase().includes(search) ?? false)
    );
  });

  const handleNewTask = () => {
    setSelectedTask(null);
    reset({
      title: '',
      description: '',
      startDate: null,
      endDate: null,
      status: 'pending',
      sprintId: null,
      teamId: null,
      estimationType: null,
      estimationPoints: null,
      estimationHours: null,
    });
    setIsFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    reset({
      title: task.title,
      description: task.description ?? '',
      startDate: task.startDate ? new Date(task.startDate) : null,
      endDate: task.endDate ? new Date(task.endDate) : null,
      status: task.status,
      sprintId: task.sprintId ?? null,
      teamId: task.teamId ?? null,
      estimationType: task.estimationType ?? null,
      estimationPoints: task.estimationPoints ?? null,
      estimationHours: task.estimationHours ?? null,
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedTask(null);
    reset();
    clearError();
  };

  const handleSaveTask = async (data: TaskFormData) => {
    setFormLoading(true);
    try {
      if (selectedTask) {
        const updateData: UpdateTaskInput = {
          title: data.title,
          description: data.description || undefined,
          startDate: data.startDate ?? undefined,
          endDate: data.endDate ?? undefined,
          status: data.status,
          sprintId: data.sprintId ?? undefined,
          teamId: data.teamId ?? undefined,
          estimationType: data.estimationType ?? undefined,
          estimationPoints: data.estimationPoints ?? undefined,
          estimationHours: data.estimationHours ?? undefined,
        };
        const result = await update(selectedTask.id, updateData);
        if (result) {
          handleCloseForm();
        }
      } else {
        const createData: CreateTaskInput = {
          title: data.title,
          description: data.description || undefined,
          startDate: data.startDate ?? undefined,
          endDate: data.endDate ?? undefined,
          status: data.status,
          sprintId: data.sprintId ?? undefined,
          teamId: data.teamId ?? undefined,
          estimationType: data.estimationType ?? undefined,
          estimationPoints: data.estimationPoints ?? undefined,
          estimationHours: data.estimationHours ?? undefined,
        };
        const result = await create(createData);
        if (result) {
          handleCloseForm();
        }
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const success = await deleteTask(taskToDelete.id);
      if (success) {
        setIsDeleteModalOpen(false);
        setTaskToDelete(null);
      } else {
        setDeleteError(
          error ||
            'Não foi possível excluir a tarefa. Verifique se não há alocações vinculadas.',
        );
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTaskToDelete(null);
    setDeleteError(null);
    clearError();
  };

  // Sync handlers for Azure DevOps tasks
  const handleSyncTask = async (taskId: number) => {
    setSyncingTaskId(taskId);
    setSyncSuccess(null);
    clearSyncError();

    try {
      const result = await syncTask(taskId);
      if (result) {
        setSyncSuccess(`Tarefa "${result.title}" sincronizada com sucesso!`);
        await loadTasks();
      }
    } finally {
      setSyncingTaskId(null);
    }
  };

  const handleSyncAllTasks = async () => {
    setSyncAllLoading(true);
    setSyncSuccess(null);
    clearSyncError();

    try {
      const result = await syncAllImportedTasks();
      if (result) {
        if (result.synced > 0) {
          setSyncSuccess(
            `${result.synced} tarefa(s) sincronizada(s) com sucesso!${
              result.failed > 0 ? ` ${result.failed} falha(s).` : ''
            }`,
          );
        } else if (result.failed > 0) {
          // Error will be shown from syncError
        } else {
          setSyncSuccess('Nenhuma tarefa para sincronizar.');
        }
        await loadTasks();
      }
    } finally {
      setSyncAllLoading(false);
    }
  };

  const hasAzureDevOpsTasks = tasks.some(
    (task) => task.origin === 'azure_devops',
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setStatusFilter(event.target.value as TaskStatus | 'all');
    setPage(0);
  };

  const handleOriginFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setOriginFilter(event.target.value as TaskOrigin | 'all');
    setPage(0);
  };

  const paginatedTasks = filteredTasks.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  if (loading && tasks.length === 0) {
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

  if (error && tasks.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <IconButton onClick={loadTasks} sx={{ mt: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <PageContainer>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Tarefas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie as tarefas e demandas da equipe
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Atualizar">
              <IconButton onClick={loadTasks} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            {hasAzureDevOpsTasks && (
              <Button
                variant="outlined"
                startIcon={
                  syncAllLoading ? <CircularProgress size={16} /> : <SyncIcon />
                }
                onClick={handleSyncAllTasks}
                disabled={syncAllLoading || syncLoading}
                sx={{ borderRadius: '0.5rem' }}
              >
                {syncAllLoading ? 'Sincronizando...' : 'Sincronizar Todas'}
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewTask}
              sx={{ borderRadius: '0.5rem' }}
            >
              Nova Tarefa
            </Button>
          </Stack>
        </Stack>

        {/* Sync Alerts */}
        {syncError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearSyncError}>
            {syncError}
          </Alert>
        )}

        {syncSuccess && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSyncSuccess(null)}
          >
            {syncSuccess}
          </Alert>
        )}

        {syncResult && syncResult.errors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={clearSyncResult}>
            Erros durante sincronização: {syncResult.errors.join(', ')}
          </Alert>
        )}

        {/* Filters */}
        <FiltersContainer>
          <TextField
            size="small"
            placeholder="Buscar por título ou descrição..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 250 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            sx={{ minWidth: 150 }}
            slotProps={{
              select: {
                displayEmpty: true,
              },
              inputLabel: { shrink: true },
            }}
          >
            {statusFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Origem"
            value={originFilter}
            onChange={handleOriginFilterChange}
            sx={{ minWidth: 150 }}
            slotProps={{
              select: {
                displayEmpty: true,
              },
              inputLabel: { shrink: true },
            }}
          >
            {originFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <DatePicker
            label="Data Início"
            value={startDateFilter}
            onChange={(newValue) => {
              setStartDateFilter(newValue);
              setPage(0);
            }}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
                slotProps: { inputLabel: { shrink: true } },
              },
            }}
          />
          <DatePicker
            label="Data Fim"
            value={endDateFilter}
            onChange={(newValue) => {
              setEndDateFilter(newValue);
              setPage(0);
            }}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
                slotProps: { inputLabel: { shrink: true } },
              },
            }}
          />
        </FiltersContainer>

        {filteredTasks.length > 0 ? (
          <Paper
            sx={{ width: '100%', overflow: 'hidden', borderRadius: '1rem' }}
          >
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Título</TableCell>
                    <TableCell>Sprint / Equipe</TableCell>
                    <TableCell>Estimativa</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Origem</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedTasks.map((task) => (
                    <TableRow key={task.id} hover>
                      <TableCell>
                        <Typography fontWeight={500}>{task.title}</Typography>
                        {task.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                            sx={{ maxWidth: 250 }}
                          >
                            {task.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          {task.sprint && (
                            <Chip
                              label={task.sprint.name}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {task.team && (
                            <Chip
                              label={task.team.name}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                          {!task.sprint && !task.team && (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {task.estimationType === 'points' &&
                        task.estimationPoints ? (
                          <Chip
                            icon={<SpeedIcon fontSize="small" />}
                            label={`${task.estimationPoints} pts`}
                            size="small"
                            variant="outlined"
                          />
                        ) : task.estimationType === 'hours' &&
                          task.estimationHours ? (
                          <Chip
                            icon={<TimerIcon fontSize="small" />}
                            label={`${task.estimationHours}h`}
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(task.startDate)} -{' '}
                          {formatDate(task.endDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(task.status)}
                          color={getStatusColor(task.status)}
                          size="small"
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            task.origin === 'azure_devops' ? (
                              <CloudIcon fontSize="small" />
                            ) : undefined
                          }
                          label={getOriginLabel(task.origin)}
                          color={
                            task.origin === 'azure_devops'
                              ? 'primary'
                              : 'default'
                          }
                          size="small"
                          variant={
                            task.origin === 'azure_devops'
                              ? 'filled'
                              : 'outlined'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        {task.origin === 'azure_devops' && (
                          <Tooltip title="Sincronizar com Azure DevOps">
                            <IconButton
                              size="small"
                              onClick={() => handleSyncTask(task.id)}
                              disabled={
                                syncingTaskId === task.id || syncAllLoading
                              }
                              color="primary"
                            >
                              {syncingTaskId === task.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <SyncIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleEditTask(task)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(task)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredTasks.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </Paper>
        ) : (
          <PlaceholderContent>
            <AssignmentIcon
              sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm ||
              statusFilter !== 'all' ||
              originFilter !== 'all' ||
              startDateFilter ||
              endDateFilter
                ? 'Nenhuma tarefa encontrada com os filtros aplicados'
                : 'Nenhuma tarefa cadastrada'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchTerm ||
              statusFilter !== 'all' ||
              originFilter !== 'all' ||
              startDateFilter ||
              endDateFilter
                ? 'Tente ajustar os filtros de busca'
                : 'Clique em "Nova Tarefa" para adicionar a primeira tarefa'}
            </Typography>
            {!searchTerm &&
              statusFilter === 'all' &&
              originFilter === 'all' &&
              !startDateFilter &&
              !endDateFilter && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleNewTask}
                >
                  Nova Tarefa
                </Button>
              )}
          </PlaceholderContent>
        )}

        {/* Form Modal */}
        <Modal
          variant="form"
          open={isFormOpen}
          title={selectedTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          handleClose={handleCloseForm}
          handleConfirm={handleSubmit(handleSaveTask)}
          confirmLabel="Salvar"
          cancelLabel="Cancelar"
          loading={formLoading}
          setMaxWidth="600px"
        >
          <FormContainer>
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Controller
              name="title"
              control={control}
              rules={{ required: 'Título é obrigatório' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Título"
                  placeholder="Ex: Implementar funcionalidade X"
                  fullWidth
                  required
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descrição"
                  placeholder="Descreva a tarefa..."
                  fullWidth
                  multiline
                  rows={3}
                />
              )}
            />

            <Stack direction="row" spacing={2}>
              <Controller
                name="teamId"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    options={teams}
                    getOptionLabel={(option) => option.name}
                    value={teams.find((t) => t.id === value) || null}
                    onChange={(_, newValue) => onChange(newValue?.id || null)}
                    fullWidth
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Equipe"
                        placeholder="Selecione uma equipe..."
                      />
                    )}
                  />
                )}
              />

              <Controller
                name="sprintId"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    options={sprints}
                    getOptionLabel={(option) => option.name}
                    value={sprints.find((s) => s.id === value) || null}
                    onChange={(_, newValue) => onChange(newValue?.id || null)}
                    fullWidth
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Sprint"
                        placeholder="Selecione uma sprint..."
                      />
                    )}
                  />
                )}
              />
            </Stack>

            {/* Estimation Section */}
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Estimativa (opcional)
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Controller
                  name="estimationType"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      value={field.value}
                      exclusive
                      onChange={(_, newValue) => field.onChange(newValue)}
                      size="small"
                    >
                      <ToggleButton value="points">
                        <SpeedIcon sx={{ mr: 0.5 }} fontSize="small" />
                        Pontos
                      </ToggleButton>
                      <ToggleButton value="hours">
                        <TimerIcon sx={{ mr: 0.5 }} fontSize="small" />
                        Horas
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />

                {watchedEstimationType === 'points' && (
                  <Controller
                    name="estimationPoints"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Pontos"
                        size="small"
                        sx={{ width: 120 }}
                        slotProps={{
                          htmlInput: { min: 0 },
                        }}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                      />
                    )}
                  />
                )}

                {watchedEstimationType === 'hours' && (
                  <Controller
                    name="estimationHours"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Horas"
                        size="small"
                        sx={{ width: 120 }}
                        slotProps={{
                          htmlInput: { min: 0, step: 0.5 },
                        }}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                      />
                    )}
                  />
                )}
              </Stack>
            </Box>

            {/* Period Section - Optional */}
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Período Fixo (opcional - use se não estiver em uma Sprint)
              </Typography>
              <Stack direction="row" spacing={2}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Data Início"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          error: !!errors.startDate,
                          helperText: errors.startDate?.message,
                        },
                      }}
                    />
                  )}
                />

                <Controller
                  name="endDate"
                  control={control}
                  rules={{
                    validate: (value, formValues) => {
                      if (
                        value &&
                        formValues.startDate &&
                        value < formValues.startDate
                      ) {
                        return 'Data fim deve ser posterior ou igual à data início';
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <DatePicker
                      label="Data Fim"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          error: !!errors.endDate,
                          helperText: errors.endDate?.message,
                        },
                      }}
                    />
                  )}
                />
              </Stack>
            </Box>

            <Controller
              name="status"
              control={control}
              rules={{ required: 'Status é obrigatório' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Status"
                  fullWidth
                  required
                  error={!!errors.status}
                  helperText={errors.status?.message}
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {selectedTask?.origin === 'azure_devops' && (
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CloudIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    Esta tarefa foi importada do Azure DevOps
                    {selectedTask.externalId &&
                      ` (ID: ${selectedTask.externalId})`}
                  </Typography>
                </Stack>
              </Box>
            )}
          </FormContainer>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          variant="danger"
          open={isDeleteModalOpen}
          title="Excluir Tarefa"
          handleClose={handleCloseDeleteModal}
          handleConfirm={handleConfirmDelete}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          loading={deleteLoading}
        >
          <Typography>
            Tem certeza que deseja excluir a tarefa{' '}
            <strong>{taskToDelete?.title}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita. Se houver alocações vinculadas a
            esta tarefa, a exclusão será bloqueada.
          </Typography>
          {deleteError && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {deleteError}
            </Typography>
          )}
        </Modal>
      </PageContainer>
    </LocalizationProvider>
  );
}

export default TasksPage;
