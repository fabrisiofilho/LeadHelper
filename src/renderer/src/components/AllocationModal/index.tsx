import { useEffect, useMemo, useState } from 'react';
import {
  TextField,
  Typography,
  Stack,
  Slider,
  Box,
  Autocomplete,
  Avatar,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
} from '@mui/icons-material';
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
  teamId: number | null;
  startDate: Date | null;
  endDate: Date | null;
  dedicationPercentage: number;
  notes: string;
}

export interface AllocationModalProps {
  open: boolean;
  /** Equipe pré-selecionada (quando vem da tela de Alocação de Equipes) */
  fixedTeam?: Team | null;
  /** Todas as equipes disponíveis (quando permite selecionar equipe) */
  teams?: Team[];
  allocation?: TeamMemberAllocation | null;
  teamMembers: TeamMember[];
  /** Todas as alocações ativas — usado para mostrar status de alocação no dropdown */
  existingAllocations?: TeamMemberAllocation[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (
    data: CreateTeamMemberAllocationInput | UpdateTeamMemberAllocationInput,
  ) => Promise<void>;
  /** Função para buscar disponibilidade do membro */
  getMemberAvailability?: (teamMemberId: number) => Promise<number>;
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
  fixedTeam,
  teams = [],
  allocation,
  teamMembers,
  existingAllocations = [],
  loading,
  error,
  onClose,
  onSave,
  getMemberAvailability,
}: AllocationModalProps) {
  const [memberAvailability, setMemberAvailability] = useState<number>(100);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AllocationFormData>({
    defaultValues: {
      teamMemberId: null,
      teamId: fixedTeam?.id ?? null,
      startDate: new Date(),
      endDate: null,
      dedicationPercentage: 100,
      notes: '',
    },
  });

  const isEditing = !!allocation;
  const watchedMemberId = watch('teamMemberId');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (allocation) {
        reset({
          teamMemberId: allocation.teamMemberId,
          teamId: allocation.teamId,
          startDate: allocation.startDate
            ? new Date(allocation.startDate)
            : new Date(),
          endDate: allocation.endDate ? new Date(allocation.endDate) : null,
          dedicationPercentage: allocation.dedicationPercentage ?? 100,
          notes: allocation.notes ?? '',
        });
        setMemberAvailability(100);
      } else {
        reset({
          teamMemberId: null,
          teamId: fixedTeam?.id ?? null,
          startDate: new Date(),
          endDate: null,
          dedicationPercentage: 100,
          notes: '',
        });
        setMemberAvailability(100);
      }
    }
  }, [open, allocation, fixedTeam, reset]);

  // Load member availability when member changes
  useEffect(() => {
    if (watchedMemberId && !isEditing && getMemberAvailability) {
      setAvailabilityLoading(true);
      getMemberAvailability(watchedMemberId).then((availability) => {
        setMemberAvailability(availability);
        if (availability < 100) {
          setValue('dedicationPercentage', Math.min(availability, 100));
        }
        setAvailabilityLoading(false);
      });
    }
  }, [watchedMemberId, isEditing, getMemberAvailability, setValue]);

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
      if (!data.teamMemberId || !data.startDate) return;
      const teamId = fixedTeam?.id ?? data.teamId;
      if (!teamId) return;

      const createData: CreateTeamMemberAllocationInput = {
        teamMemberId: data.teamMemberId,
        teamId,
        startDate: data.startDate,
        endDate: data.endDate ?? undefined,
        dedicationPercentage: data.dedicationPercentage,
        notes: data.notes || undefined,
      };
      await onSave(createData);
    }
  };

  const activeMembers = teamMembers.filter((m) => m.isActive);
  const availableTeams = teams.filter((t) => t.isActive);
  const maxDedication = isEditing ? 100 : Math.max(memberAvailability, 1);

  // Build allocation info per member
  const memberAllocationInfo = useMemo(() => {
    const info = new Map<
      number,
      { teams: { name: string; dedication: number }[]; totalDedication: number; isInCurrentTeam: boolean }
    >();
    const currentTeamId = fixedTeam?.id ?? null;

    for (const alloc of existingAllocations) {
      if (!alloc.isActive) continue;
      const existing = info.get(alloc.teamMemberId) || {
        teams: [],
        totalDedication: 0,
        isInCurrentTeam: false,
      };
      existing.teams.push({
        name: alloc.teamName || `Equipe #${alloc.teamId}`,
        dedication: alloc.dedicationPercentage,
      });
      existing.totalDedication += alloc.dedicationPercentage;
      if (currentTeamId && alloc.teamId === currentTeamId) {
        existing.isInCurrentTeam = true;
      }
      info.set(alloc.teamMemberId, existing);
    }
    return info;
  }, [existingAllocations, fixedTeam]);

  // Sort members: available first, then allocated elsewhere, then already in current team
  const sortedMembers = useMemo(() => {
    return [...activeMembers].sort((a, b) => {
      const infoA = memberAllocationInfo.get(a.id);
      const infoB = memberAllocationInfo.get(b.id);
      const aInCurrent = infoA?.isInCurrentTeam ?? false;
      const bInCurrent = infoB?.isInCurrentTeam ?? false;
      const aAllocated = !!infoA;
      const bAllocated = !!infoB;

      // Already in current team goes last
      if (aInCurrent !== bInCurrent) return aInCurrent ? 1 : -1;
      // Unallocated first
      if (aAllocated !== bAllocated) return aAllocated ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [activeMembers, memberAllocationInfo]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Modal
        variant="form"
        open={open}
        title={isEditing ? 'Editar Alocação' : 'Nova Alocação'}
        handleClose={onClose}
        handleConfirm={handleSubmit(onSubmit)}
        confirmLabel="Salvar"
        cancelLabel="Cancelar"
        loading={loading}
        setMaxWidth="550px"
      >
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          {/* Team info (fixed) or team selector */}
          {fixedTeam ? (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Equipe
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {fixedTeam.name}
              </Typography>
            </Box>
          ) : (
            <Controller
              name="teamId"
              control={control}
              rules={{ required: 'Equipe é obrigatória' }}
              render={({ field: { onChange, value } }) => (
                <Autocomplete
                  options={availableTeams}
                  getOptionLabel={(option) => option.name}
                  value={availableTeams.find((t) => t.id === value) || null}
                  onChange={(_, newValue) => onChange(newValue?.id || null)}
                  disabled={isEditing || loading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Equipe"
                      placeholder="Selecione uma equipe..."
                      required
                      error={!!errors.teamId}
                      helperText={errors.teamId?.message}
                    />
                  )}
                />
              )}
            />
          )}

          {/* Member selection */}
          <Controller
            name="teamMemberId"
            control={control}
            rules={{ required: !isEditing ? 'Membro é obrigatório' : false }}
            render={({ field: { onChange, value } }) => (
              <Autocomplete
                options={sortedMembers}
                getOptionLabel={(option) => option.name}
                getOptionDisabled={(option) => {
                  const info = memberAllocationInfo.get(option.id);
                  return !!info?.isInCurrentTeam;
                }}
                groupBy={(option) => {
                  if (existingAllocations.length === 0) return '';
                  const info = memberAllocationInfo.get(option.id);
                  if (!info) return 'Disponíveis';
                  if (info.isInCurrentTeam) return 'Já alocados nesta equipe';
                  return 'Alocados em outras equipes';
                }}
                value={sortedMembers.find((m) => m.id === value) || null}
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
                renderOption={(props, option) => {
                  const info = memberAllocationInfo.get(option.id);
                  const isDisabled = !!info?.isInCurrentTeam;
                  return (
                    <li {...props} key={option.id}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{
                          width: '100%',
                          opacity: isDisabled ? 0.5 : 1,
                        }}
                      >
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
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2">{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {roleLabels[option.role]} • {option.email}
                          </Typography>
                        </Box>
                        {info && (
                          <Stack direction="row" spacing={0.5} flexShrink={0} alignItems="center">
                            {info.isInCurrentTeam ? (
                              <Chip
                                label="Já alocado"
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.65rem' }}
                              />
                            ) : (
                              <Chip
                                icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
                                label={`${info.totalDedication}% alocado`}
                                size="small"
                                color={info.totalDedication >= 100 ? 'error' : 'warning'}
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.65rem' }}
                              />
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </li>
                  );
                }}
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

          {/* Member availability */}
          {watchedMemberId && !isEditing && getMemberAvailability && (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Disponibilidade atual do membro:
              </Typography>
              {availabilityLoading ? (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mt: 0.5 }}
                >
                  <LinearProgress
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" fontWeight={600}>
                    ...
                  </Typography>
                </Stack>
              ) : (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LinearProgress
                    variant="determinate"
                    value={memberAvailability}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    color={
                      memberAvailability > 50
                        ? 'success'
                        : memberAvailability > 0
                          ? 'warning'
                          : 'error'
                    }
                  />
                  <Typography variant="body2" fontWeight={600}>
                    {memberAvailability}%
                  </Typography>
                </Stack>
              )}
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
                      helperText: 'Deixe vazio para indefinido',
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
              max: {
                value: maxDedication,
                message: `Máximo ${maxDedication}%`,
              },
            }}
            render={({ field }) => (
              <Box>
                <Typography variant="body2" gutterBottom>
                  Percentual de Dedicação: {field.value}%
                </Typography>
                <Slider
                  {...field}
                  min={1}
                  max={maxDedication}
                  valueLabelDisplay="auto"
                  disabled={loading}
                  marks={[
                    { value: 25, label: '25%' },
                    { value: 50, label: '50%' },
                    { value: 75, label: '75%' },
                    { value: 100, label: '100%' },
                  ].filter((m) => m.value <= maxDedication)}
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
