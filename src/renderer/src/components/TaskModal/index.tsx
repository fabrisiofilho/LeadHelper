import { useEffect, useState } from 'react';
import {
  TextField,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Timer as TimerIcon,
  Speed as SpeedIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { useTaskComments } from '@renderer/hooks/useTaskComments';
import type {
  Task,
  Sprint,
  Team,
  TaskStatusConfig,
  TaskPriority,
  EstimationType,
  CreateTaskInput,
  UpdateTaskInput,
} from '@shared/interfaces/config/index.types';

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: TaskPriority;
  startDate: Date | null;
  endDate: Date | null;
  sprintId: number | null;
  teamId: number | null;
  estimationType: EstimationType | null;
  estimationPoints: number | null;
  estimationHours: number | null;
}

export interface TaskModalProps {
  open: boolean;
  task?: Task | null;
  /** Pre-selected sprint (e.g. from Kanban page) */
  fixedSprint?: Sprint | null;
  sprints?: Sprint[];
  teams?: Team[];
  statusOptions: TaskStatusConfig[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
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

const formatCommentDate = (date?: Date | string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function TaskModal({
  open,
  task,
  fixedSprint,
  sprints = [],
  teams = [],
  statusOptions,
  loading,
  error,
  onClose,
  onSave,
}: TaskModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [newComment, setNewComment] = useState('');

  const defaultStatus =
    statusOptions.find((s) => s.isDefault)?.name ??
    statusOptions[0]?.name ??
    '';

  const {
    comments,
    loading: commentsLoading,
    findByTask,
    create: createComment,
    remove: removeComment,
  } = useTaskComments();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      description: '',
      status: defaultStatus,
      priority: 'medium',
      startDate: null,
      endDate: null,
      sprintId: fixedSprint?.id ?? null,
      teamId: null,
      estimationType: null,
      estimationPoints: null,
      estimationHours: null,
    },
  });

  const watchedEstimationType = watch('estimationType');
  const startDateValue = watch('startDate');

  useEffect(() => {
    if (open) {
      setActiveTab(0);
      setNewComment('');
      reset({
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: task?.status ?? defaultStatus,
        priority: (task?.priority as TaskPriority) ?? 'medium',
        startDate: task?.startDate ? new Date(task.startDate) : null,
        endDate: task?.endDate ? new Date(task.endDate) : null,
        sprintId: task?.sprintId ?? fixedSprint?.id ?? null,
        teamId: task?.teamId ?? null,
        estimationType: task?.estimationType ?? null,
        estimationPoints: task?.estimationPoints ?? null,
        estimationHours: task?.estimationHours ?? null,
      });
      if (task?.id) {
        findByTask(task.id);
      }
    }
  }, [open, task, reset, defaultStatus, fixedSprint, findByTask]);

