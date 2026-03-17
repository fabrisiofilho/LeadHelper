import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
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
import { addMonths } from 'date-fns';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useAllocations } from '@renderer/hooks/useAllocations';
import { useTeams } from '@renderer/hooks/useTeams';
import { GanttChart } from '@renderer/components/GanttChart';
import type {
  GanttItem,
  GanttFilters,
} from '@shared/interfaces/config/index.types';

const DEFAULT_END_DATE = new Date(2099, 11, 31); // 31/12/2099

const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export function GanttTab() {
  const { ganttData, loading, error, getGanttData, clearError } =
    useAllocations();
  const { teams, findAll: findAllTeams } = useTeams();

  const [startDate, setStartDate] = useState<Date | null>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [endDate, setEndDate] = useState<Date | null>(() =>
    addMonths(new Date(), 3),
  );
  const [teamFilter, setTeamFilter] = useState<number | ''>('');

  const [selectedItem, setSelectedItem] = useState<GanttItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    findAllTeams();
  }, [findAllTeams]);

  const loadGanttData = useCallback(async () => {
    if (!startDate || !endDate) return;
    const filters: GanttFilters = {
      groupBy: 'team_member',
      startDate,
      endDate,
      teamId: teamFilter || undefined,
    };
    await getGanttData(filters);
  }, [startDate, endDate, teamFilter, getGanttData]);

  useEffect(() => {
    loadGanttData();
  }, [loadGanttData]);

  // Treat allocations without endDate: replace with 31/12/2099
  const processedGanttData = useMemo(() => {
    if (!ganttData) return null;
    return {
      ...ganttData,
      items: ganttData.items.map((item) => ({
        ...item,
        end: item.end ? new Date(item.end) : DEFAULT_END_DATE,
      })),
    };
  }, [ganttData]);

  const handleRefresh = async () => {
    clearError();
    await loadGanttData();
  };

  const handleItemClick = (item: GanttItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedItem(null);
  };

  const isDateRangeValid = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate <= endDate;
  }, [startDate, endDate]);

  if (loading && !ganttData) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="40vh">
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary" mt={2}>
          Carregando dados do Gantt...
        </Typography>
      </Stack>
    );
  }

  if (error && !ganttData) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="40vh">
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
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ p: 2 }}>
        {/* Filters */}
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
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
              select: { displayEmpty: true },
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
          <Tooltip title="Atualizar">
            <IconButton onClick={handleRefresh} size="small" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Period info */}
        {startDate && endDate && isDateRangeValid && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            Exibindo alocações de {formatDateDisplay(startDate)} até{' '}
            {formatDateDisplay(endDate)}
          </Typography>
        )}

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
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <GanttChart
              data={processedGanttData}
              onItemClick={handleItemClick}
              cellWidth={40}
            />
          </Box>
        ) : (
          <Stack alignItems="center" justifyContent="center" py={6}>
            <WarningIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Período inválido
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A data de início deve ser anterior ou igual à data de fim.
            </Typography>
          </Stack>
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
                      {new Date(selectedItem.end).getFullYear() === 2099
                        ? 'Indeterminado'
                        : formatDateDisplay(new Date(selectedItem.end))}
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
      </Box>
    </LocalizationProvider>
  );
}

export default GanttTab;
