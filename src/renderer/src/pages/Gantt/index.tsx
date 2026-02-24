import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from 'date-fns';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Assignment as TaskIcon,
  DateRange as DateRangeIcon,
  ViewWeek as WeekIcon,
  CalendarViewMonth as MonthIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAllocations } from '@renderer/hooks/useAllocations';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTeams } from '@renderer/hooks/useTeams';
import { GanttChart } from '@renderer/components/GanttChart';
import {
  PageContainer,
  PlaceholderContent,
  FiltersContainer,
  GanttWrapper,
  QuickNavContainer,
} from './styles';
import type {
  GanttItem,
  GanttFilters,
} from '@shared/interfaces/config/index.types';

/**
 * Gantt Chart visualization page
 * Displays team allocations in a timeline view with filters and navigation
 *
 * Requirements: 4.4, 4.8
 * - 4.4: Filtrar o período de visualização (data início e data fim)
 * - 4.8: Navegação por semana, mês ou trimestre
 */

type GroupByType = 'member' | 'task';

/**
 * Get the start and end of the current week (Monday to Sunday)
 */
const getThisWeek = (): { start: Date; end: Date } => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Get the start and end of the current month
 */
const getThisMonth = (): { start: Date; end: Date } => {
  const now = new Date();
  return { start: startOfMonth(now), end: endOfMonth(now) };
};

/**
 * Get the start and end of the current quarter
 */
const getThisQuarter = (): { start: Date; end: Date } => {
  const now = new Date();
  return { start: startOfQuarter(now), end: endOfQuarter(now) };
};

/**
 * Get the next 3 months from today
 */
const getNext3Months = (): { start: Date; end: Date } => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return { start: now, end: addMonths(now, 3) };
};

/**
 * Get the next 6 months from today
 */
const getNext6Months = (): { start: Date; end: Date } => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return { start: now, end: addMonths(now, 6) };
};

/**
 * Get the current year
 */
const getThisYear = (): { start: Date; end: Date } => {
  const now = new Date();
  return { start: startOfYear(now), end: endOfYear(now) };
};

/**
 * Format date for display
 */
