import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Grid,
  Stack,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  StickyNote2 as NoteIcon,
  BarChart as GanttIcon,
  AssignmentInd as AllocationIcon,
} from '@mui/icons-material';
import { DebouncedSearchInput } from '@renderer/components/DebouncedSearchInput';
import { enqueueSnackbar } from 'notistack';
import { useNoteCards } from '@renderer/hooks/useNoteCards';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useTeams } from '@renderer/hooks/useTeams';
import { usePositions } from '@renderer/hooks/usePositions';
import { NoteCardItem } from './components/NoteCardItem';
import { NoteCardFormModal } from './components/NoteCardFormModal';
import { NoteCardDetailModal } from './components/NoteCardDetailModal';
import { NotesBoardGanttTab } from './components/NotesBoardGanttTab';
import { AllocationStatusModal } from './components/AllocationStatusModal';
import type {
  NoteCard,
  CreateNoteCardInput,
  UpdateNoteCardInput,
} from '@shared/interfaces/config/index.types';

// ============================================================================
// Types
// ============================================================================

type TabValue = 0 | 1 | 2; // 0=Active, 1=Completed, 2=Gantt

// ============================================================================
// Component
// ============================================================================

export function NotesBoardPage() {
  // Tab state — 0 = Active, 1 = Inactive, 2 = Gantt
  const [activeTab, setActiveTab] = useState<TabValue>(0);
  const [search, setSearch] = useState('');

  // Advanced filters (active/completed tabs)
  const [filterMemberId, setFilterMemberId] = useState<number | ''>('');
  const [filterHasPeriod, setFilterHasPeriod] = useState<'' | 'yes' | 'no'>('');

  // Modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [allocationStatusOpen, setAllocationStatusOpen] = useState(false);
  const [editingNoteCard, setEditingNoteCard] = useState<NoteCard | null>(null);
  const [viewingNoteCard, setViewingNoteCard] = useState<NoteCard | null>(null);

  // Count state for tab badges (keep separate counts for active/inactive)
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  // Hooks
  const {
    noteCards,
    loading: noteCardsLoading,
    findAllActive,
    findAllCompleted,
    create,
    update,
    complete,
    reactivate,
    delete: deleteNoteCard,
  } = useNoteCards();

  const { teamMembers, findAll: findAllMembers } = useTeamMembers();
  const { teams, findAll: findAllTeams } = useTeams();
  const { positions, findAll: findAllPositions } = usePositions();

  // Load auxiliary data for form modal autocomplete (tasks are searched server-side)
  const loadAuxiliaryData = useCallback(async () => {
    await Promise.all([
      findAllMembers({ isActive: true }),
      findAllTeams({ isActive: true }),
      findAllPositions({ isActive: true }),
    ]);
  }, [findAllMembers, findAllTeams, findAllPositions]);

  // Load note cards for the current tab and update both counts
  const loadNoteCards = useCallback(
    async (tab: TabValue = activeTab) => {
      // Load current tab data (this updates noteCards in the hook)
      if (tab === 0) {
        const active = await findAllActive();
        setActiveCount(active.length);
        // Fetch inactive count without overwriting noteCards
        const response = await window.electronAPI.noteCard.findAllCompleted();
        if (response.success) setInactiveCount(response.data?.length ?? 0);
      } else {
        const completed = await findAllCompleted();
        setInactiveCount(completed.length);
        // Fetch active count without overwriting noteCards
        const response = await window.electronAPI.noteCard.findAllActive();
        if (response.success) setActiveCount(response.data?.length ?? 0);
      }
    },
    [activeTab, findAllActive, findAllCompleted],
  );

  // Initial load
  useEffect(() => {
    loadAuxiliaryData();
    loadNoteCards(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload cards when tab changes
  useEffect(() => {
    loadNoteCards();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered cards by search + advanced filters
  const filteredCards = useMemo(() => {
    let result = noteCards;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((nc) => nc.title.toLowerCase().includes(term));
    }
    if (filterMemberId) {
      result = result.filter((nc) =>
        nc.links.some(
          (l) =>
            l.entityType === 'team_member' && l.entityId === filterMemberId,
        ),
      );
    }
    if (filterHasPeriod === 'yes') {
      result = result.filter((nc) => !!nc.startDate || !!nc.deadline);
    } else if (filterHasPeriod === 'no') {
      result = result.filter((nc) => !nc.startDate && !nc.deadline);
    }
    return result;
  }, [noteCards, search, filterMemberId, filterHasPeriod]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue as TabValue);
    setSearch('');
    setFilterMemberId('');
    setFilterHasPeriod('');
  };

  const handleOpenCreateModal = () => {
    setEditingNoteCard(null);
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (noteCard: NoteCard) => {
    setEditingNoteCard(noteCard);
    setFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setFormModalOpen(false);
    setEditingNoteCard(null);
  };

  const handleViewDetails = (noteCard: NoteCard) => {
    setViewingNoteCard(noteCard);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setViewingNoteCard(null);
  };

  const handleFormSubmit = async (
    data: CreateNoteCardInput | UpdateNoteCardInput,
  ) => {
    if (editingNoteCard) {
      const result = await update(
        editingNoteCard.id,
        data as UpdateNoteCardInput,
      );
      if (result) {
        enqueueSnackbar('Nota atualizada com sucesso', { variant: 'success' });
        handleCloseFormModal();
        await loadNoteCards();
      }
    } else {
      const result = await create(data as CreateNoteCardInput);
      if (result) {
        enqueueSnackbar('Nota criada com sucesso', { variant: 'success' });
        handleCloseFormModal();
        await loadNoteCards();
      }
    }
  };

  const handleComplete = async (id: number) => {
    const result = await complete(id);
    if (result) {
      enqueueSnackbar('Nota concluída', { variant: 'success' });
      await loadNoteCards();
    }
  };

  const handleReactivate = async (id: number) => {
    const result = await reactivate(id);
    if (result) {
      enqueueSnackbar('Nota reativada', { variant: 'success' });
      await loadNoteCards();
    }
  };

  const handleDelete = async (id: number) => {
    const result = await deleteNoteCard(id);
    if (result) {
      enqueueSnackbar('Nota excluída', { variant: 'success' });
      await loadNoteCards();
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const isLoading = noteCardsLoading && noteCards.length === 0;

  // Count active members with no note allocation today (for the badge)
  const unallocatedTodayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return teamMembers.filter((m) => {
      if (!m.isActive) return false;
      const memberNotes = noteCards.filter((n) =>
        n.links.some(
          (l) => l.entityType === 'team_member' && l.entityId === m.id,
        ),
      );
      const hasActiveToday = memberNotes.some((n) => {
        if (!n.startDate) return false;
        const s = new Date(n.startDate);
        const e = n.deadline ? new Date(n.deadline) : s;
        return s <= todayEnd && e >= todayStart;
      });
      return !hasActiveToday;
    }).length;
  }, [teamMembers, noteCards]);

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        maxWidth: 1440,
        margin: '0 auto',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
        mb={2}
        flexShrink={0}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Quadro de Notas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie anotações, observações e pontos de atenção
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
          <Tooltip title="Ver status de alocação dos membros">
            <Badge
              badgeContent={unallocatedTodayCount}
              color="warning"
              max={99}
            >
              <Button
                variant="outlined"
                startIcon={<AllocationIcon />}
                onClick={() => setAllocationStatusOpen(true)}
              >
                Alocação
              </Button>
            </Badge>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
          >
            Criar Nota
          </Button>
        </Stack>
      </Stack>

      {/* Tabs + Filters */}
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ maxWidth: { sm: 500 }, mb: activeTab !== 2 ? 1.5 : 0 }}
        >
          <Tab label={`Ativas (${activeCount})`} />
          <Tab label={`Concluídas (${inactiveCount})`} />
          <Tab icon={<GanttIcon />} iconPosition="start" label="Gantt" />
        </Tabs>

        {activeTab !== 2 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <DebouncedSearchInput
              placeholder="Buscar por título..."
              onSearch={setSearch}
              sx={{ maxWidth: { sm: 280 } }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel shrink>Membro</InputLabel>
              <Select
                value={filterMemberId}
                label="Membro"
                displayEmpty
                onChange={(e) =>
                  setFilterMemberId(e.target.value as number | '')
                }
                notched
              >
                <MenuItem value="">Todos os membros</MenuItem>
                {teamMembers
                  .filter((m) => m.isActive)
                  .map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel shrink>Período</InputLabel>
              <Select
                value={filterHasPeriod}
                label="Período"
                displayEmpty
                onChange={(e) =>
                  setFilterHasPeriod(e.target.value as '' | 'yes' | 'no')
                }
                notched
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="yes">Com período</MenuItem>
                <MenuItem value="no">Sem período</MenuItem>
              </Select>
            </FormControl>
            {(filterMemberId || filterHasPeriod) && (
              <Chip
                label="Limpar filtros"
                size="small"
                variant="outlined"
                onDelete={() => {
                  setFilterMemberId('');
                  setFilterHasPeriod('');
                }}
                sx={{ alignSelf: 'center' }}
              />
            )}
          </Stack>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Gantt tab */}
        {activeTab === 2 && <NotesBoardGanttTab members={teamMembers} />}

        {/* Active / Completed tabs */}
        {activeTab !== 2 && (
          <>
            {isLoading ? (
              <Grid container spacing={2}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Skeleton
                      variant="rounded"
                      height={160}
                      sx={{ borderRadius: 2 }}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : filteredCards.length === 0 ? (
              <Stack
                alignItems="center"
                justifyContent="center"
                minHeight="40vh"
                spacing={1}
              >
                <NoteIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                <Typography variant="body1" color="text.secondary">
                  {search.trim() || filterMemberId || filterHasPeriod
                    ? 'Nenhuma nota encontrada para os filtros aplicados'
                    : activeTab === 0
                      ? 'Nenhuma nota ativa'
                      : 'Nenhuma nota concluída'}
                </Typography>
              </Stack>
            ) : (
              <Grid container spacing={2}>
                {filteredCards.map((noteCard) => (
                  <Grid
                    key={noteCard.id}
                    size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                  >
                    <NoteCardItem
                      noteCard={noteCard}
                      onComplete={handleComplete}
                      onEdit={handleOpenEditModal}
                      onViewDetails={handleViewDetails}
                      onReactivate={
                        activeTab === 1 ? handleReactivate : undefined
                      }
                      onDelete={handleDelete}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Box>

      {/* Modals */}
      <NoteCardFormModal
        open={formModalOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        noteCard={editingNoteCard}
        members={teamMembers}
        teams={teams}
        positions={positions}
        tasks={[]}
        loading={noteCardsLoading}
      />

      <NoteCardDetailModal
        open={detailModalOpen}
        onClose={handleCloseDetailModal}
        noteCard={viewingNoteCard}
      />

      <AllocationStatusModal
        open={allocationStatusOpen}
        onClose={() => setAllocationStatusOpen(false)}
        members={teamMembers}
        activeNoteCards={noteCards}
      />
    </Box>
  );
}

export default NotesBoardPage;
