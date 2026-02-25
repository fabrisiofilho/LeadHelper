import { useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Chip,
  Paper,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import type { Sprint } from '@shared/interfaces/config/index.types';

interface SprintOverviewProps {
  sprints: Sprint[];
  selectedSprint: Sprint | null;
  onSelectSprint: (sprint: Sprint) => void;
  onNewSprint: () => void;
  onEditSprint: (sprint: Sprint) => void;
}

type SprintStatus = {
  label: string;
  color: string;
  bgColor: string;
};

const getSprintStatus = (sprint: Sprint): SprintStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(sprint.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate);
  end.setHours(0, 0, 0, 0);

  if (today >= start && today <= end) {
    return { label: 'Em Andamento', color: '#2e7d32', bgColor: '#e8f5e9' };
  } else if (today < start) {
    return { label: 'Futura', color: '#1565c0', bgColor: '#e3f2fd' };
  }
  return { label: 'Finalizada', color: '#757575', bgColor: '#f5f5f5' };
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const getSprintProgress = (sprint: Sprint): number => {
  const start = new Date(sprint.startDate).getTime();
  const end = new Date(sprint.endDate).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
};

export function SprintOverview({
  sprints,
  selectedSprint,
  onSelectSprint,
  onNewSprint,
  onEditSprint,
}: SprintOverviewProps) {
  const sortedSprints = useMemo(() => {
    return [...sprints].sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  }, [sprints]);

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
      {sortedSprints.map((sprint) => {
        const isSelected = selectedSprint?.id === sprint.id;
        const status = getSprintStatus(sprint);
        const progress = getSprintProgress(sprint);

        return (
          <Paper
            key={sprint.id}
            elevation={isSelected ? 3 : 0}
            onClick={() => onSelectSprint(sprint)}
            sx={{
              p: 1.5,
              minWidth: 200,
              maxWidth: 260,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: isSelected ? 'primary.main' : 'divider',
              bgcolor: isSelected ? 'primary.main' : 'background.paper',
              borderRadius: 2,
              transition: 'all 0.2s',
              flexShrink: 0,
              '&:hover': {
                borderColor: isSelected ? 'primary.main' : 'primary.light',
                bgcolor: isSelected ? 'primary.main' : 'action.hover',
              },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
              <CalendarIcon
                fontSize="small"
                sx={{ color: isSelected ? '#fff' : 'text.secondary' }}
              />
              <Typography
                variant="subtitle2"
                fontWeight={600}
                noWrap
                sx={{
                  flex: 1,
                  color: isSelected ? '#fff' : 'text.primary',
                }}
              >
                {sprint.name}
              </Typography>
              {isSelected && (
                <Tooltip title="Editar sprint">
                  <Box
                    component="span"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSprint(sprint);
                    }}
                    sx={{
                      display: 'flex',
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.8 },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 16, color: '#fff' }} />
                  </Box>
                </Tooltip>
              )}
            </Stack>

            <Typography
              variant="caption"
              sx={{
                color: isSelected ? 'rgba(255,255,255,0.85)' : 'text.secondary',
                display: 'block',
                mb: 0.75,
              }}
            >
              {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                label={status.label}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: isSelected
                    ? 'rgba(255,255,255,0.25)'
                    : status.bgColor,
                  color: isSelected ? '#fff' : status.color,
                }}
              />
              {status.label === 'Em Andamento' && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  sx={{ flex: 1 }}
                >
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      bgcolor: isSelected
                        ? 'rgba(255,255,255,0.2)'
                        : 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 2,
                        bgcolor: isSelected ? '#fff' : undefined,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{
                      color: isSelected ? '#fff' : 'text.secondary',
                      fontSize: '0.6rem',
                    }}
                  >
                    {progress}%
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Paper>
        );
      })}

      {/* Add new sprint card */}
      <Paper
        variant="outlined"
        onClick={onNewSprint}
        sx={{
          p: 1.5,
          minWidth: 120,
          cursor: 'pointer',
          borderStyle: 'dashed',
          borderColor: 'divider',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <AddIcon sx={{ color: 'text.secondary', mb: 0.5 }} />
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          Nova Sprint
        </Typography>
      </Paper>
    </Box>
  );
}

export default SprintOverview;
