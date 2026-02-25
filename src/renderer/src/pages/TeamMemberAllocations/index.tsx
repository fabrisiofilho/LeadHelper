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
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Groups as GroupsIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  EventNote as EventIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { Modal } from '@renderer/components/Modal';
import { AllocationModal } from '@renderer/components/AllocationModal';
import { useTeamMemberAllocations } from '@renderer/hooks/useTeamMemberAllocations';
import { useTeams } from '@renderer/hooks/useTeams';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useTableSort } from '@renderer/hooks/useTableSort';
import { SortableTableCell } from '@renderer/components/SortableTableCell';
import {
  PageContainer,
  PlaceholderContent,
  FiltersContainer,
  CapacityBar,
  MemberAvatar,
} from './styles';
import type {
  TeamMemberAllocation,
  CreateTeamMemberAllocationInput,
  UpdateTeamMemberAllocationInput,
  TeamMember,
  TeamMemberRole,
} from '@shared/interfaces/config/index.types';
import { getInitials, ROLE_COLORS } from '@renderer/utils/member';

const roleLabels: Record<TeamMemberRole, string> = {
  developer: 'Desenvolvedor',
  analyst: 'Analista',
  qa: 'QA',
  tech_lead: 'Tech Lead',
  devops: 'DevOps',
  designer: 'Designer',
  product_owner: 'Product Owner',
};

const roleColors = ROLE_COLORS;

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'Indefinido';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

