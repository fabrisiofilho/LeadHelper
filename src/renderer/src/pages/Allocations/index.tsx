import { useEffect, useState, useCallback, useMemo } from 'react';
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
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import {
  Add as AddIcon,
  EventNote as AllocationIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Assignment as TaskIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { useAllocations } from '@renderer/hooks/useAllocations';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useTasks } from '@renderer/hooks/useTasks';
import {
  PageContainer,
  PlaceholderContent,
  FiltersContainer,
  FormContainer,
} from './styles';
import type {
  Allocation,
  CreateAllocationInput,
  UpdateAllocationInput,
} from '@shared/interfaces/allocation.interface';
import type { TeamMember } from '@shared/interfaces/team-member.interface';
import type { Task } from '@shared/interfaces/task.interface';

/**
 * Allocations management page
 * Allows CRUD operations for team member allocations to tasks
 */

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

interface AllocationFormData {
  teamMemberId: number | null;
  taskId: number | null;
  startDate: Date | null;
  endDate: Date | null;
}

interface AllocationWithDetails extends Allocation {
  teamMemberName?: string;
  taskTitle?: string;
}

export function AllocationsPage() {
  const {
    loading: allocationsLoading,
    error: allocationsError,
    findByPeriod,
    create,
    update,
    delete: deleteAllocation,
    clearError: clearAllocationsError,
  } = useAllocations();

  const {
    teamMembers,
    loading: membersLoading,
    findAll: findAllMembers,
  } = useTeamMembers();

  const { tasks, loading: tasksLoading, findAll: findAllTasks } = useTasks();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] =
    useState<Allocation | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] =
    useState<Allocation | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [allAllocations, setAllAllocations] = useState<Allocation[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Filters
  const [memberFilter, setMemberFilter] = useState<number | ''>('');
  const [taskFilter, setTaskFilter] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AllocationFormData>({
    defaultValues: {
      teamMemberId: null,
      taskId: null,
      startDate: null,
      endDate: null,
    },
  });

  // Load all data on mount
  const loadInitialData = useCallback(async () => {
    setLoadingAll(true);
    await Promise.all([findAllMembers({ isActive: true }), findAllTasks()]);
    // Load all allocations by fetching a wide period
    const startDate = new Date('2020-01-01');
    const endDate = new Date('2030-12-31');
    const allAllocs = await findByPeriod(startDate, endDate);
    setAllAllocations(allAllocs);
    setLoadingAll(false);
  }, [findAllMembers, findAllTasks, findByPeriod]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Create lookup maps for team members and tasks
  const memberMap = useMemo(() => {
    const map = new Map<number, TeamMember>();
    teamMembers.forEach((m) => map.set(m.id, m));
    return map;
  }, [teamMembers]);

  const taskMap = useMemo(() => {
    const map = new Map<number, Task>();
    tasks.forEach((t) => map.set(t.id, t));
    return map;
  }, [tasks]);

  // Enrich allocations with member and task names
  const enrichedAllocations: AllocationWithDetails[] = useMemo(() => {
    return allAllocations.map((allocation) => ({
      ...allocation,
      teamMemberName:
        memberMap.get(allocation.teamMemberId)?.name ??
        `Membro #${allocation.teamMemberId}`,
      taskTitle:
        taskMap.get(allocation.taskId)?.title ?? `Tarefa #${allocation.taskId}`,
    }));
  }, [allAllocations, memberMap, taskMap]);

  // Filter allocations
  const filteredAllocations = useMemo(() => {
    return enrichedAllocations.filter((allocation) => {
      // Filter by member
      if (memberFilter && allocation.teamMemberId !== memberFilter) {
        return false;
      }

      // Filter by task
      if (taskFilter && allocation.taskId !== taskFilter) {
        return false;
      }

      // Filter by search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesMember = allocation.teamMemberName
          ?.toLowerCase()
          .includes(search);
        const matchesTask = allocation.taskTitle
          ?.toLowerCase()
          .includes(search);
        if (!matchesMember && !matchesTask) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedAllocations, memberFilter, taskFilter, searchTerm]);

  const handleRefresh = async () => {
    await loadInitialData();
  };

  const handleNewAllocation = () => {
    setSelectedAllocation(null);
    const today = new Date();
    reset({
      teamMemberId: null,
      taskId: null,
      startDate: today,
      endDate: today,
    });
    setIsFormOpen(true);
  };

  const handleEditAllocation = (allocation: Allocation) => {
    setSelectedAllocation(allocation);
    reset({
      teamMemberId: allocation.teamMemberId,
      taskId: allocation.taskId,
      startDate: new Date(allocation.startDate),
      endDate: new Date(allocation.endDate),
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedAllocation(null);
    reset();
    clearAllocationsError();
  };

  const handleSaveAllocation = async (data: AllocationFormData) => {
    if (
      !data.teamMemberId ||
      !data.taskId ||
      !data.startDate ||
      !data.endDate
    ) {
      return;
    }

    setFormLoading(true);
    try {
      if (selectedAllocation) {
        const updateData: UpdateAllocationInput = {
          startDate: data.startDate,
          endDate: data.endDate,
        };
        const result = await update(selectedAllocation.id, updateData);
        if (result) {
          // Update local state
          setAllAllocations((prev) =>
            prev.map((a) => (a.id === selectedAllocation.id ? result : a)),
          );
          handleCloseForm();
        }
      } else {
        const createData: CreateAllocationInput = {
          teamMemberId: data.teamMemberId,
          taskId: data.taskId,
          startDate: data.startDate,
          endDate: data.endDate,
        };
        const result = await create(createData);
        if (result) {
          setAllAllocations((prev) => [...prev, result]);
          handleCloseForm();
        }
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (allocation: Allocation) => {
    setAllocationToDelete(allocation);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!allocationToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const success = await deleteAllocation(allocationToDelete.id);
      if (success) {
        setAllAllocations((prev) =>
          prev.filter((a) => a.id !== allocationToDelete.id),
        );
        setIsDeleteModalOpen(false);
        setAllocationToDelete(null);
      } else {
        setDeleteError(
          allocationsError || 'Não foi possível excluir a alocação.',
        );
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setAllocationToDelete(null);
    setDeleteError(null);
    clearAllocationsError();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMemberFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    setMemberFilter(value === '' ? '' : Number(value));
    setPage(0);
  };

  const handleTaskFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    setTaskFilter(value === '' ? '' : Number(value));
    setPage(0);
  };

  const paginatedAllocations = filteredAllocations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const loading =
    allocationsLoading || membersLoading || tasksLoading || loadingAll;

  if (loading && allAllocations.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando alocações...
          </Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (allocationsError && allAllocations.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {allocationsError}
          </Typography>
          <IconButton onClick={handleRefresh} sx={{ mt: 2 }}>
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
              Alocações
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie as alocações de membros em tarefas
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Atualizar">
              <IconButton onClick={handleRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewAllocation}
              sx={{ borderRadius: '0.5rem' }}
            >
              Nova Alocação
            </Button>
          </Stack>
        </Stack>

        {/* Filters */}
        <FiltersContainer>
          <TextField
            size="small"
            placeholder="Buscar por membro ou tarefa..."
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
            label="Membro"
            value={memberFilter}
            onChange={handleMemberFilterChange}
            sx={{ minWidth: 180 }}
            slotProps={{
              select: {
                displayEmpty: true,
              },
              inputLabel: { shrink: true },
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            {teamMembers.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                {member.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Tarefa"
            value={taskFilter}
            onChange={handleTaskFilterChange}
            sx={{ minWidth: 180 }}
            slotProps={{
              select: {
                displayEmpty: true,
              },
              inputLabel: { shrink: true },
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            {tasks.map((task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.title}
              </MenuItem>
            ))}
          </TextField>
        </FiltersContainer>

        {filteredAllocations.length > 0 ? (
          <Paper
            sx={{ width: '100%', overflow: 'hidden', borderRadius: '1rem' }}
          >
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Membro</TableCell>
                    <TableCell>Tarefa</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAllocations.map((allocation) => (
                    <TableRow key={allocation.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonIcon fontSize="small" color="action" />
                          <Typography fontWeight={500}>
                            {allocation.teamMemberName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TaskIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {allocation.taskTitle}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(allocation.startDate)} -{' '}
                          {formatDate(allocation.endDate)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleEditAllocation(allocation)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(allocation)}
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
              count={filteredAllocations.length}
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
            <AllocationIcon
              sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm || memberFilter || taskFilter
                ? 'Nenhuma alocação encontrada com os filtros aplicados'
                : 'Nenhuma alocação cadastrada'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchTerm || memberFilter || taskFilter
                ? 'Tente ajustar os filtros de busca'
                : 'Clique em "Nova Alocação" para alocar um membro em uma tarefa'}
            </Typography>
            {!searchTerm && !memberFilter && !taskFilter && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNewAllocation}
              >
                Nova Alocação
              </Button>
            )}
          </PlaceholderContent>
        )}

        {/* Form Modal */}
        <Modal
          variant="form"
          open={isFormOpen}
          title={selectedAllocation ? 'Editar Alocação' : 'Nova Alocação'}
          handleClose={handleCloseForm}
          handleConfirm={handleSubmit(handleSaveAllocation)}
          confirmLabel="Salvar"
          cancelLabel="Cancelar"
          loading={formLoading}
          setMaxWidth="500px"
        >
          <FormContainer>
            {allocationsError && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {allocationsError}
              </Typography>
            )}

            <Controller
              name="teamMemberId"
              control={control}
              rules={{ required: 'Membro é obrigatório' }}
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  options={teamMembers}
                  getOptionLabel={(option) => option.name}
                  value={teamMembers.find((m) => m.id === value) || null}
                  onChange={(_, newValue) => onChange(newValue?.id || null)}
                  disabled={!!selectedAllocation}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Membro da Equipe"
                      placeholder="Selecione um membro..."
                      required
                      error={!!errors.teamMemberId}
                      helperText={errors.teamMemberId?.message}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2">{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </li>
                  )}
                />
              )}
            />

            <Controller
              name="taskId"
              control={control}
              rules={{ required: 'Tarefa é obrigatória' }}
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  options={tasks}
                  getOptionLabel={(option) => option.title}
                  value={tasks.find((t) => t.id === value) || null}
                  onChange={(_, newValue) => onChange(newValue?.id || null)}
                  disabled={!!selectedAllocation}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tarefa"
                      placeholder="Selecione uma tarefa..."
                      required
                      error={!!errors.taskId}
                      helperText={errors.taskId?.message}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TaskIcon fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2">
                            {option.title}
                          </Typography>
                          {option.sprint && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Sprint: {option.sprint.name}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </li>
                  )}
                />
              )}
            />

            <Stack direction="row" spacing={2}>
              <Controller
                name="startDate"
                control={control}
                rules={{ required: 'Data início é obrigatória' }}
                render={({ field }) => (
                  <DatePicker
                    label="Data Início"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
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
                  required: 'Data fim é obrigatória',
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
                        required: true,
                        error: !!errors.endDate,
                        helperText: errors.endDate?.message,
                      },
                    }}
                  />
                )}
              />
            </Stack>
          </FormContainer>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          variant="danger"
          open={isDeleteModalOpen}
          title="Excluir Alocação"
          handleClose={handleCloseDeleteModal}
          handleConfirm={handleConfirmDelete}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          loading={deleteLoading}
        >
          <Typography>Tem certeza que deseja excluir esta alocação?</Typography>
          {allocationToDelete && (
            <Box
              sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}
            >
              <Typography variant="body2">
                <strong>Membro:</strong>{' '}
                {memberMap.get(allocationToDelete.teamMemberId)?.name ??
                  `#${allocationToDelete.teamMemberId}`}
              </Typography>
              <Typography variant="body2">
                <strong>Tarefa:</strong>{' '}
                {taskMap.get(allocationToDelete.taskId)?.title ??
                  `#${allocationToDelete.taskId}`}
              </Typography>
              <Typography variant="body2">
                <strong>Período:</strong>{' '}
                {formatDate(allocationToDelete.startDate)} -{' '}
                {formatDate(allocationToDelete.endDate)}
              </Typography>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita.
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

export default AllocationsPage;
