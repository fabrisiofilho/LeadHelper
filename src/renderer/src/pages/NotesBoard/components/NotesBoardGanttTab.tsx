import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  MenuItem,
  TextField,
  Paper,
  Divider,
  Avatar,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import {
  addMonths,
  differenceInCalendarDays,
  differenceInMinutes,
} from 'date-fns';
import {
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon,
  EventBusy as EmptyIcon,
  CheckCircle as DoneIcon,
  Person as PersonIcon,
  Groups as TeamIcon,
  Work as PositionIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  Notes as NotesIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { GanttChart } from '@renderer/components/GanttChart';
import { DebouncedSearchInput } from '@renderer/components/DebouncedSearchInput';
import { Skeleton } from '@mui/material';
import type {
  NoteGanttItem,
  NoteGanttFilters,
  GanttData,
  GanttItem,
  TeamMember,
  NoteLink,
} from '@shared/interfaces/config/index.types';

interface NotesBoardGanttTabProps {
  members: TeamMember[];
}

const formatDateDisplay = (date: Date): string =>
  date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatDateTime = (dateStr: string, allDay: boolean): string => {
  const d = new Date(dateStr);
  if (allDay) return d.toLocaleDateString('pt-BR');
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

/** Human-readable duration between start and end */
function formatDuration(start: Date, end: Date, allDay: boolean): string {
  if (allDay) {
    const days = differenceInCalendarDays(end, start) + 1;
    return days === 1 ? '1 dia' : `${days} dias`;
  }
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const ENTITY_COLORS: Record<
  string,
  'primary' | 'secondary' | 'success' | 'warning'
> = {
  team_member: 'primary',
  team: 'secondary',
  position: 'success',
  task: 'warning',
};
const ENTITY_LABELS: Record<string, string> = {
  team_member: 'Membro',
  team: 'Equipe',
  position: 'Cargo',
  task: 'Task',
};
const ENTITY_ICONS: Record<string, React.ReactNode> = {
  team_member: <PersonIcon sx={{ fontSize: 13 }} />,
  team: <TeamIcon sx={{ fontSize: 13 }} />,
  position: <PositionIcon sx={{ fontSize: 13 }} />,
  task: <TaskIcon sx={{ fontSize: 13 }} />,
};

function DateModeLabel({ mode }: { mode?: string }) {
  if (!mode || mode === 'none') return null;
  return (
    <Chip
      label={mode === 'single' ? 'Data única' : 'Período'}
      size="small"
      variant="outlined"
      color={mode === 'period' ? 'primary' : 'default'}
      sx={{ height: 20, fontSize: '0.7rem' }}
    />
  );
}

const AZURE_BASE =
  'https://dev.azure.com/senaisc-solucoes-digitais/Tribo%20SEIF/_workitems/edit/';

async function openTaskInAzure(entityId: number): Promise<void> {
  try {
    const res = await window.electronAPI.task.findById(entityId);
    if (res.success && res.data?.externalId) {
      window.electronAPI.openExternalUrl(
        `${AZURE_BASE}${res.data.externalId}/`,
      );
    }
  } catch {
    /* silent */
  }
}

function LinkSection({ links }: { links: NoteLink[] }) {
  if (links.length === 0) return null;

  // Group by type
  const grouped = links.reduce<Record<string, NoteLink[]>>((acc, l) => {
    if (!acc[l.entityType]) acc[l.entityType] = [];
    acc[l.entityType].push(l);
    return acc;
  }, {});

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
        <NotesIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          Vínculos
        </Typography>
      </Stack>
      <Stack spacing={0.75}>
        {Object.entries(grouped).map(([type, items]) => (
          <Box key={type}>
            <Stack direction="row" alignItems="center" spacing={0.4} mb={0.4}>
              <Box sx={{ color: 'text.disabled', display: 'flex' }}>
                {ENTITY_ICONS[type]}
              </Box>
              <Typography
                variant="caption"
                color="text.disabled"
                fontWeight={600}
              >
                {ENTITY_LABELS[type] ?? type}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {items.map((l) =>
                type === 'task' ? (
                  <Tooltip key={l.id} title="Abrir no Azure DevOps">
                    <Chip
                      label={l.entityName ?? `#${l.entityId}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                      icon={
                        <OpenInNewIcon sx={{ fontSize: '14px !important' }} />
                      }
                      onClick={() => openTaskInAzure(l.entityId)}
                      sx={{ cursor: 'pointer', maxWidth: 260 }}
                    />
                  </Tooltip>
                ) : (
                  <Chip
                    key={l.id}
                    label={l.entityName ?? `#${l.entityId}`}
                    size="small"
                    color={ENTITY_COLORS[type] ?? 'default'}
                    variant="outlined"
                    sx={{ maxWidth: 260 }}
                  />
                ),
              )}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ── NoteDetailDialog ──────────────────────────────────────────────────────────

function NoteDetailDialog({
  item,
  open,
  onClose,
}: {
  item: NoteGanttItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!item) return null;

  const start = new Date(item.start);
  const end = new Date(item.end);
  const duration = formatDuration(start, end, item.allDay);
  const isCompleted = !!item.completedAt;
  const isPast = end < new Date() && !isCompleted;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {/* Colored header strip */}
      <Box
        sx={{ height: 4, bgcolor: isCompleted ? 'success.main' : item.color }}
      />

      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ wordBreak: 'break-word' }}
            >
              {item.noteTitle}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              mt={0.5}
              flexWrap="wrap"
              useFlexGap
            >
              <DateModeLabel mode={item.dateMode} />
              {isCompleted && (
                <Chip
                  icon={<DoneIcon sx={{ fontSize: '14px !important' }} />}
                  label="Concluída"
                  color="success"
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              {isPast && !isCompleted && (
                <Chip
                  label="Vencida"
                  color="error"
                  size="small"
                  variant="filled"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2}>
          {/* Member */}
          {item.memberName && (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: '0.8rem',
                }}
              >
                {item.memberName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </Avatar>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Membro alocado
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {item.memberName}
                </Typography>
              </Box>
            </Stack>
          )}

          <Divider />

          {/* Date info */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
              <ScheduleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                Período
              </Typography>
            </Stack>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              <Box>
                <Typography
                  variant="caption"
                  color="text.disabled"
                  display="block"
                >
                  {item.dateMode === 'single' ? 'Data' : 'Início'}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatDateTime(item.start.toString(), item.allDay)}
                </Typography>
              </Box>
              {item.dateMode !== 'single' && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    display="block"
                  >
                    Fim
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDateTime(item.end.toString(), item.allDay)}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography
                  variant="caption"
                  color="text.disabled"
                  display="block"
                >
                  Duração
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {duration}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.disabled"
                  display="block"
                >
                  Horário
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {item.allDay ? 'Dia inteiro' : 'Com horário'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Body preview */}
          {item.noteBody ? (
            <>
              <Divider />
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  mb={0.75}
                >
                  <NotesIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    Descrição
                  </Typography>
                </Stack>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.noteBody}
                  </Typography>
                </Paper>
              </Box>
            </>
          ) : (
            <>
              <Divider />
              <Typography
                variant="body2"
                color="text.disabled"
                fontStyle="italic"
              >
                Sem descrição
              </Typography>
            </>
          )}

          {/* Links */}
          {item.links.length > 0 && (
            <>
              <Divider />
              <LinkSection links={item.links} />
            </>
          )}

          {/* Completed info */}
          {isCompleted && item.completedAt && (
            <>
              <Divider />
              <Alert severity="success" variant="outlined" sx={{ py: 0.5 }}>
                <Typography variant="caption">
                  Concluída em{' '}
                  <strong>
                    {new Date(item.completedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                </Typography>
              </Alert>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Map NoteGanttItem[] → GanttData so we can reuse the existing GanttChart */
function mapToGanttData(
  items: NoteGanttItem[],
  rangeStart: Date,
  rangeEnd: Date,
): GanttData {
  const ganttItems: GanttItem[] = items.map((item) => ({
    id: `note-${item.noteId}-${item.memberId ?? 'none'}`,
    name: item.noteTitle,
    start: new Date(item.start),
    end: new Date(item.end),
    progress: item.completedAt ? 100 : 0,
    color: item.color,
    teamMemberId: item.memberId ?? undefined,
    teamMemberName: item.memberName ?? 'Sem membro',
    allocationId: item.noteId,
    notes: item.links
      .map((l) => l.entityName)
      .filter(Boolean)
      .join(', '),
  }));

  return {
    items: ganttItems,
    startDate: rangeStart,
    endDate: rangeEnd,
  };
}

export function NotesBoardGanttTab({ members }: NotesBoardGanttTabProps) {
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | null>(() =>
    addMonths(new Date(), 3),
  );
  const [memberFilter, setMemberFilter] = useState<number | ''>('');
  const [search, setSearch] = useState('');

  const [ganttItems, setGanttItems] = useState<NoteGanttItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedItem, setSelectedItem] = useState<NoteGanttItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const isDateRangeValid = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate <= endDate;
  }, [startDate, endDate]);

  const loadGanttData = useCallback(async () => {
    if (!startDate || !endDate || !isDateRangeValid) return;
    setLoading(true);
    try {
      const filters: NoteGanttFilters = {
        startDate,
        endDate,
        memberIds: memberFilter ? [memberFilter as number] : undefined,
        search: search.trim() || undefined,
      };
      const response = await window.electronAPI.noteCard.findForGantt(filters);
      if (response.success && response.data) {
        setGanttItems(response.data);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, memberFilter, search, isDateRangeValid]);

  useEffect(() => {
    loadGanttData();
  }, [loadGanttData]);

  const ganttData = useMemo(() => {
    if (!startDate || !endDate || ganttItems.length === 0) return null;
    return mapToGanttData(ganttItems, startDate, endDate);
  }, [ganttItems, startDate, endDate]);

  const handleBarClick = (item: GanttItem) => {
    const noteId = item.allocationId;
    const match = ganttItems.find(
      (gi) =>
        gi.noteId === noteId &&
        (gi.memberId?.toString() ?? 'none') ===
          (item.teamMemberId?.toString() ?? 'none'),
    );
    if (match) {
      setSelectedItem(match);
      setDetailOpen(true);
    }
  };

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
            label="Início"
            value={startDate}
            onChange={setStartDate}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
                error: !isDateRangeValid && !!startDate && !!endDate,
                slotProps: { inputLabel: { shrink: true } },
              },
            }}
          />

          <DatePicker
            label="Fim"
            value={endDate}
            onChange={setEndDate}
            minDate={startDate || undefined}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
                error: !isDateRangeValid && !!startDate && !!endDate,
                slotProps: { inputLabel: { shrink: true } },
              },
            }}
          />

          <TextField
            select
            size="small"
            label="Membro"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value as number | '')}
            sx={{ minWidth: 180 }}
            slotProps={{
              select: { displayEmpty: true },
              inputLabel: { shrink: true },
            }}
          >
            <MenuItem value="">Todos</MenuItem>
            {members
              .filter((m) => m.isActive)
              .map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
          </TextField>

          <DebouncedSearchInput
            placeholder="Buscar por título..."
            onSearch={setSearch}
            sx={{ minWidth: 200 }}
          />

          <Tooltip title="Atualizar">
            <IconButton onClick={loadGanttData} size="small" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Period info */}
        {startDate && endDate && isDateRangeValid && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            Exibindo notas de {formatDateDisplay(startDate)} até{' '}
            {formatDateDisplay(endDate)}
            {ganttItems.length > 0 && ` — ${ganttItems.length} item(s)`}
          </Typography>
        )}

        {loading && (
          <Stack spacing={1}>
            <Skeleton variant="rounded" height={48} sx={{ borderRadius: 1 }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={44}
                sx={{ borderRadius: 0 }}
              />
            ))}
          </Stack>
        )}

        {!loading && isDateRangeValid && (
          <Paper
            variant="outlined"
            sx={{ borderRadius: 2, overflow: 'hidden' }}
          >
            {ganttData ? (
              <GanttChart
                data={ganttData}
                onItemClick={handleBarClick}
                cellWidth={40}
              />
            ) : (
              <Stack alignItems="center" justifyContent="center" py={8}>
                <EmptyIcon
                  sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }}
                />
                <Typography variant="body1" color="text.secondary">
                  Nenhuma nota com período encontrada
                </Typography>
                <Typography variant="body2" color="text.disabled" mt={0.5}>
                  Crie notas com "Data única" ou "Período" para visualizá-las
                  aqui
                </Typography>
              </Stack>
            )}
          </Paper>
        )}

        {!isDateRangeValid && startDate && endDate && (
          <Stack alignItems="center" py={6}>
            <Typography variant="body1" color="warning.main">
              A data de início deve ser anterior ou igual à data de fim.
            </Typography>
          </Stack>
        )}

        {/* Detail dialog */}
        <NoteDetailDialog
          item={selectedItem}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      </Box>
    </LocalizationProvider>
  );
}

export default NotesBoardGanttTab;
