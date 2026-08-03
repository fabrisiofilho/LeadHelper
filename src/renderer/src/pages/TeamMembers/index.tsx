import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Stack,
  TextField,
  MenuItem,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  ToggleOff as ToggleOffIcon,
  ToggleOn as ToggleOnIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { DebouncedSearchInput } from '@renderer/components/DebouncedSearchInput';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { usePositions } from '@renderer/hooks/usePositions';
import { useTableSort } from '@renderer/hooks/useTableSort';
import { useSyncRefresh } from '@renderer/hooks/useSyncRefresh';
import {
  StandardTable,
  type StandardColumn,
} from '@renderer/components/StandardTable';
import { ImportPositionsModal } from '@renderer/components/ImportPositionsModal';
import {
  PageContainer,
  PlaceholderContent,
  FiltersContainer,
  FormContainer,
} from './styles';
import type {
  TeamMember,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  TeamMemberFilters,
} from '@shared/interfaces/team-member.interface';

/**
 * Team Members management page
 * Allows CRUD operations for team members (developers, analysts, QA, etc.)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.7
 */

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
];

interface TeamMemberFormData {
  name: string;
  email: string;
  positionId?: number;
}

const MEMBER_COLUMNS: StandardColumn[] = [
  { id: 'name', label: 'Nome' },
  { id: 'email', label: 'Email' },
  { id: 'position', label: 'Cargo' },
  { id: 'isActive', label: 'Status' },
  { id: 'actions', label: 'Ações', noSort: true, align: 'right' },
];

