import { useEffect } from 'react';
import {
  TextField,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import type {
  Task,
  TaskStatus,
  Sprint,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatusConfig,
} from '@shared/interfaces/config/index.types';

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
}

const DEFAULT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
];

export interface TaskModalProps {
  open: boolean;
  task?: Task | null;
  sprint: Sprint | null;
  loading: boolean;
  error: string | null;
  statusOptions?: TaskStatusConfig[];
  onClose: () => void;
  onSave: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
}

export function TaskModal({
  open,
  task,
  sprint,
  loading,
  error,
  statusOptions,
  onClose,
  onSave,
}: TaskModalProps) {
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
      status: 'pending',
      startDate: null,
      endDate: null,
    },
  });

  const startDateValue = watch('startDate');

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (open) {
      reset({
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: task?.status ?? 'pending',
        startDate: task?.startDate ? new Date(task.startDate) : null,
        endDate: task?.endDate ? new Date(task.endDate) : null,
      });
    } else {
      reset({
        title: '',
        description: '',
        status: 'pending',
        startDate: null,
        endDate: null,
      });
    }
  }, [open, task, reset]);

  const onSubmit = async (data: TaskFormData) => {
    if (task) {
      const updateData: UpdateTaskInput = {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        sprintId: sprint?.id,
      };
      await onSave(updateData);
    } else {
      const createData: CreateTaskInput = {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        sprintId: sprint?.id,
      };
      await onSave(createData);
    }
  };

  const isEditing = !!task;

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
        setMaxWidth="500px"
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
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
          <Controller
            name="status"
            control={control}
            rules={{ required: 'Status é obrigatório' }}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.status} disabled={loading}>
                <InputLabel id="task-status-label">Status</InputLabel>
                <Select {...field} labelId="task-status-label" label="Status">
                  {(statusOptions && statusOptions.length > 0
                    ? statusOptions.map((s) => ({ value: s.name, label: s.label }))
                    : DEFAULT_STATUS_OPTIONS
                  ).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.status && (
                  <FormHelperText>{errors.status.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
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
                      error: !!errors.endDate,
                      helperText: errors.endDate?.message,
                    },
                  }}
                />
              )}
            />
          </Stack>
        </Stack>
      </Modal>
    </LocalizationProvider>
  );
}

export default TaskModal;
