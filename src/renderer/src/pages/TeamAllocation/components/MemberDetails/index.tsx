import {
  Typography,
  Button,
  Stack,
  Skeleton,
  IconButton,
  Chip,
  Tooltip,
  Box,
} from '@mui/material';
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  GroupWork as GroupWorkIcon,
} from '@mui/icons-material';
import type {
  Team,
  TeamMemberAllocation,
} from '@shared/interfaces/config/index.types';
import {
  MemberDetailsContainer,
  HeaderContainer,
  ContentContainer,
  MemberItem,
  EmptyState,
} from './styles';

export interface MemberDetailsProps {
  team: Team;
  allocations: TeamMemberAllocation[];
  loading: boolean;
  onNewMember: () => void;
  onNewAllocation: () => void;
  onEditAllocation: (allocation: TeamMemberAllocation) => void;
  onRemoveAllocation: (allocation: TeamMemberAllocation) => void;
}

export function MemberDetails({
  team,
  allocations,
  loading,
  onNewMember,
  onNewAllocation,
  onEditAllocation,
  onRemoveAllocation,
}: MemberDetailsProps) {
  const now = new Date();

  const isFuture = (allocation: TeamMemberAllocation): boolean => {
    if (!allocation.startDate) return false;
    return new Date(allocation.startDate) > now;
  };

  const isPast = (allocation: TeamMemberAllocation): boolean => {
    if (!allocation.endDate) return false;
    return new Date(allocation.endDate) < now;
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
  };
  if (loading) {
    return (
      <MemberDetailsContainer>
        <HeaderContainer>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {team.name}
            </Typography>
            {team.description && (
              <Typography variant="body2" color="text.secondary">
                {team.description}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PersonAddIcon />}
              disabled
              sx={{ borderRadius: '0.5rem' }}
            >
              Novo Membro
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              disabled
              sx={{ borderRadius: '0.5rem' }}
            >
              Alocar Membro
            </Button>
          </Stack>
        </HeaderContainer>
        <ContentContainer>
          <Stack spacing={1.5}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={72}
                sx={{ borderRadius: 1.5 }}
              />
            ))}
          </Stack>
        </ContentContainer>
      </MemberDetailsContainer>
    );
  }

  return (
    <MemberDetailsContainer>
      <HeaderContainer>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {team.name}
          </Typography>
          {team.description && (
            <Typography variant="body2" color="text.secondary">
              {team.description}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonAddIcon />}
            onClick={onNewMember}
            sx={{ borderRadius: '0.5rem' }}
          >
            Novo Membro
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={onNewAllocation}
            sx={{ borderRadius: '0.5rem' }}
          >
            Alocar Membro
          </Button>
        </Stack>
      </HeaderContainer>

      <ContentContainer>
        {allocations.length > 0 ? (
          <Stack spacing={1.5}>
            {allocations.map((allocation) => (
              <MemberItem key={allocation.id}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Box flex={1}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mb={1}
                    >
                      <Typography variant="subtitle2" fontWeight={500}>
                        {allocation.teamMemberName ||
                          `Membro #${allocation.teamMemberId}`}
                      </Typography>
                      <Chip
                        label={allocation.isActive ? 'Ativo' : 'Inativo'}
                        size="small"
                        color={allocation.isActive ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      {isFuture(allocation) && (
                        <Chip
                          label="Futuro"
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                      {isPast(allocation) && (
                        <Chip
                          label="Encerrado"
                          size="small"
                          color="default"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Stack>

                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Período: {formatDate(allocation.startDate)} →{' '}
                        {allocation.endDate
                          ? formatDate(allocation.endDate)
                          : 'Indeterminado'}
                      </Typography>
                      {allocation.notes && (
                        <Typography variant="body2" color="text.secondary">
                          Motivo: {allocation.notes}
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={0.5} ml={2}>
                    <Tooltip title="Editar alocação">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAllocation(allocation);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover alocação">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveAllocation(allocation);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </MemberItem>
            ))}
          </Stack>
        ) : (
          <EmptyState>
            <GroupWorkIcon
              sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Nenhum membro alocado nesta equipe
            </Typography>
            <Typography variant="caption" color="text.secondary" mb={2}>
              Clique em "Alocar Membro" para adicionar membros à equipe
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={onNewAllocation}
            >
              Alocar Membro
            </Button>
          </EmptyState>
        )}
      </ContentContainer>
    </MemberDetailsContainer>
  );
}

export default MemberDetails;
