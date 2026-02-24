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
import {
  Add as AddIcon,
  People as PeopleIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  PersonOff as PersonOffIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import {
  PageContainer,
  PlaceholderContent,
  FiltersContainer,
  FormContainer,
} from './styles';
import type {
  TeamMember,
  TeamMemberRole,
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

const roleOptions: { value: TeamMemberRole; label: string }[] = [
  { value: 'developer', label: 'Desenvolvedor' },
  { value: 'analyst', label: 'Analista' },
  { value: 'qa', label: 'QA' },
  { value: 'tech_lead', label: 'Tech Lead' },
  { value: 'devops', label: 'DevOps' },
  { value: 'designer', label: 'Designer' },
  { value: 'product_owner', label: 'Product Owner' },
];

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
];

const getRoleLabel = (role: TeamMemberRole): string => {
  const option = roleOptions.find((opt) => opt.value === role);
  return option?.label ?? role;
};

const getRoleColor = (
  role: TeamMemberRole,
): 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' => {
  const colorMap: Record<
    TeamMemberRole,
    'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'
  > = {
    developer: 'primary',
    analyst: 'info',
    qa: 'success',
    tech_lead: 'warning',
    devops: 'secondary',
    designer: 'error',
    product_owner: 'warning',
  };
  return colorMap[role] ?? 'primary';
};

interface TeamMemberFormData {
  name: string;
  email: string;
  role: TeamMemberRole;
}

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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [memberToToggle, setMemberToToggle] = useState<TeamMember | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState<TeamMemberRole | ''>('');
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
      role: 'developer',
    },
  });

  const loadTeamMembers = useCallback(async () => {
    const filters: TeamMemberFilters = {};

    if (roleFilter) {
      filters.role = roleFilter;
    }

    if (statusFilter !== 'all') {
      filters.isActive = statusFilter === 'active';
    }

    await findAll(filters);
  }, [findAll, roleFilter, statusFilter]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  // Filter members by search term (client-side)
  const filteredMembers = teamMembers.filter((member) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search)
    );
  });

  const handleNewMember = () => {
    setSelectedMember(null);
    reset({
      name: '',
      email: '',
      role: 'developer',
    });
    setIsFormOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    reset({
      name: member.name,
      email: member.email,
      role: member.role,
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
          role: data.role,
        };
        const result = await update(selectedMember.id, updateData);
        if (result) {
          handleCloseForm();
        }
      } else {
        const createData: CreateTeamMemberInput = {
          name: data.name,
          email: data.email,
          role: data.role,
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

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRoleFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRoleFilter(event.target.value as TeamMemberRole | '');
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
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando membros da equipe...
          </Typography>
        </Stack>
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
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
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
        <TextField
          size="small"
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        <TextField
          select
          size="small"
          label="Função"
          value={roleFilter}
          onChange={handleRoleFilterChange}
          sx={{ minWidth: 150 }}
          slotProps={{
            select: {
              displayEmpty: true,
            },
            inputLabel: { shrink: true },
          }}
        >
          <MenuItem value="">Todas</MenuItem>
          {roleOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
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
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '1rem' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Função</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedMembers.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Typography fontWeight={500}>{member.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {member.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(member.role)}
                        color={getRoleColor(member.role)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.isActive ? 'Ativo' : 'Inativo'}
                        color={member.isActive ? 'success' : 'default'}
                        size="small"
                        variant={member.isActive ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
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
                            <PersonOffIcon fontSize="small" />
                          ) : (
                            <PersonAddIcon fontSize="small" />
                          )}
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
            count={filteredMembers.length}
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
          <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || roleFilter || statusFilter !== 'all'
              ? 'Nenhum membro encontrado com os filtros aplicados'
              : 'Nenhum membro cadastrado'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchTerm || roleFilter || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Clique em "Novo Membro" para adicionar o primeiro membro da equipe'}
          </Typography>
          {!searchTerm && !roleFilter && statusFilter === 'all' && (
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
            name="role"
            control={control}
            rules={{ required: 'Função é obrigatória' }}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Função"
                fullWidth
                required
                error={!!errors.role}
                helperText={errors.role?.message}
              >
                {roleOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
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
    </PageContainer>
  );
}

export default TeamMembersPage;
