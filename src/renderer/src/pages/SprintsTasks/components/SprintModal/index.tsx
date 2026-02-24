import { useEffect } from 'react';
import { TextField, Typography, Stack } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import type {
  Sprint,
  CreateSprintInput,
  UpdateSprintInput,
} from '@shared/interfaces/config/index.types';

interface SprintFormData {
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface SprintModalProps {
  open: boolean;
  sprint?: Sprint | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: CreateSprintInput | UpdateSprintInput) => Promise<void>;
}

export function SprintModal({
  open,
  sprint,
  loading,
  error,
  onClose,
  onSave,
}: SprintModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SprintFormData>({
    defaultValues: {
      name: '',
      description: '',
      startDate: null,
      endDate: null,
    },
  });

  const startDateValue = watch('startDate');

  // Reset form when modal opens/closes or sprint changes
  useEffect(() => {
    if (open) {
      reset({
        name: sprint?.name ?? '',
        description: sprint?.description ?? '',
        startDate: sprint?.startDate ? new Date(sprint.startDate) : null,
        endDate: sprint?.endDate ? new Date(sprint.endDate) : null,
      });
    } else {
      reset({ name: '', description: '', startDate: null, endDate: null });
    }
  }, [open, sprint, reset]);

  const onSubmit = async (data: SprintFormData) => {
    if (!data.startDate || !data.endDate) return;

    if (sprint) {
      const updateData: UpdateSprintInput = {
        name: data.name,
        description: data.description || undefined,
        startDate: data.startDate,
        endDate: data.endDate,
      };
      await onSave(updateData);
    } else {
      const createData: CreateSprintInput = {
        name: data.name,
        description: data.description || undefined,
        startDate: data.startDate,
        endDate: data.endDate,
      };
      await onSave(createData);
    }
  };

  const isEditing = !!sprint;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Modal
        variant="form"
        open={open}
        title={isEditing ? 'Editar Sprint' : 'Nova Sprint'}
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
            name="name"
            control={control}
            rules={{ required: 'Nome é obrigatório' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nome"
                placeholder="Ex: Sprint 1"
                fullWidth
                required
                error={!!errors.name}
                helperText={errors.name?.message}
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
                placeholder="Descreva a sprint..."
                fullWidth
                multiline
                rows={3}
                disabled={loading}
              />
            )}
          />
          <Stack direction="row" spacing={2}>
            <Controller
              name="startDate"
              control={control}
              rules={{ required: 'Data início é obrigatória' }}
              render={({ field }) => (
                <DatePicker
                  label="Data Início"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
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
                required: 'Data fim é obrigatória',
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
                      required: true,
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

export default SprintModal;
