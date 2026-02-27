import { useEffect } from 'react';
import {
  TextField,
  Typography,
  Stack,
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
import { getInitials, ROLE_COLORS } from '@renderer/utils/member';

interface AllocationFormData {
  teamMemberId: number | null;
  startDate: Date | null;
  endDate: Date | null;
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

const roleColors = ROLE_COLORS;

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
          notes: allocation.notes ?? '',
        });
      } else {
        reset({
          teamMemberId: null,
          startDate: new Date(),
          endDate: null,
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
        notes: data.notes,
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
        notes: data.notes,
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

          {/* Notes field - Motivo */}
          <Controller
            name="notes"
            control={control}
            rules={{ required: 'Motivo é obrigatório' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Motivo"
                placeholder="Motivo da alocação..."
                fullWidth
                multiline
                rows={2}
                required
                disabled={loading}
                error={!!errors.notes}
                helperText={errors.notes?.message}
              />
            )}
          />
        </Stack>
      </Modal>
    </LocalizationProvider>
  );
}

export default AllocationModal;
