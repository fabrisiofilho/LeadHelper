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
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { useTeams } from '@renderer/hooks/useTeams';
import {
  PageContainer,
  PlaceholderContent,
  FiltersContainer,
  FormContainer,
  MembersChipContainer,
} from './styles';
import type {
  Team,
  CreateTeamInput,
  UpdateTeamInput,
} from '@shared/interfaces/config/index.types';

interface TeamFormData {
  name: string;
  description: string;
}

export function TeamsPage() {
  const {
    teams,
    loading,
    error,
    findAll,
    create,
    update,
    delete: deleteTeam,
    activate,
    deactivate,
    clearError,
  } = useTeams();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamFormData>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const loadTeams = useCallback(async () => {
    await findAll();
  }, [findAll]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const filteredTeams = teams.filter((team) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      team.name.toLowerCase().includes(search) ||
      (team.description?.toLowerCase().includes(search) ?? false)
    );
  });

  const handleNewTeam = () => {
    setSelectedTeam(null);
    reset({ name: '', description: '' });
    setIsFormOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    reset({
      name: team.name,
      description: team.description ?? '',
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedTeam(null);
    reset();
    clearError();
  };

  const handleSaveTeam = async (data: TeamFormData) => {
    setFormLoading(true);
    try {
      if (selectedTeam) {
        const updateData: UpdateTeamInput = {
          name: data.name,
          description: data.description || undefined,
        };
        const result = await update(selectedTeam.id, updateData);
        if (result) handleCloseForm();
      } else {
        const createData: CreateTeamInput = {
          name: data.name,
          description: data.description || undefined,
        };
        const result = await create(createData);
        if (result) handleCloseForm();
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!teamToDelete) return;
    setDeleteLoading(true);
    try {
      const success = await deleteTeam(teamToDelete.id);
      if (success) {
        setIsDeleteModalOpen(false);
        setTeamToDelete(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (team: Team) => {
    if (team.isActive) {
      await deactivate(team.id);
    } else {
      await activate(team.id);
    }
  };

  const paginatedTeams = filteredTeams.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  if (loading && teams.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando equipes...
          </Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (error && teams.length === 0) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <IconButton onClick={loadTeams} sx={{ mt: 2 }}>
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
            Equipes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie as equipes e seus membros
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Atualizar">
            <IconButton onClick={loadTeams} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewTeam}
            sx={{ borderRadius: '0.5rem' }}
          >
            Nova Equipe
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

      {filteredTeams.length > 0 ? (
        <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: '1rem' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Membros</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTeams.map((team) => (
                  <TableRow key={team.id} hover>
                    <TableCell>
                      <Typography fontWeight={500}>{team.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {team.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <MembersChipContainer>
                        {team.members && team.members.length > 0 ? (
                          <>
                            {team.members.slice(0, 3).map((member) => (
                              <Chip
                                key={member.id}
                                label={member.name}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {team.members.length > 3 && (
                              <Chip
                                label={`+${team.members.length - 3}`}
                                size="small"
                                color="primary"
                              />
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Sem membros
                          </Typography>
                        )}
                      </MembersChipContainer>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={team.isActive ? 'Ativa' : 'Inativa'}
                        color={team.isActive ? 'success' : 'default'}
                        size="small"
                        variant={team.isActive ? 'filled' : 'outlined'}
                        onClick={() => handleToggleStatus(team)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleEditTeam(team)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(team)}
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
            count={filteredTeams.length}
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
            {searchTerm
              ? 'Nenhuma equipe encontrada'
              : 'Nenhuma equipe cadastrada'}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchTerm
              ? 'Tente ajustar os filtros de busca'
              : 'Clique em "Nova Equipe" para adicionar a primeira equipe'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleNewTeam}
            >
              Nova Equipe
            </Button>
          )}
        </PlaceholderContent>
      )}

      <Modal
        variant="form"
        open={isFormOpen}
        title={selectedTeam ? 'Editar Equipe' : 'Nova Equipe'}
        handleClose={handleCloseForm}
        handleConfirm={handleSubmit(handleSaveTeam)}
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
                placeholder="Ex: Equipe Backend"
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
                placeholder="Descreva a equipe..."
                fullWidth
                multiline
                rows={3}
              />
            )}
          />
        </FormContainer>
      </Modal>

      <Modal
        variant="danger"
        open={isDeleteModalOpen}
        title="Excluir Equipe"
        handleClose={() => {
          setIsDeleteModalOpen(false);
          setTeamToDelete(null);
        }}
        handleConfirm={handleConfirmDelete}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        loading={deleteLoading}
      >
        <Typography>
          Tem certeza que deseja excluir a equipe{' '}
          <strong>{teamToDelete?.name}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Esta ação não pode ser desfeita.
        </Typography>
      </Modal>
    </PageContainer>
  );
}

export default TeamsPage;
