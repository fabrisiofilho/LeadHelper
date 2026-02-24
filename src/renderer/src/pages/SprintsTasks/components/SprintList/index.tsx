import { useState, useMemo } from 'react';
import {
  Typography,
  Button,
  TextField,
  InputAdornment,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Speed as SpeedIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import type { Sprint } from '@shared/interfaces/config/index.types';
import {
  SprintListContainer,
  SearchContainer,
  ListContainer,
  SprintItem,
  EmptyState,
  HeaderContainer,
} from './styles';

export interface SprintListProps {
  sprints: Sprint[];
  selectedSprint: Sprint | null;
  loading: boolean;
  onSelectSprint: (sprint: Sprint) => void;
  onNewSprint: () => void;
  onEditSprint?: (sprint: Sprint) => void;
}

type SprintStatus = {
  label: string;
  color: 'success' | 'primary' | 'default';
};

const getSprintStatus = (sprint: Sprint): SprintStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(sprint.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate);
  end.setHours(0, 0, 0, 0);

  if (today >= start && today <= end) {
    return { label: 'Em Andamento', color: 'success' };
  } else if (today < start) {
    return { label: 'Futura', color: 'primary' };
  } else {
    return { label: 'Finalizada', color: 'default' };
  }
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
};

export function SprintList({
  sprints,
  selectedSprint,
  loading,
  onSelectSprint,
  onNewSprint,
  onEditSprint,
}: SprintListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSprints = useMemo(() => {
    if (!searchTerm.trim()) return sprints;

    const search = searchTerm.toLowerCase().trim();
    return sprints.filter(
      (sprint) =>
        sprint.name.toLowerCase().includes(search) ||
        (sprint.description?.toLowerCase().includes(search) ?? false),
    );
  }, [sprints, searchTerm]);

  if (loading && sprints.length === 0) {
    return (
      <SprintListContainer>
        <HeaderContainer>
          <Typography variant="subtitle1" fontWeight={600}>
            Sprints
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onNewSprint}
            sx={{ borderRadius: '0.5rem' }}
          >
            Nova Sprint
          </Button>
        </HeaderContainer>
        <Stack alignItems="center" justifyContent="center" flex={1}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary" mt={2}>
            Carregando sprints...
          </Typography>
        </Stack>
      </SprintListContainer>
    );
  }

  return (
    <SprintListContainer>
      <HeaderContainer>
        <Typography variant="subtitle1" fontWeight={600}>
          Sprints
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onNewSprint}
          sx={{ borderRadius: '0.5rem' }}
        >
          Nova Sprint
        </Button>
      </HeaderContainer>

      {sprints.length > 0 && (
        <SearchContainer>
          <TextField
            size="small"
            placeholder="Buscar sprint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
        </SearchContainer>
      )}

      <ListContainer>
        {filteredSprints.length > 0 ? (
          filteredSprints.map((sprint) => {
            const status = getSprintStatus(sprint);
            return (
              <SprintItem
                key={sprint.id}
                selected={selectedSprint?.id === sprint.id}
                onClick={() => onSelectSprint(sprint)}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Stack flex={1} minWidth={0}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mb={0.5}
                    >
                      <Typography variant="subtitle2" fontWeight={500}>
                        {sprint.name}
                      </Typography>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(sprint.startDate)} -{' '}
                      {formatDate(sprint.endDate)}
                    </Typography>
                    {sprint.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ mt: 0.5 }}
                      >
                        {sprint.description}
                      </Typography>
                    )}
                  </Stack>
                  {onEditSprint && (
                    <Tooltip title="Editar sprint">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSprint(sprint);
                        }}
                        sx={{ ml: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </SprintItem>
            );
          })
        ) : sprints.length > 0 ? (
          <EmptyState>
            <SearchIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Nenhuma sprint encontrada
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tente ajustar o termo de busca
            </Typography>
          </EmptyState>
        ) : (
          <EmptyState>
            <SpeedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Nenhuma sprint cadastrada
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={onNewSprint}
              sx={{ mt: 2 }}
            >
              Criar Sprint
            </Button>
          </EmptyState>
        )}
      </ListContainer>
    </SprintListContainer>
  );
}

export default SprintList;
