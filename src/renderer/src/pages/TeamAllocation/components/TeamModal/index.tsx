import { useEffect } from 'react';
import { TextField, Typography, Stack } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import type {
  Team,
  CreateTeamInput,
  UpdateTeamInput,
} from '@shared/interfaces/config/index.types';

interface TeamFormData {
  name: string;
  description: string;
}

export interface TeamModalProps {
  open: boolean;
  team?: Team | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: CreateTeamInput | UpdateTeamInput) => Promise<void>;
}

export function TeamModal({
  open,
  team,
  loading,
  error,
  onClose,
  onSave,
}: TeamModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamFormData>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Reset form when modal opens/closes or team changes
  useEffect(() => {
    if (open) {
      reset({
        name: team?.name ?? '',
        description: team?.description ?? '',
      });
    } else {
      reset({ name: '', description: '' });
    }
  }, [open, team, reset]);

  const onSubmit = async (data: TeamFormData) => {
    if (team) {
      const updateData: UpdateTeamInput = {
        name: data.name,
        description: data.description || undefined,
      };
      await onSave(updateData);
    } else {
      const createData: CreateTeamInput = {
        name: data.name,
        description: data.description || undefined,
      };
      await onSave(createData);
    }
  };

  const isEditing = !!team;

  return (
    <Modal
      variant="form"
      open={open}
      title={isEditing ? 'Editar Equipe' : 'Nova Equipe'}
      handleClose={onClose}
      handleConfirm={handleSubmit(onSubmit)}
      confirmLabel="Salvar"
      cancelLabel="Cancelar"
      loading={loading}
      setMaxWidth="450px"
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
              placeholder="Ex: Equipe Backend"
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
              placeholder="Descreva a equipe..."
              fullWidth
              multiline
              rows={3}
              disabled={loading}
            />
          )}
        />
      </Stack>
    </Modal>
  );
}

export default TeamModal;