const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export function GanttPage() {
  const { ganttData, loading, error, getGanttData, clearError } =
    useAllocations();
  const { sprints, findAll: findAllSprints } = useSprints();
  const { teams, findAll: findAllTeams } = useTeams();

  // Filter state - default to next 3 months starting from today
  const [groupBy, setGroupBy] = useState<GroupByType>('member');
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [endDate, setEndDate] = useState<Date | null>(() =>
    addMonths(new Date(), 3),
  );
  const [teamFilter, setTeamFilter] = useState<number | ''>('');
  const [sprintFilter, setSprintFilter] = useState<number | ''>('');

  // Detail dialog state
  const [selectedItem, setSelectedItem] = useState<GanttItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Load sprints and teams
  useEffect(() => {
    findAllSprints();
    findAllTeams();
  }, [findAllSprints, findAllTeams]);

  // Load Gantt data
  const loadGanttData = useCallback(async () => {
    if (!startDate || !endDate) return;

    const filters: GanttFilters = {
      groupBy: groupBy === 'member' ? 'team_member' : 'task',
      startDate,
      endDate,
      teamId: teamFilter || undefined,
      sprintId: sprintFilter || undefined,
    };

    await getGanttData(filters);
  }, [startDate, endDate, groupBy, teamFilter, sprintFilter, getGanttData]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadGanttData();
  }, [loadGanttData]);

  // Handle group by change
  const handleGroupByChange = (
    _event: React.MouseEvent<HTMLElement>,
    newGroupBy: GroupByType | null,
  ) => {
    if (newGroupBy !== null) {
      setGroupBy(newGroupBy);
    }
  };

  // Handle quick navigation
  const handleThisWeek = () => {
    const { start, end } = getThisWeek();
    setStartDate(start);
    setEndDate(end);
  };

  const handleThisMonth = () => {
    const { start, end } = getThisMonth();
    setStartDate(start);
    setEndDate(end);
  };

  const handleThisQuarter = () => {
    const { start, end } = getThisQuarter();
    setStartDate(start);
    setEndDate(end);
  };

  const handleNext3Months = () => {
    const { start, end } = getNext3Months();
    setStartDate(start);
    setEndDate(end);
  };

  const handleNext6Months = () => {
    const { start, end } = getNext6Months();
    setStartDate(start);
    setEndDate(end);
  };

  const handleThisYear = () => {
    const { start, end } = getThisYear();
    setStartDate(start);
    setEndDate(end);
  };

  // Handle refresh
  const handleRefresh = async () => {
    clearError();
    await loadGanttData();
  };

  // Handle item click
  const handleItemClick = (item: GanttItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  // Handle close detail dialog
  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedItem(null);
  };

  // Validate date range
  const isDateRangeValid = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate <= endDate;
  }, [startDate, endDate]);

  // Loading state
  if (loading && !ganttData) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando dados do Gantt...
          </Typography>
        </Stack>
      </PageContainer>
    );
  }

  // Error state
  if (error && !ganttData) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ mt: 2 }}
          >
            Tentar Novamente
          </Button>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <PageContainer>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Gráfico de Gantt
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Visualize as alocações da equipe ao longo do tempo
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Tooltip title="Atualizar">
              <IconButton
                onClick={handleRefresh}
                size="small"
                disabled={loading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <ToggleButtonGroup
              value={groupBy}
              exclusive
              onChange={handleGroupByChange}
              size="small"
            >
              <ToggleButton value="member">
                <Tooltip title="Agrupar por Membro">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PersonIcon fontSize="small" />
                    <Typography variant="body2">Por Membro</Typography>
                  </Stack>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="task">
                <Tooltip title="Agrupar por Tarefa">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <TaskIcon fontSize="small" />
                    <Typography variant="body2">Por Tarefa</Typography>
                  </Stack>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {/* Filters */}
        <FiltersContainer>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <CalendarIcon color="action" />
            <DatePicker
              label="Data Início"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { minWidth: 160 },
                  error: !isDateRangeValid && !!startDate && !!endDate,
                  slotProps: { inputLabel: { shrink: true } },
                },
              }}
            />
            <DatePicker
              label="Data Fim"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              minDate={startDate || undefined}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { minWidth: 160 },
                  error: !isDateRangeValid && !!startDate && !!endDate,
                  slotProps: { inputLabel: { shrink: true } },
                },
              }}
            />
            <TextField
              select
              size="small"
              label="Equipe"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value as number | '')}
              sx={{ minWidth: 150 }}
              slotProps={{
                select: {
                  displayEmpty: true,
                },
                inputLabel: { shrink: true },
              }}
            >
              <MenuItem value="">Todas</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Sprint"
              value={sprintFilter}
              onChange={(e) => setSprintFilter(e.target.value as number | '')}
              sx={{ minWidth: 150 }}
              slotProps={{
                select: {
                  displayEmpty: true,
                },
                inputLabel: { shrink: true },
              }}
            >
              <MenuItem value="">Todas</MenuItem>
              {sprints.map((sprint) => (
                <MenuItem key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <QuickNavContainer>
            <Button
              variant="outlined"
              size="small"
              startIcon={<WeekIcon />}
              onClick={handleThisWeek}
            >
              Semana
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<MonthIcon />}
              onClick={handleThisMonth}
            >
              Mês
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DateRangeIcon />}
              onClick={handleThisQuarter}
            >
              Trimestre
            </Button>
            <Button variant="outlined" size="small" onClick={handleNext3Months}>
              3 Meses
            </Button>
            <Button variant="outlined" size="small" onClick={handleNext6Months}>
              6 Meses
            </Button>
            <Button variant="outlined" size="small" onClick={handleThisYear}>
              Ano
            </Button>
          </QuickNavContainer>
        </FiltersContainer>

        {/* Period info */}
        {startDate && endDate && isDateRangeValid && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            Exibindo alocações de {formatDateDisplay(startDate)} até{' '}
            {formatDateDisplay(endDate)}
          </Typography>
        )}

        {/* Loading overlay */}
        {loading && ganttData && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary" ml={1}>
              Atualizando...
            </Typography>
          </Box>
        )}

        {/* Gantt Chart */}
        {isDateRangeValid ? (
          <GanttWrapper>
            <GanttChart
              data={ganttData}
              groupBy={groupBy}
              onItemClick={handleItemClick}
              cellWidth={40}
            />
          </GanttWrapper>
        ) : (
          <PlaceholderContent>
            <WarningIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Período inválido
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A data de início deve ser anterior ou igual à data de fim.
            </Typography>
          </PlaceholderContent>
        )}

        {/* Detail Dialog */}
        <Dialog
          open={isDetailOpen}
          onClose={handleCloseDetail}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Detalhes da Alocação</DialogTitle>
          <DialogContent>
            {selectedItem && (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tarefa
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedItem.taskTitle || selectedItem.name}
                  </Typography>
                </Box>
                {selectedItem.teamMemberName && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Membro
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedItem.teamMemberName}
                    </Typography>
                  </Box>
                )}
                <Stack direction="row" spacing={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Data Início
                    </Typography>
                    <Typography variant="body1">
                      {formatDateDisplay(new Date(selectedItem.start))}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Data Fim
                    </Typography>
                    <Typography variant="body1">
                      {formatDateDisplay(new Date(selectedItem.end))}
                    </Typography>
                  </Box>
                </Stack>
                {selectedItem.sprintName && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Sprint
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {selectedItem.sprintName}
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetail}>Fechar</Button>
          </DialogActions>
        </Dialog>
      </PageContainer>
    </LocalizationProvider>
  );
}

export default GanttPage;
