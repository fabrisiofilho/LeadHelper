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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import {
  Add as AddIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTeams } from '@renderer/hooks/useTeams';
import {
  PageContainer,
  PlaceholderContent,
  FiltersContainer,
  FormContainer,
} from './styles';
import type {
  Sprint,
  CreateSprintInput,
  UpdateSprintInput,
} from '@shared/interfaces/config/index.types';

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

const getSprintStatus = (
  sprint: Sprint,
): { label: string; color: 'success' | 'primary' | 'default' } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(sprint.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate);
  end.setHours(0, 0, 0, 0);

  if (today >= start && today <= end) {
    return { label: 'Em Andamento', color: 'success' };
  } else if (today < start) {
    return { label: 'Futura', color: 'primary' };
  } else {
    return { label: 'Finalizada', color: 'default' };
  }
};

interface SprintFormData {
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  teamId: number | '';
}

export function SprintsPage() {
  const {
    sprints,
    loading,
    error,
    findAll,
    create,
    update,
    delete: deleteSprint,
    clearError,
  } = useSprints();

  const { teams, findAll: findAllTeams } = useTeams();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<number | ''>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SprintFormData>({
    defaultValues: {
      name: '',
      description: '',
      startDate: null,
      endDate: null,
      teamId: '',
    },
  });

  const startDateValue = watch('startDate');

  const loadData = useCallback(async () => {
    await Promise.all([findAll(), findAllTeams()]);
  }, [findAll, findAllTeams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSprints = sprints.filter((sprint) => {
    if (teamFilter && sprint.teamId !== teamFilter) return false;
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      sprint.name.toLowerCase().includes(search) ||
      (sprint.description?.toLowerCase().includes(search) ?? false)
    );
  });

  const handleNewSprint = () => {
    setSelectedSprint(null);
    reset({
      name: '',
      description: '',
      startDate: null,
      endDate: null,
      teamId: '',
    });
    setIsFormOpen(true);
  };

  const handleEditSprint = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    reset({
      name: sprint.name,
      description: sprint.description ?? '',
      startDate: new Date(sprint.startDate),
      endDate: new Date(sprint.endDate),
      teamId: sprint.teamId ?? '',
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedSprint(null);
    reset();
    clearError();
  };

  const handleSaveSprint = async (data: SprintFormData) => {
    if (!data.startDate || !data.endDate) return;

    setFormLoading(true);
    try {
      if (selectedSprint) {
        const updateData: UpdateSprintInput = {
          name: data.name,
          description: data.description || undefined,
          startDate: data.startDate,
          endDate: data.endDate,
          teamId: data.teamId || undefined,
        };
        const result = await update(selectedSprint.id, updateData);
        if (result) handleCloseForm();
      } else {
        const createData: CreateSprintInput = {
          name: data.name,
          description: data.description || undefined,
          startDate: data.startDate,
          endDate: data.endDate,
          teamId: data.teamId || undefined,
        };
        const result = await create(createData);
        if (result) handleCloseForm();
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (sprint: Sprint) => {
    setSprintToDelete(sprint);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sprintToDelete) return;
    setDeleteLoading(true);
    try {
      const success = await deleteSprint(sprintToDelete.id);
      if (success) {
        setIsDeleteModalOpen(false);
        setSprintToDelete(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const paginatedSprints = filteredSprints.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  if (loading && sprints.length === 0) {
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

  if (error && sprints.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <IconButton onClick={loadData} sx={{ mt: 2 }}>
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
              Sprints
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie as sprints e períodos de trabalho
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Atualizar">
              <IconButton onClick={loadData} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewSprint}
              sx={{ borderRadius: '0.5rem' }}
            >
              Nova Sprint
            </Button>
          </Stack>
        </Stack>

        <FiltersContainer>
          <TextField
            size="small"
            placeholder="Buscar por nome..."
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
            label="Equipe"
            value={teamFilter}
            onChange={(e) => {
              setTeamFilter(e.target.value as number | '');
              setPage(0);
            }}
            sx={{ minWidth: 180 }}
            slotProps={{
              select: {
                displayEmpty: true,
              },
              inputLabel: { shrink: true },
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            {teams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {team.name}
              </MenuItem>
            ))}
          </TextField>
        </FiltersContainer>

        {filteredSprints.length > 0 ? (
          <Paper
            sx={{ width: '100%', overflow: 'hidden', borderRadius: '1rem' }}
          >
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell>Equipe</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSprints.map((sprint) => {
                    const status = getSprintStatus(sprint);
                    return (
                      <TableRow key={sprint.id} hover>
                        <TableCell>
                          <Typography fontWeight={500}>
                            {sprint.name}
                          </Typography>
                          {sprint.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{ maxWidth: 200 }}
                            >
                              {sprint.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(sprint.startDate)} -{' '}
                            {formatDate(sprint.endDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {sprint.team ? (
                            <Chip
                              label={sprint.team.name}
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
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => handleEditSprint(sprint)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(sprint)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredSprints.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </Paper>
        ) : (
          <PlaceholderContent>
            <SpeedIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm || teamFilter
                ? 'Nenhuma sprint encontrada'
                : 'Nenhuma sprint cadastrada'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchTerm || teamFilter
                ? 'Tente ajustar os filtros de busca'
                : 'Clique em "Nova Sprint" para adicionar a primeira sprint'}
            </Typography>
            {!searchTerm && !teamFilter && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNewSprint}
              >
                Nova Sprint
              </Button>
            )}
          </PlaceholderContent>
        )}

        <Modal
          variant="form"
          open={isFormOpen}
          title={selectedSprint ? 'Editar Sprint' : 'Nova Sprint'}
          handleClose={handleCloseForm}
          handleConfirm={handleSubmit(handleSaveSprint)}
          confirmLabel="Salvar"
          cancelLabel="Cancelar"
          loading={formLoading}
          setMaxWidth="500px"
        >
          <FormContainer>
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Nome é obrigatório' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nome"
                  placeholder="Ex: Sprint 1"
                  fullWidth
                  required
                  error={!!errors.name}
                  helperText={errors.name?.message}
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
                  placeholder="Descreva a sprint..."
                  fullWidth
                  multiline
                  rows={2}
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
                  validate: (value) => {
                    if (value && startDateValue && value < startDateValue) {
                      return 'Data fim deve ser posterior à data início';
                    }
                    return true;
                  },
                }}
                render={({ field }) => (
                  <DatePicker
                    label="Data Fim"
                    value={field.value}
                    onChange={field.onChange}
                    minDate={startDateValue || undefined}
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
            <Controller
              name="teamId"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Equipe" fullWidth>
                  <MenuItem value="">Nenhuma</MenuItem>
                  {teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </FormContainer>
        </Modal>

        <Modal
          variant="danger"
          open={isDeleteModalOpen}
          title="Excluir Sprint"
          handleClose={() => {
            setIsDeleteModalOpen(false);
            setSprintToDelete(null);
          }}
          handleConfirm={handleConfirmDelete}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          loading={deleteLoading}
        >
          <Typography>
            Tem certeza que deseja excluir a sprint{' '}
            <strong>{sprintToDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita. Tarefas vinculadas perderão a
            referência à sprint.
          </Typography>
        </Modal>
      </PageContainer>
    </LocalizationProvider>
  );
}

export default SprintsPage;