  const onSubmit = async (data: TaskFormData) => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      priority: data.priority,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      sprintId: data.sprintId ?? undefined,
      teamId: data.teamId ?? undefined,
      estimationType: data.estimationType ?? undefined,
      estimationPoints: data.estimationPoints ?? undefined,
      estimationHours: data.estimationHours ?? undefined,
    };
    await onSave(payload);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task?.id) return;
    await createComment({ content: newComment.trim(), taskId: task.id });
    setNewComment('');
  };

  const handleDeleteComment = async (commentId: number) => {
    await removeComment(commentId);
  };

  const isEditing = !!task;
  const hasSprintSelector = !fixedSprint && sprints.length > 0;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Modal
        variant="form"
        open={open}
        title={isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
        handleClose={onClose}
        handleConfirm={handleSubmit(onSubmit)}
        confirmLabel="Salvar"
        cancelLabel="Cancelar"
        loading={loading}
        width="650px"
        setMaxWidth="650px"
        height={isEditing ? '680px' : undefined}
      >
        {/* Flex wrapper so both tabs share the same available height */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            ...(isEditing && { flex: 1, minHeight: 0, height: '100%' }),
          }}
        >
          {isEditing && (
            <Tabs
              value={activeTab}
              onChange={(_e, v) => setActiveTab(v)}
              sx={{
                mb: 2,
                borderBottom: 1,
                borderColor: 'divider',
                flexShrink: 0,
              }}
            >
              <Tab label="Dados" />
              <Tab label={`Comentários (${comments.length})`} />
            </Tabs>
          )}

          {activeTab === 0 && (
            <Stack spacing={2} sx={{ pt: 1, flex: 1, overflow: 'auto' }}>
              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}

              <Controller
                name="title"
                control={control}
                rules={{ required: 'Título é obrigatório' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Título"
                    placeholder="Ex: Implementar funcionalidade X"
                    fullWidth
                    required
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    disabled={loading}
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descrição"
                    placeholder="Descreva a tarefa..."
                    fullWidth
                    multiline
                    rows={3}
                    disabled={loading}
                  />
                )}
              />

              <Stack direction="row" spacing={2}>
                <Controller
                  name="status"
                  control={control}
                  rules={{ required: 'Status é obrigatório' }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      error={!!errors.status}
                      disabled={loading}
                    >
                      <InputLabel id="task-status-label">Status</InputLabel>
                      <Select
                        {...field}
                        labelId="task-status-label"
                        label="Status"
                      >
                        {statusOptions.map((option) => (
                          <MenuItem key={option.name} value={option.name}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  backgroundColor: option.color,
                                }}
                              />
                              <span>{option.label}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.status && (
                        <FormHelperText>{errors.status.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />

                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth disabled={loading}>
                      <InputLabel id="task-priority-label">
                        Prioridade
                      </InputLabel>
                      <Select
                        {...field}
                        labelId="task-priority-label"
                        label="Prioridade"
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  backgroundColor: option.color,
                                }}
                              />
                              <span>{option.label}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                {hasSprintSelector && (
                  <Controller
                    name="sprintId"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <Autocomplete
                        options={sprints}
                        getOptionLabel={(option) => option.name}
                        value={sprints.find((s) => s.id === value) || null}
                        onChange={(_, newValue) =>
                          onChange(newValue?.id || null)
                        }
                        fullWidth
                        disabled={loading}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Sprint"
                            placeholder="Selecione uma sprint..."
                          />
                        )}
                      />
                    )}
                  />
                )}

                {teams.length > 0 && (
                  <Controller
                    name="teamId"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <Autocomplete
                        options={teams}
                        getOptionLabel={(option) => option.name}
                        value={teams.find((t) => t.id === value) || null}
                        onChange={(_, newValue) =>
                          onChange(newValue?.id || null)
                        }
                        fullWidth
                        disabled={loading}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Equipe"
                            placeholder="Selecione uma equipe..."
                          />
                        )}
                      />
                    )}
                  />
                )}
              </Stack>

              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Estimativa (opcional)
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Controller
                    name="estimationType"
                    control={control}
                    render={({ field }) => (
                      <ToggleButtonGroup
                        value={field.value}
                        exclusive
                        onChange={(_, newValue) => field.onChange(newValue)}
                        size="small"
                        disabled={loading}
                      >
                        <ToggleButton value="points">
                          <SpeedIcon sx={{ mr: 0.5 }} fontSize="small" />
                          Pontos
                        </ToggleButton>
                        <ToggleButton value="hours">
                          <TimerIcon sx={{ mr: 0.5 }} fontSize="small" />
                          Horas
                        </ToggleButton>
                      </ToggleButtonGroup>
                    )}
                  />

                  {watchedEstimationType === 'points' && (
                    <Controller
                      name="estimationPoints"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label="Pontos"
                          size="small"
                          sx={{ width: 120 }}
                          disabled={loading}
                          slotProps={{ htmlInput: { min: 0 } }}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      )}
                    />
                  )}

                  {watchedEstimationType === 'hours' && (
                    <Controller
                      name="estimationHours"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label="Horas"
                          size="small"
                          sx={{ width: 120 }}
                          disabled={loading}
                          slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      )}
                    />
                  )}
                </Stack>
              </Box>

              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Período (opcional)
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="Data Início"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={loading}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            error: !!errors.startDate,
                            helperText: errors.startDate?.message,
                          },
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="endDate"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (value && startDateValue && value < startDateValue) {
                          return 'Data fim deve ser posterior à data início';
                        }
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <DatePicker
                        label="Data Fim"
                        value={field.value}
                        onChange={field.onChange}
                        minDate={startDateValue || undefined}
                        disabled={loading}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            error: !!errors.endDate,
                            helperText: errors.endDate?.message,
                          },
                        }}
                      />
                    )}
                  />
                </Stack>
              </Box>

              {task?.origin === 'azure_devops' && (
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CloudIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Importada do Azure DevOps
                      {task.externalId && ` (ID: ${task.externalId})`}
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Stack>
          )}

          {activeTab === 1 && isEditing && (
            <Stack
              spacing={2}
              sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
            >
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Adicionar comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={commentsLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  multiline
                  maxRows={3}
                />
                <Tooltip title="Enviar">
                  <IconButton
                    color="primary"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || commentsLoading}
                  >
                    <SendIcon />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Divider />

              {comments.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                  py={4}
                >
                  Nenhum comentário ainda
                </Typography>
              ) : (
                <Stack spacing={1.5} sx={{ flex: 1, overflow: 'auto' }}>
                  {comments.map((comment) => (
                    <Box
                      key={comment.id}
                      sx={{
                        p: 1.5,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        position: 'relative',
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box flex={1}>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap' }}
                          >
                            {comment.content}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            mt={0.5}
                          >
                            {comment.author && `${comment.author} · `}
                            {formatCommentDate(comment.createdAt)}
                          </Typography>
                        </Box>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteComment(comment.id)}
                            sx={{ p: 0.5 }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </Box>
      </Modal>
    </LocalizationProvider>
  );
}

export default TaskModal;
