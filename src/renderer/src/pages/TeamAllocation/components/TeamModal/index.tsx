import { useEffect, useState, KeyboardEvent } from 'react';
import {
  TextField,
  Typography,
  Stack,
  Chip,
  Box,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
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

  const [areaPaths, setAreaPaths] = useState<string[]>([]);
  const [areaPathInput, setAreaPathInput] = useState('');

  // Parse ";" separated string into array
  const parseAreaPaths = (value?: string): string[] => {
    if (!value) return [];
    return value
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean);
  };

  // Reset form when modal opens/closes or team changes
  useEffect(() => {
    if (open) {
      reset({
        name: team?.name ?? '',
        description: team?.description ?? '',
      });
      setAreaPaths(parseAreaPaths(team?.azureAreaPath));
      setAreaPathInput('');
    } else {
      reset({ name: '', description: '' });
      setAreaPaths([]);
      setAreaPathInput('');
    }
  }, [open, team, reset]);

  const handleAddPath = () => {
    const trimmed = areaPathInput.trim();
    if (trimmed && !areaPaths.includes(trimmed)) {
      setAreaPaths((prev) => [...prev, trimmed]);
    }
    setAreaPathInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPath();
    }
  };

  const handleRemovePath = (path: string) => {
    setAreaPaths((prev) => prev.filter((p) => p !== path));
  };

  const onSubmit = async (data: TeamFormData) => {
    const azureAreaPath =
      areaPaths.length > 0 ? areaPaths.join(';') : undefined;
    if (team) {
      const updateData: UpdateTeamInput = {
        name: data.name,
        description: data.description || undefined,
        azureAreaPath,
      };
      await onSave(updateData);
    } else {
      const createData: CreateTeamInput = {
        name: data.name,
        description: data.description || undefined,
        azureAreaPath,
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
        <Box>
          <TextField
            label="Area Path (Azure DevOps)"
            placeholder="Digite e pressione Enter para adicionar"
            fullWidth
            disabled={loading}
            value={areaPathInput}
            onChange={(e) => setAreaPathInput(e.target.value)}
            onKeyDown={handleKeyDown}
            helperText="Pressione Enter para adicionar. Cada path será usado para associar tarefas automaticamente."
            slotProps={{
              input: {
                endAdornment: areaPathInput.trim() ? (
                  <InputAdornment position="end">
                    <AddIcon
                      fontSize="small"
                      sx={{ cursor: 'pointer', color: 'action.active' }}
                      onClick={handleAddPath}
                    />
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          {areaPaths.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {areaPaths.map((path) => (
                <Chip
                  key={path}
                  label={path}
                  size="small"
                  onDelete={() => handleRemovePath(path)}
                  disabled={loading}
                />
              ))}
            </Box>
          )}
        </Box>
      </Stack>
    </Modal>
  );
}

export default TeamModal;
