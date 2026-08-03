import { useState, useMemo } from 'react';
import {
  Typography,
  Button,
  Stack,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Groups as GroupsIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { DebouncedSearchInput } from '@renderer/components/DebouncedSearchInput';
import type { Team } from '@shared/interfaces/config/index.types';
import {
  TeamListContainer,
  SearchContainer,
  ListContainer,
  TeamItem,
  EmptyState,
  HeaderContainer,
} from './styles';

export interface TeamListProps {
  teams: Team[];
  selectedTeam: Team | null;
  loading: boolean;
  onSelectTeam: (team: Team) => void;
  onNewTeam: () => void;
  onEditTeam?: (team: Team) => void;
}

export function TeamList({
  teams,
  selectedTeam,
  loading,
  onSelectTeam,
  onNewTeam,
  onEditTeam,
}: TeamListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTeams = useMemo(() => {
    if (!searchTerm.trim()) return teams;

    const search = searchTerm.toLowerCase().trim();
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(search) ||
        (team.description?.toLowerCase().includes(search) ?? false),
    );
  }, [teams, searchTerm]);

  if (loading && teams.length === 0) {
    return (
      <TeamListContainer>
        <HeaderContainer>
          <Skeleton
            variant="text"
            width={80}
            height={28}
            sx={{ borderRadius: 1 }}
          />
          <Skeleton
            variant="rounded"
            width={110}
            height={32}
            sx={{ borderRadius: 1 }}
          />
        </HeaderContainer>
        <SearchContainer>
          <Skeleton variant="rounded" height={40} sx={{ borderRadius: 1 }} />
        </SearchContainer>
        <ListContainer>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={56}
              sx={{ borderRadius: 1.5, mb: 1 }}
            />
          ))}
        </ListContainer>
      </TeamListContainer>
    );
  }

  return (
    <TeamListContainer>
      <HeaderContainer>
        <Typography variant="subtitle1" fontWeight={600}>
          Equipes
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onNewTeam}
          sx={{ borderRadius: '0.5rem' }}
        >
          Nova Equipe
        </Button>
      </HeaderContainer>

      {teams.length > 0 && (
        <SearchContainer>
          <DebouncedSearchInput
            placeholder="Buscar equipe..."
            onSearch={setSearchTerm}
            fullWidth
          />
        </SearchContainer>
      )}

      <ListContainer>
        {filteredTeams.length > 0 ? (
          filteredTeams.map((team) => (
            <TeamItem
              key={team.id}
              selected={selectedTeam?.id === team.id}
              onClick={() => onSelectTeam(team)}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Stack flex={1} minWidth={0}>
                  <Typography variant="subtitle2" fontWeight={500}>
                    {team.name}
                  </Typography>
                  {team.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {team.description}
                    </Typography>
                  )}
                </Stack>
                {onEditTeam && (
                  <Tooltip title="Editar equipe">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTeam(team);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </TeamItem>
          ))
        ) : teams.length > 0 ? (
          <EmptyState>
            <SearchIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Nenhuma equipe encontrada
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tente ajustar o termo de busca
            </Typography>
          </EmptyState>
        ) : (
          <EmptyState>
            <GroupsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Nenhuma equipe cadastrada
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={onNewTeam}
              sx={{ mt: 2 }}
            >
              Criar Equipe
            </Button>
          </EmptyState>
        )}
      </ListContainer>
    </TeamListContainer>
  );
}

export default TeamList;
