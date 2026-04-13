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
} from '@mui/material';
import {
  Link as LinkIcon,
  Notes as NotesIcon,
  Schedule as ScheduleIcon,
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

interface LinkOption {
  id: number;
  label: string;
  secondary?: string;
}

interface NoteCardFormData {
  title: string;
  body: string;
  deadlineDate: Date | null;
  deadlineTime: Date | null;
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

function isBodyEmpty(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0;
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
    secondary: t.azureAreaPath ? t.azureAreaPath.split('\\').slice(-2).join(' › ') : undefined,
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

/** Combine a date and a time into a single ISO string. Time defaults to 23:59 if not set. */
function combineDeadline(date: Date | null, time: Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (time) {
    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  } else {
    d.setHours(23, 59, 0, 0);
  }
  return d.toISOString();
}

/** Split an ISO deadline string into separate date and time Date objects. */
function splitDeadline(deadline: string | null | undefined): { date: Date | null; time: Date | null } {
  if (!deadline) return { date: null, time: null };
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return { date: null, time: null };
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const timeOnly = new Date(2000, 0, 1, d.getHours(), d.getMinutes());
  return { date: dateOnly, time: timeOnly };
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
          secondary: t?.azureAreaPath ? t.azureAreaPath.split('\\').slice(-2).join(' › ') : undefined,
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
          label: tk ? `#${tk.externalId || tk.id} - ${tk.title}` : link.entityName || `Task #${link.entityId}`,
          secondary: tk?.status || undefined,
        });
        break;
      }
    }
  }
  return { memberLinks, teamLinks, positionLinks, taskLinks };
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography variant="subtitle2" fontWeight={600} color="text.secondary">{label}</Typography>
    </Stack>
  );
}

// ============================================================================
// Component
// ============================================================================

