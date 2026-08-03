import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Alert,
  AlertTitle,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import {
  GroupWork as GroupWorkIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useTeams } from '@renderer/hooks/useTeams';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useTeamMemberAllocations } from '@renderer/hooks/useTeamMemberAllocations';
import { PageContainer, ContentArea, PlaceholderContent } from './styles';
import { MemberDetails } from './components/MemberDetails';
import { AllocationOverview } from './components/AllocationOverview';
import { TeamModal } from './components/TeamModal';
import { MemberModal } from './components/MemberModal';
import { Modal } from '@renderer/components/Modal';
import { AllocationModal } from '@renderer/components/AllocationModal';
import type {
  Team,
  TeamMemberAllocation,
  AllocationConflict,
  CreateTeamInput,
  UpdateTeamInput,
  CreateTeamMemberInput,
  CreateTeamMemberAllocationInput,
  UpdateTeamMemberAllocationInput,
} from '@shared/interfaces/config/index.types';

export function TeamAllocationPage() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamModalLoading, setTeamModalLoading] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberModalLoading, setMemberModalLoading] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [allocationModalLoading, setAllocationModalLoading] = useState(false);
  const [isRemoveAllocationModalOpen, setIsRemoveAllocationModalOpen] =
    useState(false);
  const [allocationToRemove, setAllocationToRemove] =
    useState<TeamMemberAllocation | null>(null);
  const [removeAllocationLoading, setRemoveAllocationLoading] = useState(false);

  const [editingAllocation, setEditingAllocation] =
    useState<TeamMemberAllocation | null>(null);

  const [conflicts, setConflicts] = useState<AllocationConflict[]>([]);
  const [, setConflictsLoading] = useState(false);

  // Hooks
  const {
    teams,
    loading: teamsLoading,
    error: teamsError,
    findAll: findAllTeams,
    create: createTeam,
    update: updateTeam,
    clearError: clearTeamsError,
  } = useTeams();

  const {
    allocations,
    loading: allocationsLoading,
    error: allocationsError,
    findByTeam,
    create: createAllocation,
    update: updateAllocation,
    delete: deleteAllocation,
    getMemberAvailability,
    clearError: clearAllocationsError,
  } = useTeamMemberAllocations();

  // Second hook instance for all active allocations (overview)
  const { allocations: allAllocations, findAll: findAllAllocations } =
    useTeamMemberAllocations();

  const {
    teamMembers,
    error: membersError,
    findAll: findAllMembers,
    create: createMember,
    clearError: clearMembersError,
  } = useTeamMembers();

  const loadTeams = useCallback(async () => {
    await findAllTeams();
  }, [findAllTeams]);

  const loadTeamMembers = useCallback(async () => {
    await findAllMembers();
  }, [findAllMembers]);

  const loadConflicts = useCallback(async () => {
    setConflictsLoading(true);
    try {
      const response = await window.electronAPI.allocation.detectConflicts();
      if (response.success && response.data) {
        setConflicts(response.data);
      }
    } catch {
      // Silently fail — conflicts are informational
    } finally {
      setConflictsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
    loadTeamMembers();
    findAllAllocations({ isActive: true });
    loadConflicts();
  }, [loadTeams, loadTeamMembers, findAllAllocations, loadConflicts]);

  useEffect(() => {
    if (selectedTeam) {
      findByTeam(selectedTeam.id);
    }
  }, [selectedTeam, findByTeam]);

  // Handlers
  const handleSelectTeam = (team: Team | null) => {
    setSelectedTeam(team);
  };

  const handleNewTeam = () => {
    setEditingTeam(null);
    setIsTeamModalOpen(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setIsTeamModalOpen(true);
  };

  const handleCloseTeamModal = () => {
    setIsTeamModalOpen(false);
    setEditingTeam(null);
    clearTeamsError();
  };

  const handleSaveTeam = async (data: CreateTeamInput | UpdateTeamInput) => {
    setTeamModalLoading(true);
    try {
      if (editingTeam) {
        const result = await updateTeam(
          editingTeam.id,
          data as UpdateTeamInput,
        );
        if (result) {
          handleCloseTeamModal();
          if (selectedTeam?.id === editingTeam.id) {
            setSelectedTeam(result);
          }
        }
      } else {
        const result = await createTeam(data as CreateTeamInput);
        if (result) {
          handleCloseTeamModal();
        }
      }
    } finally {
      setTeamModalLoading(false);
    }
  };

  const handleNewMember = () => {
    setIsMemberModalOpen(true);
  };

  const handleCloseMemberModal = () => {
    setIsMemberModalOpen(false);
    clearMembersError();
  };

  const handleSaveMember = async (data: CreateTeamMemberInput) => {
    setMemberModalLoading(true);
    try {
      const result = await createMember(data);
      if (result) {
        handleCloseMemberModal();
      }
    } finally {
      setMemberModalLoading(false);
    }
  };

  const handleNewAllocation = () => {
    setEditingAllocation(null);
    setIsAllocationModalOpen(true);
  };

  const handleEditAllocation = (allocation: TeamMemberAllocation) => {
    setEditingAllocation(allocation);
    setIsAllocationModalOpen(true);
  };

  const handleCloseAllocationModal = () => {
    setIsAllocationModalOpen(false);
    setEditingAllocation(null);
    clearAllocationsError();
  };

  const handleSaveAllocation = async (
    data: CreateTeamMemberAllocationInput | UpdateTeamMemberAllocationInput,
  ) => {
    setAllocationModalLoading(true);
    try {
      if (editingAllocation) {
        const result = await updateAllocation(
          editingAllocation.id,
          data as UpdateTeamMemberAllocationInput,
        );
        if (result) {
          handleCloseAllocationModal();
          if (selectedTeam) {
            await findByTeam(selectedTeam.id);
          }
          await findAllAllocations({ isActive: true });
          await loadConflicts();
        }
      } else {
        const result = await createAllocation(
          data as CreateTeamMemberAllocationInput,
        );
        if (result) {
          handleCloseAllocationModal();
          if (selectedTeam) {
            await findByTeam(selectedTeam.id);
          }
          await findAllAllocations({ isActive: true });
          await loadConflicts();
        }
      }
    } finally {
      setAllocationModalLoading(false);
    }
  };

  const handleRemoveAllocation = (allocation: TeamMemberAllocation) => {
    setAllocationToRemove(allocation);
    setIsRemoveAllocationModalOpen(true);
  };

  const handleConfirmRemoveAllocation = async () => {
    if (!allocationToRemove) return;
    setRemoveAllocationLoading(true);
    try {
      const success = await deleteAllocation(allocationToRemove.id);
      if (success) {
        setIsRemoveAllocationModalOpen(false);
        setAllocationToRemove(null);
        if (selectedTeam) {
          await findByTeam(selectedTeam.id);
        }
        await findAllAllocations({ isActive: true });
        await loadConflicts();
      }
    } finally {
      setRemoveAllocationLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadTeams();
    await loadTeamMembers();
    await findAllAllocations({ isActive: true });
    await loadConflicts();
    if (selectedTeam) {
      await findByTeam(selectedTeam.id);
    }
  };

  const isLoading = teamsLoading && teams.length === 0;
  const isRefreshing = teamsLoading && teams.length > 0;
  const hasError = (teamsError || allocationsError) && teams.length === 0;

  if (isLoading) {
    return (
      <PageContainer>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Stack spacing={0.5}>
            <Skeleton
              variant="text"
              width={240}
              height={44}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant="text"
              width={280}
              height={22}
              sx={{ borderRadius: 1 }}
            />
          </Stack>
          <Skeleton variant="circular" width={32} height={32} />
        </Stack>
        <Stack direction="row" spacing={1} mb={2}>
          {[140, 120].map((w, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={w}
              height={36}
              sx={{ borderRadius: 1 }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={200}
              height={100}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Stack>
        <Skeleton
          variant="rounded"
          height={300}
          sx={{ mt: 2, borderRadius: 2 }}
        />
      </PageContainer>
    );
  }

  if (hasError) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {teamsError || allocationsError}
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
          <Typography variant="h5" fontWeight={700}>
            Alocação de Equipes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie equipes e alocação de membros
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {isRefreshing && (
            <CircularProgress
              size={20}
              thickness={5}
              sx={{ alignSelf: 'center' }}
            />
          )}
          <Tooltip title="Atualizar">
            <IconButton
              onClick={handleRefresh}
              size="small"
              disabled={isRefreshing}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {selectedTeam && (
            <Tooltip title="Editar equipe">
              <IconButton
                size="small"
                onClick={() => handleEditTeam(selectedTeam)}
              >
                <GroupWorkIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Conflict alerts */}
      {conflicts.length > 0 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {conflicts.map((conflict, index) => (
            <Alert key={index} severity="warning" variant="outlined">
              <AlertTitle>Conflito de Alocação</AlertTitle>
              <strong>{conflict.memberName}</strong> está alocado na equipe{' '}
              <strong>{conflict.allocatedTeamName}</strong>, mas possui a tarefa{' '}
              <strong>&quot;{conflict.taskTitle}&quot;</strong> na equipe{' '}
              <strong>{conflict.taskTeamName}</strong>.
            </Alert>
          ))}
        </Stack>
      )}

      <AllocationOverview
        teams={teams}
        teamMembers={teamMembers}
        allAllocations={allAllocations}
        selectedTeam={selectedTeam}
        onSelectTeam={(team) => handleSelectTeam(team)}
        onNewTeam={handleNewTeam}
      />

      <ContentArea sx={{ mt: 2 }}>
        {selectedTeam ? (
          <MemberDetails
            team={selectedTeam}
            allocations={allocations}
            loading={allocationsLoading}
            onNewMember={handleNewMember}
            onNewAllocation={handleNewAllocation}
            onEditAllocation={handleEditAllocation}
            onRemoveAllocation={handleRemoveAllocation}
          />
        ) : (
          <PlaceholderContent>
            <GroupWorkIcon
              sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Selecione uma equipe
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clique em uma equipe acima para visualizar e gerenciar seus
              membros
            </Typography>
          </PlaceholderContent>
        )}
      </ContentArea>

      <TeamModal
        open={isTeamModalOpen}
        team={editingTeam}
        loading={teamModalLoading}
        error={teamsError}
        onClose={handleCloseTeamModal}
        onSave={handleSaveTeam}
      />

      <MemberModal
        open={isMemberModalOpen}
        loading={memberModalLoading}
        error={membersError}
        onClose={handleCloseMemberModal}
        onSave={handleSaveMember}
      />

      {selectedTeam && (
        <AllocationModal
          open={isAllocationModalOpen}
          fixedTeam={selectedTeam}
          allocation={editingAllocation}
          teamMembers={teamMembers}
          existingAllocations={allAllocations}
          loading={allocationModalLoading}
          error={allocationsError}
          onClose={handleCloseAllocationModal}
          onSave={handleSaveAllocation}
          getMemberAvailability={getMemberAvailability}
        />
      )}

      <Modal
        variant="danger"
        open={isRemoveAllocationModalOpen}
        title="Remover Alocação"
        handleClose={() => {
          setIsRemoveAllocationModalOpen(false);
          setAllocationToRemove(null);
        }}
        handleConfirm={handleConfirmRemoveAllocation}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        loading={removeAllocationLoading}
      >
        <Typography>
          Tem certeza que deseja remover a alocação de{' '}
          <strong>{allocationToRemove?.teamMemberName}</strong> desta equipe?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Esta ação não pode ser desfeita.
        </Typography>
      </Modal>
    </PageContainer>
  );
}

export default TeamAllocationPage;
