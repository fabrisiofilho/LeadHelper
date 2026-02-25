import { useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Chip,
  Paper,
  Tooltip,
  Badge,
} from '@mui/material';
import { Groups as GroupsIcon, Add as AddIcon } from '@mui/icons-material';
import type { Team, Task } from '@shared/interfaces/config/index.types';

interface TeamOverviewProps {
  teams: Team[];
  tasks: Task[];
  selectedTeam: Team | null;
  onSelectTeam: (team: Team | null) => void;
}

export function TeamOverview({
  teams,
  tasks,
  selectedTeam,
  onSelectTeam,
}: TeamOverviewProps) {
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const taskCountByTeam = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const task of tasks) {
      if (task.teamId) {
        counts[task.teamId] = (counts[task.teamId] || 0) + 1;
      }
    }
    return counts;
  }, [tasks]);

  const unassignedCount = useMemo(() => {
    return tasks.filter((t) => !t.teamId).length;
  }, [tasks]);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        overflowX: 'auto',
        pb: 1,
        flexShrink: 0,
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': {
          borderRadius: 2,
          bgcolor: 'rgba(0,0,0,0.1)',
        },
      }}
    >
      {/* Card "Todas" */}
      <Paper
        elevation={selectedTeam === null ? 3 : 0}
        onClick={() => onSelectTeam(null)}
        sx={{
          p: 1.5,
          minWidth: 140,
          maxWidth: 200,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: selectedTeam === null ? 'primary.main' : 'divider',
          bgcolor: selectedTeam === null ? 'primary.main' : 'background.paper',
          borderRadius: 2,
          transition: 'all 0.2s',
          flexShrink: 0,
          '&:hover': {
            borderColor:
              selectedTeam === null ? 'primary.main' : 'primary.light',
            bgcolor: selectedTeam === null ? 'primary.main' : 'action.hover',
          },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
          <GroupsIcon
            fontSize="small"
            sx={{ color: selectedTeam === null ? '#fff' : 'text.secondary' }}
          />
          <Typography
            variant="subtitle2"
            fontWeight={600}
            noWrap
            sx={{
              flex: 1,
              color: selectedTeam === null ? '#fff' : 'text.primary',
            }}
          >
            Todas
          </Typography>
        </Stack>
        <Chip
          label={`${tasks.length} tarefas`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.65rem',
            fontWeight: 600,
            bgcolor:
              selectedTeam === null
                ? 'rgba(255,255,255,0.25)'
                : 'action.selected',
            color: selectedTeam === null ? '#fff' : 'text.secondary',
          }}
        />
      </Paper>

      {sortedTeams.map((team) => {
        const isSelected = selectedTeam?.id === team.id;
        const count = taskCountByTeam[team.id] || 0;

        return (
          <Paper
            key={team.id}
            elevation={isSelected ? 3 : 0}
            onClick={() => onSelectTeam(team)}
            sx={{
              p: 1.5,
              minWidth: 160,
              maxWidth: 220,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: isSelected
                ? team.color || 'primary.main'
                : 'divider',
              bgcolor: isSelected
                ? team.color || 'primary.main'
                : 'background.paper',
              borderRadius: 2,
              transition: 'all 0.2s',
              flexShrink: 0,
              '&:hover': {
                borderColor: isSelected
                  ? team.color || 'primary.main'
                  : 'primary.light',
                bgcolor: isSelected
                  ? team.color || 'primary.main'
                  : 'action.hover',
              },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: isSelected ? '#fff' : team.color || 'primary.main',
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="subtitle2"
                fontWeight={600}
                noWrap
                sx={{ flex: 1, color: isSelected ? '#fff' : 'text.primary' }}
              >
                {team.name}
              </Typography>
            </Stack>
            <Chip
              label={`${count} tarefas`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: isSelected
                  ? 'rgba(255,255,255,0.25)'
                  : 'action.selected',
                color: isSelected ? '#fff' : 'text.secondary',
              }}
            />
          </Paper>
        );
      })}

      {/* Card sem equipe */}
      {unassignedCount > 0 && (
        <Tooltip title="Tarefas sem equipe atribuída">
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              minWidth: 140,
              borderStyle: 'dashed',
              borderColor: 'warning.main',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: 0.8,
            }}
          >
            <Typography variant="caption" color="warning.main" fontWeight={600}>
              Sem equipe
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {unassignedCount} tarefas
            </Typography>
          </Paper>
        </Tooltip>
      )}
    </Box>
  );
}
