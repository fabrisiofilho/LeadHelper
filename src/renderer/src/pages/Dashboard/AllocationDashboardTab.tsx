import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  Alert,
} from '@mui/material';
import {
  People as PeopleIcon,
  Warning as WarningIcon,
  PersonOff as PersonOffIcon,
  Groups as GroupsIcon,
} from '@mui/icons-material';
import type { AllocationDashboard } from '@shared/interfaces/config/index.types';
import {
  SummaryCard,
  SummaryCardIcon,
  SummaryCardContent,
  SummaryCardValue,
  SummaryCardLabel,
  SectionCard,
  SectionTitle,
  MemberItem,
  MemberInfo,
  EmptyState,
  CardsGrid,
  ContentGrid,
} from './TeamDashboard/styles';
import { getInitials, ROLE_COLORS } from '@renderer/utils/member';
import { GanttPage } from '@renderer/pages/Gantt';

export function AllocationDashboardTab() {
  const [data, setData] = useState<AllocationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [azureConfigured, setAzureConfigured] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check Azure DevOps configuration
      try {
        const configResponse = await window.electronAPI.azureDevOps.getConfig();
        setAzureConfigured(
          configResponse.success && !!configResponse.data?.isConfigured,
        );
      } catch {
        setAzureConfigured(false);
      }

      const response =
        await window.electronAPI.dashboard.getAllocationDashboard();
      if (!response.success) {
        setError(response.error || 'Erro ao buscar dados de alocação');
        return;
      }
      setData(response.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="40vh">
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Carregando dados de alocação...
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack alignItems="center" justifyContent="center" minHeight="40vh">
        <WarningIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Stack>
    );
  }

  if (!data) return null;

  const maxAllocationCount = Math.max(
    ...data.allocationsByTeam.map((t) => t.count),
    1,
  );

  return (
    <Box>
      {!azureConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Configuração do Azure DevOps não definida. Configure a integração em
          Sistema &gt; Azure DevOps para sincronizar dados.
        </Alert>
      )}
      <CardsGrid>
        <SummaryCard $variant="success">
          <SummaryCardIcon $variant="success">
            <PeopleIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Alocações Ativas</SummaryCardLabel>
            <SummaryCardValue>{data.activeAllocations}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>

        <SummaryCard $variant="primary">
          <SummaryCardIcon $variant="primary">
            <GroupsIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Membros Alocados</SummaryCardLabel>
            <SummaryCardValue>{data.membersAllocated}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>

        <SummaryCard $variant="warning">
          <SummaryCardIcon $variant="warning">
            <PersonOffIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Sem Alocação</SummaryCardLabel>
            <SummaryCardValue>
              {data.membersWithoutAllocation.length}
            </SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>

        <SummaryCard $variant="error">
          <SummaryCardIcon $variant="error">
            <WarningIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Conflitos</SummaryCardLabel>
            <SummaryCardValue>
              {data.allocationConflicts.length}
            </SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>
      </CardsGrid>

      <ContentGrid>
        {/* Alocações por Equipe */}
        <SectionCard>
          <SectionTitle>
            <Typography variant="h6" fontWeight={600}>
              <GroupsIcon
                sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }}
              />
              Alocações por Equipe
            </Typography>
            <Chip
              label={`${data.allocationsByTeam.length} equipe(s)`}
              size="small"
              variant="outlined"
            />
          </SectionTitle>

          {data.allocationsByTeam.length > 0 ? (
            <Stack spacing={1.5}>
              {data.allocationsByTeam.map((team) => (
                <Stack
                  key={team.teamName}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                >
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: '0.7rem',
                      bgcolor: 'primary.main',
                    }}
                  >
                    {team.count}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">{team.teamName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {team.count} membro(s)
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(team.count / maxAllocationCount) * 100}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </Stack>
              ))}
            </Stack>
          ) : (
            <EmptyState>
              <Typography variant="body2" color="text.secondary">
                Nenhuma alocação registrada
              </Typography>
            </EmptyState>
          )}
        </SectionCard>

        {/* Membros sem Alocação */}
        <SectionCard>
          <SectionTitle>
            <Typography variant="h6" fontWeight={600}>
              <PersonOffIcon
                sx={{ mr: 1, verticalAlign: 'middle', color: 'info.main' }}
              />
              Membros sem Alocação
            </Typography>
            <Chip
              label={`${data.membersWithoutAllocation.length} membro(s)`}
              size="small"
              color="info"
              variant="outlined"
            />
          </SectionTitle>

          {data.membersWithoutAllocation.length > 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {data.membersWithoutAllocation.map((member) => (
                <MemberItem
                  key={member.id}
                  sx={{ flex: '0 0 auto', minWidth: 240, maxWidth: 320 }}
                >
                  <Avatar
                    sx={{
                      bgcolor:
                        ROLE_COLORS[member.role as keyof typeof ROLE_COLORS] ||
                        '#9e9e9e',
                      width: 36,
                      height: 36,
                    }}
                  >
                    {getInitials(member.name)}
                  </Avatar>
                  <MemberInfo>
                    <Typography variant="body2" fontWeight={500}>
                      {member.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {member.email}
                    </Typography>
                  </MemberInfo>
                  <Chip
                    label="Disponível"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                </MemberItem>
              ))}
            </Box>
          ) : (
            <EmptyState>
              <Typography variant="body2" color="text.secondary">
                Todos os membros possuem alocação
              </Typography>
            </EmptyState>
          )}
        </SectionCard>
      </ContentGrid>

      {/* Conflitos de Alocação */}
      {data.allocationConflicts.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <SectionCard>
            <SectionTitle>
              <Typography variant="h6" fontWeight={600}>
                <WarningIcon
                  sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }}
                />
                Conflitos de Alocação
              </Typography>
              <Chip
                label={`${data.allocationConflicts.length} conflito(s)`}
                size="small"
                color="error"
                variant="outlined"
              />
            </SectionTitle>

            <Stack spacing={1}>
              {data.allocationConflicts.map((conflict, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'error.50',
                    border: '1px solid',
                    borderColor: 'error.200',
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {conflict.memberName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Alocado em <strong>{conflict.allocatedTeamName}</strong>,
                    mas com tarefa em <strong>{conflict.taskTeamName}</strong>:{' '}
                    {conflict.taskTitle}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </SectionCard>
        </Box>
      )}

      {/* Gantt Chart - Integrado ao Dashboard de Alocação */}
      <Divider sx={{ my: 3 }} />
      <GanttPage />
    </Box>
  );
}
