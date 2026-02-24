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
  GroupWork as GroupWorkIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useTeams } from '@renderer/hooks/useTeams';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useTeamMemberAllocations } from '@renderer/hooks/useTeamMemberAllocations';
import {
  PageContainer,
  ContentContainer,
  LeftPanel,
  RightPanel,
  PlaceholderContent,
} from './styles';
import { TeamList } from './components/TeamList';
import { MemberDetails } from './components/MemberDetails';
import { TeamModal } from './components/TeamModal';
import { MemberModal } from './components/MemberModal';
import { AllocationModal } from '@renderer/components/AllocationModal';
import type {
  Team,
  TeamMemberAllocation,
  CreateTeamInput,
  UpdateTeamInput,
  CreateTeamMemberInput,
  CreateTeamMemberAllocationInput,
  UpdateTeamMemberAllocationInput,
} from '@shared/interfaces/config/index.types';

export function TeamAllocationPage() {
  // State management
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamModalLoading, setTeamModalLoading] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberModalLoading, setMemberModalLoading] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [allocationModalLoading, setAllocationModalLoading] = useState(false);
  const [editingAllocation, setEditingAllocation] =
    useState<TeamMemberAllocation | null>(null);

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
    findActiveByTeam,
    create: createAllocation,
    update: updateAllocation,
    clearError: clearAllocationsError,
  } = useTeamMemberAllocations();

  const {
    teamMembers,
    error: membersError,
    findAll: findAllMembers,
    create: createMember,
    clearError: clearMembersError,
  } = useTeamMembers();

  // Load teams on mount
  const loadTeams = useCallback(async () => {
    await findAllTeams();
  }, [findAllTeams]);

  // Load team members on mount
  const loadTeamMembers = useCallback(async () => {
    await findAllMembers();
  }, [findAllMembers]);

  useEffect(() => {
    loadTeams();
    loadTeamMembers();
  }, [loadTeams, loadTeamMembers]);

  // Load allocations when team is selected
  useEffect(() => {
    if (selectedTeam) {
      findActiveByTeam(selectedTeam.id);
    }
  }, [selectedTeam, findActiveByTeam]);

  // Handlers
  const handleSelectTeam = (team: Team) => {
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
          // Update selected team if it was the one being edited
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
          // Refresh allocations for the selected team
          if (selectedTeam) {
            await findActiveByTeam(selectedTeam.id);
          }
        }
      } else {
        const result = await createAllocation(
          data as CreateTeamMemberAllocationInput,
        );
        if (result) {
          handleCloseAllocationModal();
          // Refresh allocations for the selected team
          if (selectedTeam) {
            await findActiveByTeam(selectedTeam.id);
          }
        }
      }
    } finally {
      setAllocationModalLoading(false);
    }
  };

  const handleRemoveAllocation = (allocation: TeamMemberAllocation) => {
    // Will be implemented with confirmation dialog in subsequent tasks
    // For now, just log the action
    console.log('Remove allocation:', allocation.id);
  };

  const handleRefresh = async () => {
    await loadTeams();
    await loadTeamMembers();
    if (selectedTeam) {
      await findActiveByTeam(selectedTeam.id);
    }
  };

  // Loading state
  const isLoading = teamsLoading && teams.length === 0;
  const hasError = (teamsError || allocationsError) && teams.length === 0;

  if (isLoading) {
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
      {/* Page Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Alocação de Equipes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie equipes e alocação de membros
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
        {/* Left Panel - Team List (30%) */}
        <LeftPanel>
          <TeamList
            teams={teams}
            selectedTeam={selectedTeam}
            loading={teamsLoading}
            onSelectTeam={handleSelectTeam}
            onNewTeam={handleNewTeam}
            onEditTeam={handleEditTeam}
          />
        </LeftPanel>

        {/* Right Panel - Member Details (70%) */}
        <RightPanel>
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
                Escolha uma equipe na lista à esquerda para visualizar e
                gerenciar seus membros
              </Typography>
            </PlaceholderContent>
          )}
        </RightPanel>
      </ContentContainer>

      {/* TeamModal */}
      <TeamModal
        open={isTeamModalOpen}
        team={editingTeam}
        loading={teamModalLoading}
        error={teamsError}
        onClose={handleCloseTeamModal}
        onSave={handleSaveTeam}
      />

      {/* MemberModal */}
      <MemberModal
        open={isMemberModalOpen}
        loading={memberModalLoading}
        error={membersError}
        onClose={handleCloseMemberModal}
        onSave={handleSaveMember}
      />

      {/* AllocationModal */}
      {selectedTeam && (
        <AllocationModal
          open={isAllocationModalOpen}
          fixedTeam={selectedTeam}
          allocation={editingAllocation}
          teamMembers={teamMembers}
          loading={allocationModalLoading}
          error={allocationsError}
          onClose={handleCloseAllocationModal}
          onSave={handleSaveAllocation}
        />
      )}
    </PageContainer>
  );
}

export default TeamAllocationPage;
