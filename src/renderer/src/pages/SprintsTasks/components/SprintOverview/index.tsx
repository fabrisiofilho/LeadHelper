import { useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Chip,
  Paper,
  LinearProgress,
} from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import type { Sprint } from '@shared/interfaces/config/index.types';

interface SprintOverviewProps {
  sprints: Sprint[];
  selectedSprint: Sprint | null;
  onSelectSprint: (sprint: Sprint) => void;
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
    return { label: 'Em Andamento', color: '#2e7d32', bgColor: '#4caf5020' };
  } else if (today < start) {
    return { label: 'Futura', color: '#1976d2', bgColor: '#2196f320' };
  }
  return { label: 'Finalizada', color: '#616161', bgColor: '#9e9e9e20' };
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
}: SprintOverviewProps) {
  const sortedSprints = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...sprints].sort((a, b) => {
      const aStart = new Date(a.startDate);
      aStart.setHours(0, 0, 0, 0);
      const aEnd = new Date(a.endDate);
      aEnd.setHours(0, 0, 0, 0);
      const bStart = new Date(b.startDate);
      bStart.setHours(0, 0, 0, 0);
      const bEnd = new Date(b.endDate);
      bEnd.setHours(0, 0, 0, 0);

      // Check if sprint is current (today is between start and end)
      const aIsCurrent = today >= aStart && today <= aEnd;
      const bIsCurrent = today >= bStart && today <= bEnd;

      // Check if sprint is finished
      const aIsFinished = today > aEnd;
      const bIsFinished = today > bEnd;

      // Current sprint comes first
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;

      // Future sprints come before finished sprints
      if (!aIsFinished && bIsFinished) return -1;
      if (aIsFinished && !bIsFinished) return 1;

      // If both are current or both are not current, sort by proximity to today
      const aDistance = Math.abs(aStart.getTime() - today.getTime());
      const bDistance = Math.abs(bStart.getTime() - today.getTime());

      return aDistance - bDistance;
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
          bgcolor: 'rgba(128,128,128,0.3)',
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
              opacity: status.label === 'Finalizada' && !isSelected ? 0.7 : 1,
              '&:hover': {
                borderColor: isSelected ? 'primary.main' : 'primary.light',
                bgcolor: isSelected ? 'primary.main' : 'action.hover',
                opacity: 1,
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
    </Box>
  );
}

export default SprintOverview;
