import { useEffect } from 'react';
import {
  TextField,
  Typography,
  Stack,
  Slider,
  Box,
  Autocomplete,
  Avatar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import type {
  Team,
  TeamMember,
  TeamMemberAllocation,
  TeamMemberRole,
  CreateTeamMemberAllocationInput,
  UpdateTeamMemberAllocationInput,
} from '@shared/interfaces/config/index.types';

interface AllocationFormData {
  teamMemberId: number | null;
  startDate: Date | null;
  endDate: Date | null;
  dedicationPercentage: number;
  notes: string;
}

export interface AllocationModalProps {
  open: boolean;
  team: Team;
  allocation?: TeamMemberAllocation | null;
  teamMembers: TeamMember[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (
    data: CreateTeamMemberAllocationInput | UpdateTeamMemberAllocationInput,
  ) => Promise<void>;
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

const roleColors: Record<TeamMemberRole, string> = {
  developer: '#1976d2',
  analyst: '#9c27b0',
  qa: '#2e7d32',
  tech_lead: '#ed6c02',
  devops: '#0288d1',
  designer: '#d32f2f',
  product_owner: '#7b1fa2',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AllocationModal({
  open,
  team,
  allocation,
  teamMembers,
  loading,
  error,
  onClose,
  onSave,
}: AllocationModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AllocationFormData>({
    defaultValues: {
      teamMemberId: null,
      startDate: new Date(),
      endDate: null,
      dedicationPercentage: 100,
      notes: '',
    },
  });

  const isEditing = !!allocation;

  // Reset form when modal opens/closes or allocation changes
  useEffect(() => {
    if (open) {
      if (allocation) {
        reset({
          teamMemberId: allocation.teamMemberId,
          startDate: allocation.startDate
            ? new Date(allocation.startDate)
            : new Date(),
          endDate: allocation.endDate ? new Date(allocation.endDate) : null,
          dedicationPercentage: allocation.dedicationPercentage ?? 100,
          notes: allocation.notes ?? '',
        });
      } else {
        reset({
          teamMemberId: null,
          startDate: new Date(),
          endDate: null,
          dedicationPercentage: 100,
          notes: '',
        });
      }
    }
  }, [open, allocation, reset]);

  const onSubmit = async (data: AllocationFormData) => {
    if (isEditing) {
      const updateData: UpdateTeamMemberAllocationInput = {
        startDate: data.startDate ?? undefined,
        endDate: data.endDate ?? undefined,
        dedicationPercentage: data.dedicationPercentage,
        notes: data.notes || undefined,
      };
      await onSave(updateData);
    } else {
      if (!data.teamMemberId || !data.startDate) {
        return;
      }
      const createData: CreateTeamMemberAllocationInput = {
        teamMemberId: data.teamMemberId,
        teamId: team.id,
        startDate: data.startDate,
        endDate: data.endDate ?? undefined,
        dedicationPercentage: data.dedicationPercentage,
        notes: data.notes || undefined,
      };
      await onSave(createData);
    }
  };

  // Filter active team members for selection
  const availableMembers = teamMembers.filter((m) => m.isActive);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Modal
        variant="form"
        open={open}
        title={isEditing ? 'Editar Alocação' : 'Alocar Membro'}
        handleClose={onClose}
        handleConfirm={handleSubmit(onSubmit)}
        confirmLabel="Salvar"
        cancelLabel="Cancelar"
        loading={loading}
        setMaxWidth="500px"
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          {/* Team info */}
          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Equipe
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {team.name}
            </Typography>
          </Box>

          {/* Member selection - disabled when editing */}
          <Controller
            name="teamMemberId"
            control={control}
            rules={{ required: !isEditing ? 'Membro é obrigatório' : false }}
            render={({ field: { onChange, value } }) => (
              <Autocomplete
                options={availableMembers}
                getOptionLabel={(option) => option.name}
                value={availableMembers.find((m) => m.id === value) || null}
                onChange={(_, newValue) => onChange(newValue?.id || null)}
                disabled={isEditing || loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Membro da Equipe"
                    placeholder="Selecione um membro..."
                    required={!isEditing}
                    error={!!errors.teamMemberId}
                    helperText={errors.teamMemberId?.message}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: roleColors[option.role],
                          width: 32,
                          height: 32,
                          fontSize: '0.75rem',
                        }}
                      >
                        {getInitials(option.name)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {roleLabels[option.role]} • {option.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </li>
                )}
              />
            )}
          />

          {/* Show member name when editing */}
          {isEditing && allocation?.teamMemberName && (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Membro
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {allocation.teamMemberName}
              </Typography>
            </Box>
          )}

          {/* Date fields */}
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
              render={({ field }) => (
                <DatePicker
                  label="Data Fim"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={loading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: 'Opcional',
                    },
                  }}
                />
              )}
            />
          </Stack>

          {/* Dedication percentage slider */}
          <Controller
            name="dedicationPercentage"
            control={control}
            rules={{
              required: 'Dedicação é obrigatória',
              min: { value: 1, message: 'Mínimo 1%' },
              max: { value: 100, message: 'Máximo 100%' },
            }}
            render={({ field }) => (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Percentual de Dedicação: {field.value}%
                </Typography>
                <Slider
                  {...field}
                  min={1}
                  max={100}
                  valueLabelDisplay="auto"
                  disabled={loading}
                  marks={[
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                    { value: 100, label: '100%' },
                  ]}
                />
                {errors.dedicationPercentage && (
                  <Typography color="error" variant="caption">
                    {errors.dedicationPercentage.message}
                  </Typography>
                )}
              </Box>
            )}
          />

          {/* Notes field */}
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Observações"
                placeholder="Observações sobre a alocação..."
                fullWidth
                multiline
                rows={2}
                disabled={loading}
              />
            )}
          />
        </Stack>
      </Modal>
    </LocalizationProvider>
  );
}

export default AllocationModal;
