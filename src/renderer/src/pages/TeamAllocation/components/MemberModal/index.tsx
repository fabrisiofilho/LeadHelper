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
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import type {
  TeamMemberRole,
  CreateTeamMemberInput,
} from '@shared/interfaces/config/index.types';

interface MemberFormData {
  name: string;
  email: string;
  role: TeamMemberRole | '';
}

export interface MemberModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (data: CreateTeamMemberInput) => Promise<void>;
}

const roleLabels: Record<TeamMemberRole, string> = {
  developer: 'Desenvolvedor',
  analyst: 'Analista',
  qa: 'QA',
  tech_lead: 'Tech Lead',
  devops: 'DevOps',
  designer: 'Designer',
  product_owner: 'Product Owner',
};

const roleOptions: TeamMemberRole[] = [
  'developer',
  'analyst',
  'qa',
  'tech_lead',
  'devops',
  'designer',
  'product_owner',
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MemberModal({
  open,
  loading,
  error,
  onClose,
  onSave,
}: MemberModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    defaultValues: {
      name: '',
      email: '',
      role: '',
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      reset({ name: '', email: '', role: '' });
    } else {
      reset({ name: '', email: '', role: '' });
    }
  }, [open, reset]);

  const onSubmit = async (data: MemberFormData) => {
    const createData: CreateTeamMemberInput = {
      name: data.name,
      email: data.email,
      role: data.role as TeamMemberRole,
    };
    await onSave(createData);
  };

  return (
    <Modal
      variant="form"
      open={open}
      title="Novo Membro"
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
              placeholder="Ex: João Silva"
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name?.message}
              disabled={loading}
            />
          )}
        />
        <Controller
          name="email"
          control={control}
          rules={{
            required: 'E-mail é obrigatório',
            pattern: {
              value: emailRegex,
              message: 'E-mail inválido',
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="E-mail"
              placeholder="Ex: joao.silva@empresa.com"
              fullWidth
              required
              type="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={loading}
            />
          )}
        />
        <Controller
          name="role"
          control={control}
          rules={{ required: 'Função é obrigatória' }}
          render={({ field }) => (
            <FormControl fullWidth required error={!!errors.role}>
              <InputLabel id="role-select-label">Função</InputLabel>
              <Select
                {...field}
                labelId="role-select-label"
                label="Função"
                disabled={loading}
              >
                {roleOptions.map((role) => (
                  <MenuItem key={role} value={role}>
                    {roleLabels[role]}
                  </MenuItem>
                ))}
              </Select>
              {errors.role && (
                <FormHelperText>{errors.role.message}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Stack>
    </Modal>
  );
}

export default MemberModal;
