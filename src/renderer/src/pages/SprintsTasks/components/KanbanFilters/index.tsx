import { useState } from 'react';
import {
  TextField,
  Stack,
  Chip,
  Autocomplete,
  InputAdornment,
  IconButton,
  Tooltip,
  Collapse,
  Box,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import type { Team, TaskPriority } from '@shared/interfaces/config/index.types';

export interface KanbanFiltersState {
  search: string;
  priorities: TaskPriority[];
  teamId: number | null;
}

export const EMPTY_FILTERS: KanbanFiltersState = {
  search: '',
  priorities: [],
  teamId: null,
};

interface KanbanFiltersProps {
  filters: KanbanFiltersState;
  teams: Team[];
  onChange: (filters: KanbanFiltersState) => void;
}

const PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  color: string;
}[] = [
  { value: 'low', label: 'Baixa', color: '#4caf50' },
  { value: 'medium', label: 'Média', color: '#ff9800' },
  { value: 'high', label: 'Alta', color: '#f44336' },
  { value: 'critical', label: 'Crítica', color: '#9c27b0' },
];

export function KanbanFilters({
  filters,
  teams,
  onChange,
}: KanbanFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters =
    filters.priorities.length > 0 || filters.teamId !== null;

  const activeCount =
    (filters.priorities.length > 0 ? 1 : 0) + (filters.teamId ? 1 : 0);

  const togglePriority = (priority: TaskPriority) => {
    const current = filters.priorities;
    const next = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    onChange({ ...filters, priorities: next });
  };

  const clearAll = () => {
    onChange(EMPTY_FILTERS);
    setExpanded(false);
  };

  return (
    <Stack spacing={1} sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
      {/* Search + filter toggle row */}
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar tarefa..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          sx={{ flex: 1, maxWidth: 360 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              ...(filters.search && {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => onChange({ ...filters, search: '' })}
                      sx={{ p: 0.25 }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }),
            },
          }}
        />

        <Tooltip title={expanded ? 'Ocultar filtros' : 'Mais filtros'}>
          <IconButton
            size="small"
            onClick={() => setExpanded((v) => !v)}
            color={hasActiveFilters ? 'primary' : 'default'}
          >
            <FilterListIcon fontSize="small" />
            {activeCount > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                {activeCount}
              </Box>
            )}
          </IconButton>
        </Tooltip>

        {hasActiveFilters && (
          <Tooltip title="Limpar filtros">
            <Chip
              label="Limpar"
              size="small"
              onDelete={clearAll}
              sx={{ height: 26, fontSize: '0.75rem' }}
            />
          </Tooltip>
        )}
      </Stack>

      {/* Expandable filter row */}
      <Collapse in={expanded}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ pb: 1 }}>
          {/* Priority chips */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {PRIORITY_OPTIONS.map((opt) => {
              const selected = filters.priorities.includes(opt.value);
              return (
                <Chip
                  key={opt.value}
                  icon={
                    <DotIcon
                      sx={{
                        fontSize: '10px !important',
                        color: `${opt.color} !important`,
                      }}
                    />
                  }
                  label={opt.label}
                  size="small"
                  variant={selected ? 'filled' : 'outlined'}
                  onClick={() => togglePriority(opt.value)}
                  sx={{
                    height: 26,
                    fontSize: '0.75rem',
                    ...(selected && {
                      backgroundColor: opt.color + '20',
                      color: opt.color,
                      borderColor: opt.color,
                    }),
                    '& .MuiChip-icon': { ml: '4px' },
                  }}
                />
              );
            })}
          </Stack>

          {/* Team filter */}
          {teams.length > 0 && (
            <Autocomplete
              size="small"
              options={teams}
              getOptionLabel={(t) => t.name}
              value={teams.find((t) => t.id === filters.teamId) ?? null}
              onChange={(_, v) =>
                onChange({ ...filters, teamId: v?.id ?? null })
              }
              sx={{ minWidth: 200 }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Equipe..." />
              )}
            />
          )}
        </Stack>
      </Collapse>
    </Stack>
  );
}

export default KanbanFilters;
