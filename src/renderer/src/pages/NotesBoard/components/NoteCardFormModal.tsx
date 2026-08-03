import { useEffect, useCallback, useState, useRef } from 'react';
import {
  TextField,
  Typography,
  Stack,
  Autocomplete,
  FormHelperText,
  Box,
  Grid,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import {
  Link as LinkIcon,
  Notes as NotesIcon,
  Schedule as ScheduleIcon,
  Event as SingleDayIcon,
  DateRange as PeriodIcon,
  NotInterested as NoDayIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { RichTextEditor } from '@renderer/components/RichTextEditor';
import type {
  NoteCard,
  CreateNoteCardInput,
  UpdateNoteCardInput,
  TeamMember,
  Team,
  Position,
  Task,
} from '@shared/interfaces/config/index.types';

// ============================================================================
// Types
// ============================================================================

/** How the user has configured the date for this note */
type DateMode = 'none' | 'single' | 'period';

interface LinkOption {
  id: number;
  label: string;
  secondary?: string;
}

interface NoteCardFormData {
  title: string;
  body: string;
  dateMode: DateMode;
  /** Start date only (day-level) */
  startDate: Date | null;
  /** Start time — only used when allDay is false */
  startTime: Date | null;
  /** End date only — only used in 'period' mode */
  endDate: Date | null;
  /** End time — only used in 'period' mode when allDay is false */
  endTime: Date | null;
  /** When true, only dates are shown (no time) */
  allDay: boolean;
  memberLinks: LinkOption[];
  teamLinks: LinkOption[];
  positionLinks: LinkOption[];
  taskLinks: LinkOption[];
}

export interface NoteCardFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateNoteCardInput | UpdateNoteCardInput) => Promise<void>;
  noteCard?: NoteCard | null;
  members: TeamMember[];
  teams: Team[];
  positions: Position[];
  tasks: Task[]; // only used for resolving existing links on edit
  loading?: boolean;
  error?: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

/** Derive the DateMode from an existing NoteCard — uses stored value first, falls back to inference */
function deriveDateMode(noteCard: NoteCard | null | undefined): DateMode {
  if (!noteCard) return 'none';
  // Use stored dateMode if present (new notes after migration 009)
  if (noteCard.dateMode && noteCard.dateMode !== 'none')
    return noteCard.dateMode;
  if (noteCard.dateMode === 'none') return 'none';
  // Fallback inference for legacy notes without dateMode
  if (noteCard.startDate && noteCard.deadline) return 'period';
  if (noteCard.startDate || noteCard.deadline) return 'single';
  return 'none';
}

/** Parse a NoteCard's dates into separate date + time form values */
function parseDates(
  noteCard: NoteCard | null | undefined,
  mode: DateMode,
): {
  startDate: Date | null;
  startTime: Date | null;
  endDate: Date | null;
  endTime: Date | null;
  allDay: boolean;
} {
  if (!noteCard)
    return {
      startDate: null,
      startTime: null,
      endDate: null,
      endTime: null,
      allDay: true,
    };
  const allDay = noteCard.allDay !== false;

  const extractTime = (iso: string | null | undefined): Date | null => {
    if (!iso || allDay) return null;
    const d = new Date(iso);
    const t = new Date();
    t.setHours(d.getHours(), d.getMinutes(), 0, 0);
    return t;
  };

  const extractDate = (iso: string | null | undefined): Date | null => {
    if (!iso) return null;
    const d = new Date(iso);
    const dateOnly = new Date(d);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly;
  };

  if (mode === 'single') {
    const raw = noteCard.startDate ?? noteCard.deadline;
    return {
      startDate: extractDate(raw),
      startTime: extractTime(raw),
      endDate: null,
      endTime: null,
      allDay,
    };
  }

  if (mode === 'period') {
    return {
      startDate: extractDate(noteCard.startDate),
      startTime: extractTime(noteCard.startDate),
      endDate: extractDate(noteCard.deadline),
      endTime: extractTime(noteCard.deadline),
      allDay,
    };
  }

  return {
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    allDay,
  };
}

function toMemberOptions(members: TeamMember[]): LinkOption[] {
  return members.map((m) => ({
    id: m.id,
    label: m.name,
    secondary: m.position?.name || undefined,
  }));
}

function toTeamOptions(teams: Team[]): LinkOption[] {
  return teams.map((t) => ({
    id: t.id,
    label: t.name,
    secondary: t.azureAreaPath
      ? t.azureAreaPath.split('\\').slice(-2).join(' › ')
      : undefined,
  }));
}

function toPositionOptions(positions: Position[]): LinkOption[] {
  return positions.map((p) => ({
    id: p.id,
    label: p.name,
    secondary: p.description || undefined,
  }));
}

function toTaskOptions(tasks: Task[]): LinkOption[] {
  return tasks.map((t) => ({
    id: t.id,
    label: `#${t.externalId || t.id} - ${t.title}`,
    secondary: t.status || undefined,
  }));
}

/**
 * Combine a date-only value + optional time value into an ISO string.
 * When allDay=true, time is ignored — start is set to 00:00, end to 23:59.
 */
function toIso(
  date: Date | null,
  time: Date | null,
  allDay: boolean,
  isEndDate = false,
): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (allDay) {
    if (isEndDate) {
      d.setHours(23, 59, 59, 0);
    } else {
      d.setHours(0, 0, 0, 0);
    }
  } else if (time) {
    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

/** Returns true if the given time is outside business hours (08:00–17:30) */
function isOutsideBusinessHours(time: Date | null): boolean {
  if (!time) return false;
  const h = time.getHours();
  const m = time.getMinutes();
  const totalMinutes = h * 60 + m;
  return totalMinutes < 8 * 60 || totalMinutes > 17 * 60 + 30;
}

/** Merge a date-only field with a time field into a single Date for min/max constraints */
function mergeDateAndTime(date: Date | null, time: Date | null): Date | null {
  if (!date) return null;
  const merged = new Date(date);
  if (time) {
    merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
  } else {
    merged.setHours(0, 0, 0, 0);
  }
  return merged;
}

function resolveLinksFromNoteCard(
  noteCard: NoteCard,
  members: TeamMember[],
  teams: Team[],
  positions: Position[],
  tasks: Task[],
) {
  const memberLinks: LinkOption[] = [];
  const teamLinks: LinkOption[] = [];
  const positionLinks: LinkOption[] = [];
  const taskLinks: LinkOption[] = [];

  for (const link of noteCard.links || []) {
    switch (link.entityType) {
      case 'team_member': {
        const m = members.find((x) => x.id === link.entityId);
        memberLinks.push({
          id: link.entityId,
          label: m?.name || link.entityName || `Membro #${link.entityId}`,
          secondary: m?.position?.name || undefined,
        });
        break;
      }
      case 'team': {
        const t = teams.find((x) => x.id === link.entityId);
        teamLinks.push({
          id: link.entityId,
          label: t?.name || link.entityName || `Equipe #${link.entityId}`,
          secondary: t?.azureAreaPath
            ? t.azureAreaPath.split('\\').slice(-2).join(' › ')
            : undefined,
        });
        break;
      }
      case 'position': {
        const p = positions.find((x) => x.id === link.entityId);
        positionLinks.push({
          id: link.entityId,
          label: p?.name || link.entityName || `Cargo #${link.entityId}`,
          secondary: p?.description || undefined,
        });
        break;
      }
      case 'task': {
        const tk = tasks.find((x) => x.id === link.entityId);
        taskLinks.push({
          id: link.entityId,
          label: tk
            ? `#${tk.externalId || tk.id} - ${tk.title}`
            : link.entityName || `Task #${link.entityId}`,
          secondary: tk?.status || undefined,
        });
        break;
      }
    }
  }
  return { memberLinks, teamLinks, positionLinks, taskLinks };
}

function SectionHeader({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
      <Box
        sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

// ============================================================================
// Component
// ============================================================================

export function NoteCardFormModal({
  open,
  onClose,
  onSubmit,
  noteCard,
  members,
  teams,
  positions,
  tasks,
  loading = false,
  error,
}: NoteCardFormModalProps) {
  const isEditing = !!noteCard;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NoteCardFormData>({
    defaultValues: {
      title: '',
      body: '',
      dateMode: 'none',
      startDate: null,
      startTime: null,
      endDate: null,
      endTime: null,
      allDay: true,
      memberLinks: [],
      teamLinks: [],
      positionLinks: [],
      taskLinks: [],
    },
  });

  const dateModeValue = watch('dateMode');
  const allDayValue = watch('allDay');
  const startDateValue = watch('startDate');
  const startTimeValue = watch('startTime');
  const endDateValue = watch('endDate');
  const endTimeValue = watch('endTime');

  // ── Async task search ──
  const [taskSearchOptions, setTaskSearchOptions] = useState<LinkOption[]>([]);
  const [taskSearchLoading, setTaskSearchLoading] = useState(false);
  const [taskInputValue, setTaskInputValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchTasks = useCallback(async (query: string) => {
    if (query.length < 2) {
      setTaskSearchOptions([]);
      return;
    }
    setTaskSearchLoading(true);
    try {
      const res = await window.electronAPI.task.search(query, 30);
      if (res.success && res.data) {
        setTaskSearchOptions(toTaskOptions(res.data));
      }
    } catch {
      /* silent */
    } finally {
      setTaskSearchLoading(false);
    }
  }, []);

  const handleTaskInputChange = useCallback(
    (_: unknown, value: string) => {
      setTaskInputValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchTasks(value), 300);
    },
    [searchTasks],
  );

  useEffect(() => {
    if (open) {
      if (noteCard) {
        const resolved = resolveLinksFromNoteCard(
          noteCard,
          members,
          teams,
          positions,
          tasks,
        );
        const dateMode = deriveDateMode(noteCard);
        const { startDate, startTime, endDate, endTime, allDay } = parseDates(
          noteCard,
          dateMode,
        );
        reset({
          title: noteCard.title,
          body: noteCard.body,
          dateMode,
          startDate,
          startTime,
          endDate,
          endTime,
          allDay,
          ...resolved,
        });
      } else {
        reset({
          title: '',
          body: '',
          dateMode: 'none',
          startDate: null,
          startTime: null,
          endDate: null,
          endTime: null,
          allDay: true,
          memberLinks: [],
          teamLinks: [],
          positionLinks: [],
          taskLinks: [],
        });
      }
    }
  }, [open, noteCard, members, teams, positions, tasks, reset]);

  const handleBodyChange = useCallback(
    (html: string) => {
      setValue('body', html, { shouldValidate: true });
    },
    [setValue],
  );

  const onFormSubmit = async (data: NoteCardFormData) => {
    const links = [
      ...data.memberLinks.map((l) => ({
        entityType: 'team_member' as const,
        entityId: l.id,
      })),
      ...data.teamLinks.map((l) => ({
        entityType: 'team' as const,
        entityId: l.id,
      })),
      ...data.positionLinks.map((l) => ({
        entityType: 'position' as const,
        entityId: l.id,
      })),
      ...data.taskLinks.map((l) => ({
        entityType: 'task' as const,
        entityId: l.id,
      })),
    ];

    let startDate: string | null = null;
    let deadline: string | null = null;
    const allDay = data.allDay;

    if (data.dateMode === 'single') {
      startDate = toIso(data.startDate, data.startTime, allDay, false);
      deadline = toIso(data.startDate, data.startTime, allDay, allDay);
    } else if (data.dateMode === 'period') {
      startDate = toIso(data.startDate, data.startTime, allDay, false);
      deadline = toIso(data.endDate, data.endTime, allDay, allDay);
    }

    await onSubmit({
      title: data.title,
      body: data.body || '',
      dateMode: data.dateMode,
      startDate,
      deadline,
      allDay,
      links,
    } as CreateNoteCardInput);
  };

  const memberOptions = toMemberOptions(members.filter((m) => m.isActive));
  const teamOptions = toTeamOptions(teams.filter((t) => t.isActive));
  const positionOptions = toPositionOptions(
    positions.filter((p) => p.isActive),
  );

  // Merge selected task links with search results (so selected items always appear)
  const currentTaskLinks = watch('taskLinks');
  const mergedTaskOptions = [
    ...currentTaskLinks.filter(
      (sel) => !taskSearchOptions.some((o) => o.id === sel.id),
    ),
    ...taskSearchOptions,
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Modal
        variant="form"
        open={open}
        title={isEditing ? 'Editar Nota' : 'Criar Nota'}
        handleClose={onClose}
        handleConfirm={handleSubmit(onFormSubmit)}
        confirmLabel="Salvar"
        cancelLabel="Cancelar"
        loading={loading}
        setMaxWidth="1100px"
        width="95vw"
        height="85vh"
      >
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        <Grid container spacing={3} sx={{ height: '100%', minHeight: 0 }}>
          {/* ── Left: Conteúdo ── */}
          <Grid
            size={{ xs: 12, md: 7 }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              height: '100%',
            }}
          >
            <SectionHeader
              icon={<NotesIcon fontSize="small" />}
              label="Conteúdo"
            />

            <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
              {/* Title */}
              <Controller
                name="title"
                control={control}
                rules={{ required: 'Título é obrigatório' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Título"
                    fullWidth
                    required
                    size="small"
                    disabled={loading}
                    error={!!errors.title}
                    helperText={errors.title?.message}
                  />
                )}
              />

              {/* ── Date / Period section ── */}
              <Box>
                <SectionHeader
                  icon={<ScheduleIcon fontSize="small" />}
                  label="Data / Período"
                />

                {/* Date mode selector */}
                <Controller
                  name="dateMode"
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      value={field.value}
                      exclusive
                      onChange={(_, v) => {
                        if (v) {
                          field.onChange(v);
                          if (v === 'none') {
                            setValue('startDate', null);
                            setValue('startTime', null);
                            setValue('endDate', null);
                            setValue('endTime', null);
                          }
                        }
                      }}
                      size="small"
                      sx={{ mb: 1.5 }}
                    >
                      <ToggleButton value="none">
                        <NoDayIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Sem data
                      </ToggleButton>
                      <ToggleButton value="single">
                        <SingleDayIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Data única
                      </ToggleButton>
                      <ToggleButton value="period">
                        <PeriodIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Período
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />

                {dateModeValue !== 'none' && (
                  <Stack spacing={1.5}>
                    {/* All-day toggle */}
                    <Controller
                      name="allDay"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.checked);
                                if (e.target.checked) {
                                  // Clear times when switching to all-day
                                  setValue('startTime', null);
                                  setValue('endTime', null);
                                }
                              }}
                              size="small"
                            />
                          }
                          label={
                            <Typography variant="body2">
                              Dia inteiro (sem horário)
                            </Typography>
                          }
                        />
                      )}
                    />

                    {/* ── Start date row ── */}
                    <Box>
                      {dateModeValue === 'period' && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mb: 0.5, display: 'block', fontWeight: 600 }}
                        >
                          Início
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1.5}>
                        <Controller
                          name="startDate"
                          control={control}
                          render={({ field }) => (
                            <DatePicker
                              label={
                                dateModeValue === 'period'
                                  ? 'Data início'
                                  : 'Data'
                              }
                              value={field.value}
                              onChange={(v) => {
                                field.onChange(v);
                                // If end date is before new start date, clear it
                                if (dateModeValue === 'period' && v) {
                                  const currentEnd = watch('endDate');
                                  if (currentEnd && currentEnd < v) {
                                    setValue('endDate', null);
                                    setValue('endTime', null);
                                  }
                                }
                              }}
                              disabled={loading}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  size: 'small',
                                  placeholder: 'dd/mm/aaaa',
                                },
                                field: { clearable: true },
                              }}
                              sx={{ flex: 7 }}
                            />
                          )}
                        />
                        {!allDayValue && (
                          <Controller
                            name="startTime"
                            control={control}
                            render={({ field }) => (
                              <TimePicker
                                label="Hora"
                                value={field.value}
                                onChange={field.onChange}
                                disabled={loading || !startDateValue}
                                ampm={false}
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    size: 'small',
                                    placeholder: 'HH:mm',
                                  },
                                }}
                                sx={{ flex: 5 }}
                              />
                            )}
                          />
                        )}
                      </Stack>
                      {/* Business hours alert for start time */}
                      {!allDayValue &&
                        isOutsideBusinessHours(startTimeValue) && (
                          <Alert
                            severity="warning"
                            sx={{ mt: 0.75, py: 0.25, fontSize: '0.75rem' }}
                          >
                            Horário fora do expediente (08h–17h30)
                          </Alert>
                        )}
                    </Box>

                    {/* ── End date row — period only ── */}
                    {dateModeValue === 'period' && (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mb: 0.5, display: 'block', fontWeight: 600 }}
                        >
                          Fim
                        </Typography>
                        <Stack direction="row" spacing={1.5}>
                          <Controller
                            name="endDate"
                            control={control}
                            render={({ field }) => (
                              <DatePicker
                                label="Data fim"
                                value={field.value}
                                onChange={field.onChange}
                                disabled={loading}
                                // End date must be >= start date
                                minDate={startDateValue ?? undefined}
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    size: 'small',
                                    placeholder: 'dd/mm/aaaa',
                                  },
                                  field: { clearable: true },
                                }}
                                sx={{ flex: 7 }}
                              />
                            )}
                          />
                          {!allDayValue && (
                            <Controller
                              name="endTime"
                              control={control}
                              render={({ field }) => {
                                const endTimeVal = field.value;
                                // If same day as start, end time must be after start time
                                const isSameDay =
                                  startDateValue &&
                                  endDateValue &&
                                  startDateValue.toDateString() ===
                                    endDateValue.toDateString();
                                const minTime = isSameDay
                                  ? mergeDateAndTime(
                                      startDateValue,
                                      startTimeValue,
                                    )
                                  : undefined;
                                return (
                                  <TimePicker
                                    label="Hora"
                                    value={endTimeVal}
                                    onChange={field.onChange}
                                    disabled={loading || !endDateValue}
                                    ampm={false}
                                    minTime={minTime ?? undefined}
                                    slotProps={{
                                      textField: {
                                        fullWidth: true,
                                        size: 'small',
                                        placeholder: 'HH:mm',
                                      },
                                    }}
                                    sx={{ flex: 5 }}
                                  />
                                );
                              }}
                            />
                          )}
                        </Stack>
                        {/* Business hours alert for end time */}
                        {!allDayValue &&
                          isOutsideBusinessHours(endTimeValue) && (
                            <Alert
                              severity="warning"
                              sx={{ mt: 0.75, py: 0.25, fontSize: '0.75rem' }}
                            >
                              Horário fora do expediente (08h–17h30)
                            </Alert>
                          )}
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>

              {/* Body */}
              <Controller
                name="body"
                control={control}
                render={({ field }) => (
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      mb={0.5}
                      display="block"
                    >
                      Corpo
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <RichTextEditor
                        key={noteCard?.id ?? 'new'}
                        content={field.value}
                        onChange={handleBodyChange}
                        editable={!loading}
                      />
                    </Box>
                    {errors.body && (
                      <FormHelperText error>
                        {errors.body.message}
                      </FormHelperText>
                    )}
                  </Box>
                )}
              />
            </Stack>
          </Grid>

          {/* ── Right: Vínculos ── */}
          <Grid
            size={{ xs: 12, md: 5 }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              borderLeft: { md: '1px solid' },
              borderColor: { md: 'divider' },
              pl: { md: 3 },
            }}
          >
            <SectionHeader
              icon={<LinkIcon fontSize="small" />}
              label="Vínculos"
            />

            <Stack spacing={2} sx={{ flex: 1, pr: 0.5 }}>
              {[
                {
                  name: 'memberLinks' as const,
                  label: 'Membros',
                  options: memberOptions,
                  limit: 2,
                },
                {
                  name: 'teamLinks' as const,
                  label: 'Equipes',
                  options: teamOptions,
                  limit: 2,
                },
                {
                  name: 'positionLinks' as const,
                  label: 'Cargos',
                  options: positionOptions,
                  limit: 3,
                },
              ].map(({ name, label, options, limit }) => (
                <Controller
                  key={name}
                  name={name}
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Autocomplete
                      multiple
                      size="small"
                      options={options}
                      getOptionLabel={(o) => o.label}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      value={value}
                      onChange={(_, v) => onChange(v)}
                      disabled={loading}
                      limitTags={limit}
                      slotProps={{ chip: { sx: { maxWidth: '180px' } } }}
                      renderOption={(props, option) => {
                        const { key, ...rest } = props;
                        return (
                          <Box
                            component="li"
                            key={key}
                            {...rest}
                            sx={{ '&.MuiAutocomplete-option': { py: 0.75 } }}
                          >
                            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                              <Typography variant="body2" noWrap>
                                {option.label}
                              </Typography>
                              {option.secondary && (
                                <Typography
                                  variant="caption"
                                  color="text.disabled"
                                  noWrap
                                  display="block"
                                  sx={{ lineHeight: 1.3 }}
                                >
                                  {option.secondary}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={label}
                          placeholder="Selecione..."
                        />
                      )}
                    />
                  )}
                />
              ))}

              {/* Tasks — async server-side search */}
              <Controller
                name="taskLinks"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    multiple
                    size="small"
                    options={mergedTaskOptions}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={value}
                    onChange={(_, v) => onChange(v)}
                    onInputChange={handleTaskInputChange}
                    inputValue={taskInputValue}
                    filterOptions={(x) => x}
                    loading={taskSearchLoading}
                    disabled={loading}
                    limitTags={2}
                    slotProps={{ chip: { sx: { maxWidth: '180px' } } }}
                    noOptionsText={
                      taskInputValue.length < 2
                        ? 'Digite ao menos 2 caracteres...'
                        : 'Nenhuma task encontrada'
                    }
                    renderOption={(props, option) => {
                      const { key, ...rest } = props;
                      return (
                        <Box
                          component="li"
                          key={key}
                          {...rest}
                          sx={{ '&.MuiAutocomplete-option': { py: 0.75 } }}
                        >
                          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                            <Typography variant="body2" noWrap>
                              {option.label}
                            </Typography>
                            {option.secondary && (
                              <Typography
                                variant="caption"
                                color="text.disabled"
                                noWrap
                                display="block"
                                sx={{ lineHeight: 1.3 }}
                              >
                                {option.secondary}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tasks"
                        placeholder="Buscar por ID ou título..."
                        slotProps={{
                          input: {
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {taskSearchLoading ? (
                                  <CircularProgress size={16} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          },
                        }}
                      />
                    )}
                  />
                )}
              />
            </Stack>
          </Grid>
        </Grid>
      </Modal>
    </LocalizationProvider>
  );
}

export default NoteCardFormModal;