export function TeamMemberAllocationsPage() {
  const {
    allocations,
    loading: allocationsLoading,
    error: allocationsError,
    findAll,
    create,
    update,
    delete: deleteAllocation,
    deactivate,
    getMemberAvailability,
    clearError,
  } = useTeamMemberAllocations();

  const { teams, findAll: findAllTeams, loading: teamsLoading } = useTeams();
  const {
    teamMembers,
    findAll: findAllMembers,
    loading: membersLoading,
  } = useTeamMembers();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] =
    useState<TeamMemberAllocation | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] =
    useState<TeamMemberAllocation | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters
  const [teamFilter, setTeamFilter] = useState<number | ''>('');
  const [memberFilter, setMemberFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('active');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadData = useCallback(async () => {
    await Promise.all([
      findAll({
        isActive:
          statusFilter === 'all' ? undefined : statusFilter === 'active',
        teamId: teamFilter || undefined,
        teamMemberId: memberFilter || undefined,
      }),
      findAllTeams(),
      findAllMembers({ isActive: true }),
    ]);
  }, [
    findAll,
    findAllTeams,
    findAllMembers,
    statusFilter,
    teamFilter,
    memberFilter,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create lookup maps
  const memberMap = useMemo(() => {
    const map = new Map<number, TeamMember>();
    teamMembers.forEach((m) => map.set(m.id, m));
    return map;
  }, [teamMembers]);

  // Filter allocations
  const filteredAllocationsRaw = useMemo(() => {
    return allocations.filter((allocation) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const memberName = allocation.teamMemberName?.toLowerCase() || '';
        const teamName = allocation.teamName?.toLowerCase() || '';
        if (!memberName.includes(search) && !teamName.includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [allocations, searchTerm]);

  const { sortedItems: filteredAllocations, sortConfig, handleSort } = useTableSort(filteredAllocationsRaw, { property: 'startDate', direction: 'desc' });

  const handleNewAllocation = () => {
    setSelectedAllocation(null);
    setIsFormOpen(true);
  };

  const handleEditAllocation = (allocation: TeamMemberAllocation) => {
    setSelectedAllocation(allocation);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedAllocation(null);
    clearError();
  };

  const handleSaveAllocation = async (
    data: CreateTeamMemberAllocationInput | UpdateTeamMemberAllocationInput,
  ) => {
    setFormLoading(true);
    try {
      if (selectedAllocation) {
        const result = await update(
          selectedAllocation.id,
          data as UpdateTeamMemberAllocationInput,
        );
        if (result) {
          handleCloseForm();
          loadData();
        }
      } else {
        const result = await create(data as CreateTeamMemberAllocationInput);
        if (result) {
          handleCloseForm();
          loadData();
        }
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (allocation: TeamMemberAllocation) => {
    setAllocationToDelete(allocation);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!allocationToDelete) return;
    setDeleteLoading(true);
    try {
      const success = await deleteAllocation(allocationToDelete.id);
      if (success) {
        setIsDeleteModalOpen(false);
        setAllocationToDelete(null);
        loadData();
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeactivate = async (allocation: TeamMemberAllocation) => {
    await deactivate(allocation.id);
    loadData();
  };

  const paginatedAllocations = filteredAllocations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const loading = allocationsLoading || teamsLoading || membersLoading;

  if (loading && allocations.length === 0) {
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

  if (allocationsError && allocations.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {allocationsError}
          </Typography>
          <IconButton onClick={loadData} sx={{ mt: 2 }}>
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
            Alocação de Membros em Equipes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie a alocação temporal de membros nas equipes com percentual
            de dedicação
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
            onClick={handleNewAllocation}
            sx={{ borderRadius: '0.5rem' }}
          >
            Nova Alocação
          </Button>
        </Stack>
      </Stack>

      {/* Filtros */}
      <FiltersContainer>
        <TextField
          size="small"
          placeholder="Buscar por membro ou equipe..."
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
            setTeamFilter(e.target.value === '' ? '' : Number(e.target.value));
            setPage(0);
          }}
          sx={{ minWidth: 180 }}
          slotProps={{
            select: { displayEmpty: true },
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
        <TextField
          select
          size="small"
          label="Membro"
          value={memberFilter}
          onChange={(e) => {
            setMemberFilter(
              e.target.value === '' ? '' : Number(e.target.value),
            );
            setPage(0);
          }}
          sx={{ minWidth: 180 }}
          slotProps={{
            select: { displayEmpty: true },
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
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
            setPage(0);
          }}
          sx={{ minWidth: 120 }}
          slotProps={{
            select: { displayEmpty: true },
            inputLabel: { shrink: true },
          }}
        >
          <MenuItem value="all">Todos</MenuItem>
          <MenuItem value="active">Ativos</MenuItem>
          <MenuItem value="inactive">Inativos</MenuItem>
        </TextField>
      </FiltersContainer>

      {filteredAllocations.length > 0 ? (
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '1rem' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <SortableTableCell id="teamMemberName" label="Membro" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableCell id="teamName" label="Equipe" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableCell id="startDate" label="Período" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableCell id="dedicationPercentage" label="Dedicação" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableCell id="isActive" label="Status" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableTableCell id="actions" label="Ações" sortConfig={sortConfig} onSort={handleSort} noSort align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAllocations.map((allocation) => {
                  const member = memberMap.get(allocation.teamMemberId);
                  return (
                    <TableRow key={allocation.id} hover>
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                        >
                          <MemberAvatar
                            sx={{
                              bgcolor: member
                                ? roleColors[member.role]
                                : '#9e9e9e',
                              width: 36,
                              height: 36,
                            }}
                          >
                            {allocation.teamMemberName
                              ? getInitials(allocation.teamMemberName)
                              : '?'}
                          </MemberAvatar>
                          <Box>
                            <Typography fontWeight={500}>
                              {allocation.teamMemberName ||
                                `#${allocation.teamMemberId}`}
                            </Typography>
                            {member && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {roleLabels[member.role]}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <GroupsIcon fontSize="small" color="action" />
                          <Typography>
                            {allocation.teamName || `#${allocation.teamId}`}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <EventIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {formatDate(allocation.startDate)} -{' '}
                            {formatDate(allocation.endDate)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ width: 120 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            mb={0.5}
                          >
                            <Typography variant="caption">
                              {allocation.dedicationPercentage}%
                            </Typography>
                          </Stack>
                          <CapacityBar
                            variant="determinate"
                            value={allocation.dedicationPercentage}
                            $percentage={allocation.dedicationPercentage}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            allocation.isActive ? (
                              <ActiveIcon />
                            ) : (
                              <InactiveIcon />
                            )
                          }
                          label={allocation.isActive ? 'Ativo' : 'Inativo'}
                          color={allocation.isActive ? 'success' : 'default'}
                          size="small"
                          variant={allocation.isActive ? 'filled' : 'outlined'}
                        />
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
                        {allocation.isActive && (
                          <Tooltip title="Encerrar Alocação">
                            <IconButton
                              size="small"
                              onClick={() => handleDeactivate(allocation)}
                              color="warning"
                            >
                              <InactiveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredAllocations.length}
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
          <GroupsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm || teamFilter || memberFilter
              ? 'Nenhuma alocação encontrada'
              : 'Nenhuma alocação cadastrada'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchTerm || teamFilter || memberFilter
              ? 'Tente ajustar os filtros de busca'
              : 'Clique em "Nova Alocação" para alocar um membro em uma equipe'}
          </Typography>
          {!searchTerm && !teamFilter && !memberFilter && (
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

      {/* Modal de Alocação (componente compartilhado) */}
      <AllocationModal
        open={isFormOpen}
        teams={teams}
        allocation={selectedAllocation}
        teamMembers={teamMembers}
        loading={formLoading}
        error={allocationsError}
        onClose={handleCloseForm}
        onSave={handleSaveAllocation}
        getMemberAvailability={getMemberAvailability}
      />

      {/* Modal de Exclusão */}
      <Modal
        variant="danger"
        open={isDeleteModalOpen}
        title="Excluir Alocação"
        handleClose={() => {
          setIsDeleteModalOpen(false);
          setAllocationToDelete(null);
        }}
        handleConfirm={handleConfirmDelete}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={deleteLoading}
      >
        <Typography>Tem certeza que deseja excluir esta alocação?</Typography>
        {allocationToDelete && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Membro:</strong> {allocationToDelete.teamMemberName}
            </Typography>
            <Typography variant="body2">
              <strong>Equipe:</strong> {allocationToDelete.teamName}
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
      </Modal>
    </PageContainer>
  );
}

export default TeamMemberAllocationsPage;
