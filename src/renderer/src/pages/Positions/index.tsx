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
  Chip,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Work as WorkIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ToggleOff as ToggleOffIcon,
  ToggleOn as ToggleOnIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { usePositions } from '@renderer/hooks/usePositions';
import { useTableSort } from '@renderer/hooks/useTableSort';
import {
  StandardTable,
  type StandardColumn,
} from '@renderer/components/StandardTable';
import {
  PageContainer,
  PlaceholderContent,
  FiltersContainer,
  FormContainer,
} from './styles';
import type {
  Position,
  CreatePositionInput,
  UpdatePositionInput,
} from '@shared/interfaces/config/index.types';

interface PositionFormData {
  name: string;
  description: string;
}

const AVAILABLE_STATUSES = [
  'Novo',
  'Em classificação',
  'Backlog Comprometido',
  'Em levantamento',
  'Preparando para Dev',
  'Aguardando desenvolvimento',
  'Aguardando validação',
  'Em validação',
  'Em desenvolvimento',
  'Em andamento',
  'Aguardando auditoria',
  'Em auditoria',
  'Aguardando homologação',
  'Em homologação',
  'Aguardando implantação',
  'Em implantação',
  'Finalizado',
  'Cancelado',
];

const POSITION_COLUMNS: StandardColumn[] = [
  { id: 'name', label: 'Nome' },
  { id: 'description', label: 'Descrição' },
  { id: 'allowedStatuses', label: 'Status Permitidos' },
  { id: 'isActive', label: 'Status' },
  { id: 'actions', label: 'Ações', noSort: true, align: 'right' },
];

