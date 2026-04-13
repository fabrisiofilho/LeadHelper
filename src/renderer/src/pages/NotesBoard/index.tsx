import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
  Stack,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  StickyNote2 as NoteIcon,
} from '@mui/icons-material';
import { enqueueSnackbar } from 'notistack';
import { useNoteCards } from '@renderer/hooks/useNoteCards';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useTeams } from '@renderer/hooks/useTeams';
import { usePositions } from '@renderer/hooks/usePositions';
import { NoteCardItem } from './components/NoteCardItem';
import { NoteCardFormModal } from './components/NoteCardFormModal';
import { NoteCardDetailModal } from './components/NoteCardDetailModal';
import type {
  NoteCard,
  CreateNoteCardInput,
  UpdateNoteCardInput,
} from '@shared/interfaces/config/index.types';

// ============================================================================
// Types
// ============================================================================

type TabValue = 0 | 1;

// ============================================================================
// Component
// ============================================================================

export function NotesBoardPage() {
  // Tab state — 0 = Active, 1 = Inactive
  const [activeTab, setActiveTab] = useState<TabValue>(0);
  const [search, setSearch] = useState('');

  // Modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
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
  const loadNoteCards = useCallback(async (tab: TabValue = activeTab) => {
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
  }, [activeTab, findAllActive, findAllCompleted]);

  // Initial load
  useEffect(() => {
    loadAuxiliaryData();
    loadNoteCards(0);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Reload cards when tab changes
  useEffect(() => {
    loadNoteCards();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered cards by search
  const filteredCards = useMemo(() => {
    if (!search.trim()) return noteCards;
    const term = search.trim().toLowerCase();
    return noteCards.filter((nc) => nc.title.toLowerCase().includes(term));
  }, [noteCards, search]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue as TabValue);
    setSearch('');
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

  const handleFormSubmit = async (data: CreateNoteCardInput | UpdateNoteCardInput) => {
    if (editingNoteCard) {
      const result = await update(editingNoteCard.id, data as UpdateNoteCardInput);
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

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1600, margin: '0 auto', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
          sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
        >
          Criar Nota
        </Button>
      </Stack>

      {/* Search + Tabs */}
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 1.5, maxWidth: { sm: 400 } }}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ maxWidth: { sm: 400 } }}
        >
          <Tab label={`Ativas (${activeCount})`} />
          <Tab label={`Concluídas (${inactiveCount})`} />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <Stack alignItems="center" justifyContent="center" minHeight="40vh">
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary" mt={2}>
              Carregando notas...
            </Typography>
          </Stack>
        ) : filteredCards.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" minHeight="40vh" spacing={1}>
            <NoteIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
            <Typography variant="body1" color="text.secondary">
              {search.trim()
                ? 'Nenhuma nota encontrada para a busca'
                : activeTab === 0
                  ? 'Nenhuma nota ativa'
                  : 'Nenhuma nota concluída'}
            </Typography>
          </Stack>
        ) : (
          <Grid container spacing={2}>
            {filteredCards.map((noteCard) => (
              <Grid key={noteCard.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <NoteCardItem
                  noteCard={noteCard}
                  onComplete={handleComplete}
                  onEdit={handleOpenEditModal}
                  onViewDetails={handleViewDetails}
                  onReactivate={activeTab === 1 ? handleReactivate : undefined}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </Grid>
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
    </Box>
  );
}

export default NotesBoardPage;