export function NoteCardFormModal({
  open, onClose, onSubmit, noteCard, members, teams, positions, tasks,
  loading = false, error,
}: NoteCardFormModalProps) {
  const isEditing = !!noteCard;

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<NoteCardFormData>({
    defaultValues: { title: '', body: '', deadlineDate: null, deadlineTime: null, memberLinks: [], teamLinks: [], positionLinks: [], taskLinks: [] },
  });

  const deadlineDateValue = watch('deadlineDate');

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
    } catch { /* silent */ } finally {
      setTaskSearchLoading(false);
    }
  }, []);

  const handleTaskInputChange = useCallback((_: unknown, value: string) => {
    setTaskInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTasks(value), 300);
  }, [searchTasks]);

  useEffect(() => {
    if (open) {
      if (noteCard) {
        const resolved = resolveLinksFromNoteCard(noteCard, members, teams, positions, tasks);
        const { date, time } = splitDeadline(noteCard.deadline);
        reset({ title: noteCard.title, body: noteCard.body, deadlineDate: date, deadlineTime: time, ...resolved });
      } else {
        reset({ title: '', body: '', deadlineDate: null, deadlineTime: null, memberLinks: [], teamLinks: [], positionLinks: [], taskLinks: [] });
      }
    }
  }, [open, noteCard, members, teams, positions, tasks, reset]);

  const handleBodyChange = useCallback((html: string) => {
    setValue('body', html, { shouldValidate: true });
  }, [setValue]);

  const onFormSubmit = async (data: NoteCardFormData) => {
    const links = [
      ...data.memberLinks.map((l) => ({ entityType: 'team_member' as const, entityId: l.id })),
      ...data.teamLinks.map((l) => ({ entityType: 'team' as const, entityId: l.id })),
      ...data.positionLinks.map((l) => ({ entityType: 'position' as const, entityId: l.id })),
      ...data.taskLinks.map((l) => ({ entityType: 'task' as const, entityId: l.id })),
    ];
    const deadline = combineDeadline(data.deadlineDate, data.deadlineTime);
    await onSubmit({ title: data.title, body: data.body, deadline, links } as CreateNoteCardInput);
  };

  const memberOptions = toMemberOptions(members.filter((m) => m.isActive));
  const teamOptions = toTeamOptions(teams.filter((t) => t.isActive));
  const positionOptions = toPositionOptions(positions.filter((p) => p.isActive));

  // Merge selected task links with search results (so selected items always appear)
  const currentTaskLinks = watch('taskLinks');
  const mergedTaskOptions = [
    ...currentTaskLinks.filter((sel) => !taskSearchOptions.some((o) => o.id === sel.id)),
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
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>
        )}

        <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
          {/* ── Left: Conteúdo ── */}
          <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <SectionHeader icon={<NotesIcon fontSize="small" />} label="Conteúdo" />

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

              {/* Deadline: Date + Time */}
              <Box>
                <SectionHeader icon={<ScheduleIcon fontSize="small" />} label="Prazo" />
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 7 }}>
                    <Controller
                      name="deadlineDate"
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          label="Data"
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v);
                            if (!v) setValue('deadlineTime', null);
                          }}
                          disabled={loading}
                          slotProps={{
                            textField: { fullWidth: true, size: 'small', placeholder: 'dd/mm/aaaa' },
                            field: { clearable: true },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 5 }}>
                    <Controller
                      name="deadlineTime"
                      control={control}
                      render={({ field }) => (
                        <TimePicker
                          label="Hora"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={loading || !deadlineDateValue}
                          ampm={false}
                          slotProps={{
                            textField: { fullWidth: true, size: 'small', placeholder: 'HH:mm' },
                          }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                  {!deadlineDateValue ? 'Opcional — selecione uma data para definir o prazo' : !watch('deadlineTime') ? 'Hora padrão: 23:59' : ''}
                </Typography>
              </Box>

              {/* Body */}
              <Controller
                name="body"
                control={control}
                rules={{ validate: (v) => (!v || isBodyEmpty(v)) ? 'Corpo é obrigatório' : true }}
                render={({ field }) => (
                  <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                      Corpo *
                    </Typography>
                    <Box sx={{
                      flex: 1, minHeight: 180,
                      '& > div': { height: '100%', display: 'flex', flexDirection: 'column' },
                      '& .tiptap': { flex: 1, overflow: 'auto' },
                    }}>
                      <RichTextEditor
                        key={noteCard?.id ?? 'new'}
                        content={field.value}
                        onChange={handleBodyChange}
                        editable={!loading}
                      />
                    </Box>
                    {errors.body && <FormHelperText error>{errors.body.message}</FormHelperText>}
                  </Box>
                )}
              />
            </Stack>
          </Grid>

          {/* ── Right: Vínculos ── */}
          <Grid
            size={{ xs: 12, md: 5 }}
            sx={{
              display: 'flex', flexDirection: 'column', minHeight: 0,
              borderLeft: { md: '1px solid' }, borderColor: { md: 'divider' }, pl: { md: 3 },
            }}
          >
            <SectionHeader icon={<LinkIcon fontSize="small" />} label="Vínculos" />

            <Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflow: 'auto', pr: 0.5 }}>
              {([
                { name: 'memberLinks' as const, label: 'Membros', options: memberOptions, limit: 2 },
                { name: 'teamLinks' as const, label: 'Equipes', options: teamOptions, limit: 2 },
                { name: 'positionLinks' as const, label: 'Cargos', options: positionOptions, limit: 3 },
              ]).map(({ name, label, options, limit }) => (
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
                          <Box component="li" key={key} {...rest} sx={{ '&.MuiAutocomplete-option': { py: 0.75 } }}>
                            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                              <Typography variant="body2" noWrap>{option.label}</Typography>
                              {option.secondary && (
                                <Typography variant="caption" color="text.disabled" noWrap display="block" sx={{ lineHeight: 1.3 }}>
                                  {option.secondary}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label={label} placeholder="Selecione..." />
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
                    noOptionsText={taskInputValue.length < 2 ? 'Digite ao menos 2 caracteres...' : 'Nenhuma task encontrada'}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props;
                      return (
                        <Box component="li" key={key} {...rest} sx={{ '&.MuiAutocomplete-option': { py: 0.75 } }}>
                          <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                            <Typography variant="body2" noWrap>{option.label}</Typography>
                            {option.secondary && (
                              <Typography variant="caption" color="text.disabled" noWrap display="block" sx={{ lineHeight: 1.3 }}>
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
                                {taskSearchLoading ? <CircularProgress size={16} /> : null}
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