export function TeamMembersPage() {
  const {
    teamMembers,
    loading,
    error,
    findAll,
    create,
    update,
    activate,
    deactivate,
    clearError,
  } = useTeamMembers();

  const {
    positions,
    loading: positionsLoading,
    findAll: findAllPositions,
  } = usePositions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [memberToToggle, setMemberToToggle] = useState<TeamMember | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Filters
  const [positionFilter, setPositionFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamMemberFormData>({
    defaultValues: {
      name: '',
      email: '',
      positionId: undefined,
    },
  });

  // Load positions on mount
  useEffect(() => {
    findAllPositions({ isActive: true });
  }, [findAllPositions]);

  const loadTeamMembers = useCallback(async () => {
    const filters: TeamMemberFilters = {};

    if (positionFilter) {
      filters.positionId = positionFilter;
    }

    if (statusFilter !== 'all') {
      filters.isActive = statusFilter === 'active';
    }

    await findAll(filters);
  }, [findAll, positionFilter, statusFilter]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  // Refresh data automatically when sync completes
  useSyncRefresh(loadTeamMembers);

  // Filter members by search term (client-side)
  const filteredMembersRaw = teamMembers.filter((member) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search) ||
      member.position?.name.toLowerCase().includes(search)
    );
  });

  // useTableSort handles column-header sorting; no defaultSort so the hook
  // returns items in the same order they come in when the user hasn't clicked anything.
  const {
    sortedItems: hookSorted,
    sortConfig,
    handleSort,
  } = useTableSort(filteredMembersRaw);

  // Always apply the fixed tiebreaker: active members first.
  // When the user has sorted by a column, that sort is the PRIMARY key;
  // isActive is the SECONDARY key (tiebreaker) so equal values still group
  // actives before inactives.
  // When no column sort is active, fall back to name A→Z as secondary.
  const filteredMembers = useMemo(() => {
    return [...hookSorted].sort((a, b) => {
      // If a column sort is active, it already ordered them — only apply
      // the isActive tiebreaker for records that are equal on the primary key.
      if (sortConfig) {
        // The hook already put them in primary-key order; we only need to
        // break ties within groups that have the same primary value.
        // Re-apply the primary-key comparison to detect true ties:
        const getPrimary = (obj: typeof a) => {
          const val = (obj as Record<string, unknown>)[sortConfig.property];
          return val == null ? '' : String(val).toLowerCase();
        };
        const diff = getPrimary(a).localeCompare(getPrimary(b));
        if (diff !== 0) return 0; // not a tie — keep hook's order (return 0 = no swap)
        // True tie: active first
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return 0;
      }
      // No column sort active: active first, then name A→Z
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });
  }, [hookSorted, sortConfig]);

  const handleNewMember = () => {
    setSelectedMember(null);
    reset({
      name: '',
      email: '',
      positionId: undefined,
    });
    setIsFormOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    reset({
      name: member.name,
      email: member.email,
      positionId: member.positionId,
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedMember(null);
    reset();
    clearError();
  };

  const handleSaveMember = async (data: TeamMemberFormData) => {
    setFormLoading(true);
    try {
      if (selectedMember) {
        const updateData: UpdateTeamMemberInput = {
          name: data.name,
          email: data.email,
          positionId: data.positionId || undefined,
        };
        const result = await update(selectedMember.id, updateData);
        if (result) {
          handleCloseForm();
        }
      } else {
        const createData: CreateTeamMemberInput = {
          name: data.name,
          email: data.email,
          role: 'developer', // Default role required by backend
          positionId: data.positionId || undefined,
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

  const handleToggleStatus = (member: TeamMember) => {
    setMemberToToggle(member);
    setIsStatusModalOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!memberToToggle) return;
    setStatusLoading(true);
    try {
      if (memberToToggle.isActive) {
        await deactivate(memberToToggle.id);
      } else {
        await activate(memberToToggle.id);
      }
      setIsStatusModalOpen(false);
      setMemberToToggle(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePositionFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    setPositionFilter(value === '' ? '' : Number(value));
    setPage(0);
  };

  const handleStatusFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setStatusFilter(event.target.value as 'all' | 'active' | 'inactive');
    setPage(0);
  };

  const paginatedMembers = filteredMembers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  if (loading && teamMembers.length === 0) {
    return (
      <PageContainer>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Stack spacing={0.5}>
            <Skeleton
              variant="text"
              width={200}
              height={40}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="text"
              width={240}
              height={22}
              sx={{ borderRadius: 1 }}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Skeleton
              variant="rounded"
              width={150}
              height={36}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="rounded"
              width={130}
              height={36}
              sx={{ borderRadius: 1 }}
            />
          </Stack>
        </Stack>
        <Stack direction="row" spacing={2} mb={2}>
          <Skeleton
            variant="rounded"
            width={250}
            height={40}
            sx={{ borderRadius: 1 }}
          />
          <Skeleton
            variant="rounded"
            width={180}
            height={40}
            sx={{ borderRadius: 1 }}
          />
          <Skeleton
            variant="rounded"
            width={120}
            height={40}
            sx={{ borderRadius: 1 }}
          />
        </Stack>
        <Skeleton
          variant="rounded"
          height={48}
          sx={{ borderRadius: '4px 4px 0 0' }}
        />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={52}
            sx={{ borderRadius: 0, mt: '1px' }}
          />
        ))}
      </PageContainer>
    );
  }

  if (error && teamMembers.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <IconButton onClick={loadTeamMembers} sx={{ mt: 2 }}>
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
        mb={2.5}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Membros da Equipe
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie os membros da sua equipe
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Atualizar">
            <IconButton onClick={loadTeamMembers} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setIsImportOpen(true)}
            sx={{ borderRadius: '0.5rem' }}
          >
            Importar Cargos
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewMember}
            sx={{ borderRadius: '0.5rem' }}
          >
            Novo Membro
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <FiltersContainer>
        <DebouncedSearchInput
          placeholder="Buscar por nome, email ou cargo..."
          onSearch={(v) => {
            setSearchTerm(v);
            setPage(0);
          }}
          sx={{ minWidth: 250 }}
        />
        <TextField
          select
          size="small"
          label="Cargo"
          value={positionFilter}
          onChange={handlePositionFilterChange}
          sx={{ minWidth: 180 }}
          slotProps={{
            select: {
              displayEmpty: true,
            },
            inputLabel: { shrink: true },
          }}
        >
          <MenuItem value="">Todos</MenuItem>
          {positions.map((position) => (
            <MenuItem key={position.id} value={position.id}>
              {position.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={handleStatusFilterChange}
          sx={{ minWidth: 120 }}
          slotProps={{
            select: {
              displayEmpty: true,
            },
            inputLabel: { shrink: true },
          }}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </FiltersContainer>

      {filteredMembers.length > 0 ? (
        <StandardTable
          columns={MEMBER_COLUMNS}
          rows={paginatedMembers.map((member) => ({
            id: member.id,
            cells: {
              name: <Typography fontWeight={500}>{member.name}</Typography>,
              email: (
                <Typography variant="body2" color="text.secondary">
                  {member.email}
                </Typography>
              ),
              position: member.position ? (
                <Chip
                  label={member.position.name}
                  color="primary"
                  size="small"
                  variant="outlined"
                />
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontStyle="italic"
                >
                  Sem cargo
                </Typography>
              ),
              isActive: (
                <Chip
                  label={member.isActive ? 'Ativo' : 'Inativo'}
                  color={member.isActive ? 'success' : 'default'}
                  size="small"
                  variant={member.isActive ? 'filled' : 'outlined'}
                />
              ),
              actions: (
                <>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => handleEditMember(member)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={member.isActive ? 'Desativar' : 'Ativar'}>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleStatus(member)}
                      color={member.isActive ? 'warning' : 'success'}
                    >
                      {member.isActive ? (
                        <ToggleOffIcon fontSize="small" />
                      ) : (
                        <ToggleOnIcon fontSize="small" />
                      )}
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
          totalCount={filteredMembers.length}
          onPageChange={setPage}
          onRowsPerPageChange={(rpp) => {
            setRowsPerPage(rpp);
            setPage(0);
          }}
          emptyIcon={
            <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
          }
          emptyTitle={
            searchTerm || positionFilter || statusFilter !== 'all'
              ? 'Nenhum membro encontrado com os filtros aplicados'
              : 'Nenhum membro cadastrado'
          }
          emptyDescription={
            searchTerm || positionFilter || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Clique em "Novo Membro" para adicionar o primeiro membro da equipe'
          }
        />
      ) : (
        <PlaceholderContent>
          <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || positionFilter || statusFilter !== 'all'
              ? 'Nenhum membro encontrado com os filtros aplicados'
              : 'Nenhum membro cadastrado'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchTerm || positionFilter || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Clique em "Novo Membro" para adicionar o primeiro membro da equipe'}
          </Typography>
          {!searchTerm && !positionFilter && statusFilter === 'all' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewMember}
            >
              Novo Membro
            </Button>
          )}
        </PlaceholderContent>
      )}

      {/* Form Modal */}
      <Modal
        variant="form"
        open={isFormOpen}
        title={selectedMember ? 'Editar Membro' : 'Novo Membro'}
        handleClose={handleCloseForm}
        handleConfirm={handleSubmit(handleSaveMember)}
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
                placeholder="Ex: João Silva"
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />

          <Controller
            name="email"
            control={control}
            rules={{
              required: 'Email é obrigatório',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email inválido',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email"
                placeholder="Ex: joao.silva@empresa.com"
                fullWidth
                required
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />

          <Controller
            name="positionId"
            control={control}
            rules={{ required: 'Cargo é obrigatório' }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Cargo"
                fullWidth
                value={field.value || ''}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                disabled={positionsLoading}
                required
                error={!!errors.positionId}
                helperText={
                  errors.positionId?.message || 'Selecione o cargo do membro'
                }
              >
                <MenuItem value="">
                  <em>Selecione um cargo</em>
                </MenuItem>
                {positions.map((position) => (
                  <MenuItem key={position.id} value={position.id}>
                    {position.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </FormContainer>
      </Modal>

      {/* Status Toggle Modal */}
      <Modal
        variant="danger"
        open={isStatusModalOpen}
        title={memberToToggle?.isActive ? 'Desativar Membro' : 'Ativar Membro'}
        handleClose={() => {
          setIsStatusModalOpen(false);
          setMemberToToggle(null);
        }}
        handleConfirm={handleConfirmToggleStatus}
        confirmLabel={memberToToggle?.isActive ? 'Desativar' : 'Ativar'}
        cancelLabel="Cancelar"
        loading={statusLoading}
      >
        <Typography>
          Tem certeza que deseja{' '}
          {memberToToggle?.isActive ? 'desativar' : 'ativar'} o membro{' '}
          <strong>{memberToToggle?.name}</strong>?
        </Typography>
        {memberToToggle?.isActive && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            O membro será marcado como inativo, mas seu histórico de alocações
            será preservado.
          </Typography>
        )}
      </Modal>

      <ImportPositionsModal
        open={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          loadTeamMembers();
        }}
        positions={positions}
        memberEmails={teamMembers.map((m) => m.email).filter(Boolean)}
      />
    </PageContainer>
  );
}

export default TeamMembersPage;
