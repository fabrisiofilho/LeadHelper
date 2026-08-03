import { useEffect, useState } from 'react';
import {
  TextField,
  Typography,
  Stack,
  FormControl,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  Box,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import { useTaskComments } from '@renderer/hooks/useTaskComments';
import { DateRangeWithBusinessDays } from '@renderer/components/DateRangeWithBusinessDays';
import type {
  Task,
  Sprint,
  Team,
  TaskStatusConfig,
  TaskPriority,
  TaskType,
  CreateTaskInput,
  UpdateTaskInput,
} from '@shared/interfaces/config/index.types';
import { TASK_TYPE_OPTIONS } from '@renderer/utils/task-type';
import { MarkdownEditor } from '@renderer/components/MarkdownEditor';

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: TaskPriority;
  type: TaskType;
  startDate: Date | null;
  endDate: Date | null;
  sprintId: number | null;
  teamId: number | null;
}

export interface TaskModalProps {
  open: boolean;
  task?: Task | null;
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
  { value: 'low', label: 'Baixa', color: '#16A34A' },
  { value: 'medium', label: 'Média', color: '#D97706' },
  { value: 'high', label: 'Alta', color: '#DC2626' },
  { value: 'critical', label: 'Crítica', color: '#9333EA' },
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
    setValue,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      description: '',
      status: defaultStatus,
      priority: 'medium',
      type: 'task',
      startDate: null,
      endDate: null,
      sprintId: fixedSprint?.id ?? null,
      teamId: null,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const startDateValue = watch('startDate');

  useEffect(() => {
    if (open) {
      setNewComment('');
      reset({
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: task?.status ?? defaultStatus,
        priority: (task?.priority as TaskPriority) ?? 'medium',
        type: (task?.type as TaskType) ?? 'task',
        startDate: task?.startDate ? new Date(task.startDate) : null,
        endDate: task?.endDate ? new Date(task.endDate) : null,
        sprintId: task?.sprintId ?? fixedSprint?.id ?? null,
        teamId: task?.teamId ?? null,
      });
      if (task?.id) findByTask(task.id);
    }
  }, [open, task, reset, defaultStatus, fixedSprint, findByTask]);

  const onSubmit = async (data: TaskFormData) => {
    await onSave({
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      priority: data.priority,
      type: data.type,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      sprintId: data.sprintId ?? undefined,
      teamId: data.teamId ?? undefined,
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task?.id) return;
    await createComment({ content: newComment.trim(), taskId: task.id });
    setNewComment('');
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
        width="1100px"
        setMaxWidth="1100px"
        height="85vh"
        hasCloseButton
      >
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        {/* Two-column layout: main content left, sidebar right */}
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            gap: 2.5,
            height: '100%',
          }}
        >
          {/* LEFT — Title, Description, Comments */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              pr: 1,
            }}
          >
            <Controller
              name="title"
              control={control}
              rules={{ required: 'Título é obrigatório' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  placeholder="Título da tarefa"
                  fullWidth
                  required
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  disabled={loading}
                  variant="standard"
                  sx={{
                    mb: 2,
                    '& .MuiInputBase-input': {
                      fontSize: '1.25rem',
                      fontWeight: 600,
                    },
                  }}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ mb: 0.5, display: 'block' }}
                  >
                    Descrição
                  </Typography>
                  <MarkdownEditor
                    value={field.value}
                    onChange={field.onChange}
                    disabled={loading}
                    minRows={8}
                  />
                </Box>
              )}
            />

            {/* Comments section — always visible when editing */}
            {isEditing && (
              <Box sx={{ mt: 'auto', pt: 1 }}>
                <Divider sx={{ mb: 1.5 }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 1, display: 'block' }}
                >
                  Comentários ({comments.length})
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
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
                {comments.length > 0 && (
                  <Stack spacing={1} sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {comments.map((comment) => (
                      <Box
                        key={comment.id}
                        sx={{
                          p: 1.5,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
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
                              onClick={() => removeComment(comment.id)}
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
              </Box>
            )}
          </Box>

          {/* RIGHT — Sidebar with details (compact, no scroll) */}
          <Box
            sx={{
              width: 340,
              flexShrink: 0,
              borderLeft: '1px solid',
              borderColor: 'divider',
              pl: 2.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              overflow: 'hidden',
            }}
          >
            {/* Row 1: Status + Prioridade side by side */}
            <Stack direction="row" spacing={1.5}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 0.25, display: 'block' }}
                >
                  Status
                </Typography>
                <Controller
                  name="status"
                  control={control}
                  rules={{ required: 'Status é obrigatório' }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      size="small"
                      error={!!errors.status}
                      disabled={loading}
                    >
                      <Select {...field} displayEmpty>
                        {statusOptions.map((option) => (
                          <MenuItem key={option.name} value={option.name}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.75}
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: option.color,
                                  flexShrink: 0,
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
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 0.25, display: 'block' }}
                >
                  Prioridade
                </Typography>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small" disabled={loading}>
                      <Select {...field}>
                        {PRIORITY_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.75}
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: option.color,
                                  flexShrink: 0,
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
              </Box>
            </Stack>

            {/* Row 2: Tipo */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ mb: 0.25, display: 'block' }}
              >
                Tipo
              </Typography>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small" disabled={loading}>
                    <Select {...field}>
                      {TASK_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.75}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: option.color,
                                flexShrink: 0,
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
            </Box>

            {/* Row 3: Sprint + Equipe */}
            {hasSprintSelector && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 0.25, display: 'block' }}
                >
                  Sprint
                </Typography>
                <Controller
                  name="sprintId"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Autocomplete
                      options={sprints}
                      getOptionLabel={(o) => o.name}
                      value={sprints.find((s) => s.id === value) || null}
                      onChange={(_, v) => onChange(v?.id || null)}
                      size="small"
                      disabled={loading}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Selecione..." />
                      )}
                    />
                  )}
                />
              </Box>
            )}
            {teams.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 0.25, display: 'block' }}
                >
                  Equipe
                </Typography>
                <Controller
                  name="teamId"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Autocomplete
                      options={teams}
                      getOptionLabel={(o) => o.name}
                      value={teams.find((t) => t.id === value) || null}
                      onChange={(_, v) => onChange(v?.id || null)}
                      size="small"
                      disabled={loading}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="Selecione..." />
                      )}
                    />
                  )}
                />
              </Box>
            )}

            <Divider sx={{ my: 0.5 }} />

            {/* Row 4: Período — dates side by side, dias úteis below */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ mb: 0.25, display: 'block' }}
              >
                Período
              </Typography>
              <DateRangeWithBusinessDays
                startDate={startDateValue}
                endDate={watch('endDate')}
                onStartDateChange={(date) => setValue('startDate', date)}
                onEndDateChange={(date) => setValue('endDate', date)}
                disabled={loading}
                size="small"
                startError={errors.startDate?.message}
                endError={errors.endDate?.message}
              />
            </Box>

            {task?.origin === 'azure_devops' && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" spacing={1} alignItems="center">
                  <CloudIcon color="primary" fontSize="small" />
                  <Typography variant="caption" color="text.secondary">
                    Azure DevOps{task.externalId && ` (ID: ${task.externalId})`}
                  </Typography>
                </Stack>
              </>
            )}
          </Box>
        </Box>
      </Modal>
    </LocalizationProvider>
  );
}

export default TaskModal;