export function PositionsPage() {
  const {
    positions,
    loading,
    error,
    findAll,
    create,
    update,
    delete: deletePosition,
    activate,
    deactivate,
    clearError,
  } = usePositions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null,
  );
  const [formLoading, setFormLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(
    null,
  );
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [positionToToggle, setPositionToToggle] = useState<Position | null>(
    null,
  );
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PositionFormData>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const loadPositions = useCallback(async () => {
    await findAll();
  }, [findAll]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const filteredPositionsRaw = positions.filter((position) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      position.name.toLowerCase().includes(search) ||
      (position.description?.toLowerCase().includes(search) ?? false)
    );
  });

  const {
    sortedItems: filteredPositions,
    sortConfig,
    handleSort,
  } = useTableSort(filteredPositionsRaw, {
    property: 'name',
    direction: 'asc',
  });

  const handleNewPosition = () => {
    setSelectedPosition(null);
    reset({ name: '', description: '' });
    setSelectedStatuses([]);
    setIsFormOpen(true);
  };

  const handleEditPosition = (position: Position) => {
    setSelectedPosition(position);
    reset({
      name: position.name,
      description: position.description ?? '',
    });
    setSelectedStatuses(
      position.allowedStatuses
        ? position.allowedStatuses
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    );
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedPosition(null);
    setSelectedStatuses([]);
    reset();
    clearError();
  };

  const handleSavePosition = async (data: PositionFormData) => {
    setFormLoading(true);
    const allowedStatuses =
      selectedStatuses.length > 0 ? selectedStatuses.join(',') : undefined;
    try {
      if (selectedPosition) {
        const updateData: UpdatePositionInput = {
          name: data.name,
          description: data.description || undefined,
          allowedStatuses,
        };
        const result = await update(selectedPosition.id, updateData);
        if (result) handleCloseForm();
      } else {
        const createData: CreatePositionInput = {
          name: data.name,
          description: data.description || undefined,
          allowedStatuses,
        };
        const result = await create(createData);
        if (result) handleCloseForm();
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (position: Position) => {
    setPositionToDelete(position);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!positionToDelete) return;
    setDeleteLoading(true);
    try {
      const success = await deletePosition(positionToDelete.id);
      if (success) {
        setIsDeleteModalOpen(false);
        setPositionToDelete(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = (position: Position) => {
    setPositionToToggle(position);
    setIsStatusModalOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!positionToToggle) return;
    setStatusLoading(true);
    try {
      if (positionToToggle.isActive) {
        await deactivate(positionToToggle.id);
      } else {
        await activate(positionToToggle.id);
      }
      setIsStatusModalOpen(false);
      setPositionToToggle(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const paginatedPositions = filteredPositions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  if (loading && positions.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando cargos...
          </Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (error && positions.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <IconButton onClick={loadPositions} sx={{ mt: 2 }}>
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
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Cargos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie os cargos disponíveis para os membros da equipe
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Atualizar">
            <IconButton onClick={loadPositions} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewPosition}
            sx={{ borderRadius: '0.5rem' }}
          >
            Novo Cargo
          </Button>
        </Stack>
      </Stack>

      <FiltersContainer>
        <TextField
          size="small"
          placeholder="Buscar por nome ou descrição..."
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
          sx={{ minWidth: 300 }}
        />
      </FiltersContainer>

      {filteredPositions.length > 0 ? (
        <StandardTable
          columns={POSITION_COLUMNS}
          rows={paginatedPositions.map((position) => ({
            id: position.id,
            cells: {
              name: <Typography fontWeight={500}>{position.name}</Typography>,
              description: (
                <Typography variant="body2" color="text.secondary">
                  {position.description || '-'}
                </Typography>
              ),
              allowedStatuses: position.allowedStatuses ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {position.allowedStatuses
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((status) => (
                      <Chip
                        key={status}
                        label={status}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  —
                </Typography>
              ),
              isActive: (
                <Chip
                  label={position.isActive ? 'Ativo' : 'Inativo'}
                  color={position.isActive ? 'success' : 'default'}
                  size="small"
                  variant={position.isActive ? 'filled' : 'outlined'}
                />
              ),
              actions: (
                <>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => handleEditPosition(position)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={position.isActive ? 'Desativar' : 'Ativar'}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleStatus(position)}
                      color={position.isActive ? 'warning' : 'success'}
                    >
                      {position.isActive ? (
                        <ToggleOffIcon fontSize="small" />
                      ) : (
                        <ToggleOnIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(position)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ),
            },
          }))}
          sortConfig={sortConfig}
          onSort={handleSort}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={filteredPositions.length}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          emptyIcon={
            <WorkIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          }
          emptyTitle={
            searchTerm ? 'Nenhum cargo encontrado' : 'Nenhum cargo cadastrado'
          }
          emptyDescription={
            searchTerm
              ? 'Tente ajustar os filtros de busca'
              : 'Clique em "Novo Cargo" para adicionar o primeiro cargo'
          }
        />
      ) : (
        <PlaceholderContent>
          <WorkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'Nenhum cargo encontrado' : 'Nenhum cargo cadastrado'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchTerm
              ? 'Tente ajustar os filtros de busca'
              : 'Clique em "Novo Cargo" para adicionar o primeiro cargo'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewPosition}
            >
              Novo Cargo
            </Button>
          )}
        </PlaceholderContent>
      )}

      <Modal
        variant="form"
        open={isFormOpen}
        title={selectedPosition ? 'Editar Cargo' : 'Novo Cargo'}
        handleClose={handleCloseForm}
        handleConfirm={handleSubmit(handleSavePosition)}
        confirmLabel="Salvar"
        cancelLabel="Cancelar"
        loading={formLoading}
        setMaxWidth="450px"
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
                placeholder="Ex: Desenvolvedor Senior"
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
                placeholder="Descreva o cargo..."
                fullWidth
                multiline
                rows={3}
              />
            )}
          />
          <Autocomplete
            multiple
            options={AVAILABLE_STATUSES}
            value={selectedStatuses}
            onChange={(_e, val) => setSelectedStatuses(val)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={option}
                  size="small"
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Status Permitidos"
                placeholder="Selecione os status válidos para este cargo"
                helperText="Status em que é esperado que este cargo tenha demandas atribuídas"
              />
            )}
          />
        </FormContainer>
      </Modal>

      <Modal
        variant="danger"
        open={isDeleteModalOpen}
        title="Excluir Cargo"
        handleClose={() => {
          setIsDeleteModalOpen(false);
          setPositionToDelete(null);
        }}
        handleConfirm={handleConfirmDelete}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={deleteLoading}
      >
        <Typography>
          Tem certeza que deseja excluir o cargo{' '}
          <strong>{positionToDelete?.name}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Esta ação não pode ser desfeita.
        </Typography>
      </Modal>

      <Modal
        variant="danger"
        open={isStatusModalOpen}
        title={positionToToggle?.isActive ? 'Desativar Cargo' : 'Ativar Cargo'}
        handleClose={() => {
          setIsStatusModalOpen(false);
          setPositionToToggle(null);
        }}
        handleConfirm={handleConfirmToggleStatus}
        confirmLabel={positionToToggle?.isActive ? 'Desativar' : 'Ativar'}
        cancelLabel="Cancelar"
        loading={statusLoading}
      >
        <Typography>
          Tem certeza que deseja{' '}
          {positionToToggle?.isActive ? 'desativar' : 'ativar'} o cargo{' '}
          <strong>{positionToToggle?.name}</strong>?
        </Typography>
        {positionToToggle?.isActive && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            O cargo será marcado como inativo, mas os membros associados serão
            preservados.
          </Typography>
        )}
      </Modal>
    </PageContainer>
  );
}

export default PositionsPage;
