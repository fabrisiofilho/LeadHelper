import { useEffect, useState, useMemo } from 'react';
import {
  Typography,
  Stack,
  TextField,
  InputAdornment,
  Chip,
  Box,
  CircularProgress,
  Paper,
  Checkbox,
} from '@mui/material';
import {
  Search as SearchIcon,
  LinkOff as LinkOffIcon,
} from '@mui/icons-material';
import { Modal } from '@renderer/components/Modal';
import type { Task, Sprint } from '@shared/interfaces/config/index.types';

interface LinkTaskModalProps {
  open: boolean;
  sprint: Sprint;
  /** All tasks loaded globally */
  allTasks: Task[];
  /** Tasks already in this sprint */
  sprintTaskIds: Set<number>;
  loading: boolean;
  onClose: () => void;
  onLink: (taskIds: number[]) => Promise<void>;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
};

export function LinkTaskModal({
  open,
  sprint,
  allTasks,
  sprintTaskIds,
  loading,
  onClose,
  onLink,
}: LinkTaskModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIds(new Set());
    }
  }, [open]);

  // Tasks available to link (not already in this sprint)
  const availableTasks = useMemo(() => {
    let result = allTasks.filter((t) => !sprintTaskIds.has(t.id));

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.team?.name.toLowerCase().includes(term) ||
          t.assignee?.name.toLowerCase().includes(term),
      );
    }

    return result;
  }, [allTasks, sprintTaskIds, search]);

  const handleToggle = (taskId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;
    await onLink(Array.from(selectedIds));
  };

  return (
    <Modal
      variant="form"
      open={open}
      title={`Vincular Tarefas — ${sprint.name}`}
      handleClose={onClose}
      handleConfirm={handleConfirm}
      confirmLabel={`Vincular (${selectedIds.size})`}
      cancelLabel="Cancelar"
      loading={loading}
      width="680px"
      setMaxWidth="680px"
      height="70vh"
      hasCloseButton
    >
      <Stack spacing={2}>
        <TextField
          size="small"
          placeholder="Buscar por título, equipe ou responsável..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          {loading ? (
            <Stack alignItems="center" py={4}>
              <CircularProgress size={28} />
            </Stack>
          ) : availableTasks.length === 0 ? (
            <Stack alignItems="center" py={4}>
              <LinkOffIcon
                sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Nenhuma tarefa disponível para vincular
              </Typography>
            </Stack>
          ) : (
            availableTasks.map((task) => (
              <Paper
                key={task.id}
                elevation={0}
                onClick={() => handleToggle(task.id)}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: selectedIds.has(task.id)
                    ? 'action.selected'
                    : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Checkbox
                  checked={selectedIds.has(task.id)}
                  size="small"
                  sx={{ p: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {task.title}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    mt={0.5}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {task.team && (
                      <Chip
                        label={task.team.name}
                        size="small"
                        sx={{ height: 18, fontSize: '0.6rem' }}
                      />
                    )}
                    {task.assignee && (
                      <Chip
                        label={task.assignee.name}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.6rem' }}
                      />
                    )}
                    {task.sprint && (
                      <Chip
                        label={`Sprint: ${task.sprint.name}`}
                        size="small"
                        variant="outlined"
                        color="info"
                        sx={{ height: 18, fontSize: '0.6rem' }}
                      />
                    )}
                  </Stack>
                </Box>
                <Box
                  sx={{
                    width: 4,
                    height: 28,
                    borderRadius: 1,
                    bgcolor: PRIORITY_COLORS[task.priority] || '#757575',
                    flexShrink: 0,
                  }}
                />
              </Paper>
            ))
          )}
        </Box>

        {selectedIds.size > 0 && (
          <Typography variant="caption" color="primary">
            {selectedIds.size} tarefa(s) selecionada(s) para vincular
          </Typography>
        )}
      </Stack>
    </Modal>
  );
}
