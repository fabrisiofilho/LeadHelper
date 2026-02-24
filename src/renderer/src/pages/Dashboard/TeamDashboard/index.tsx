import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  AvatarGroup,
  Collapse,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import {
  People as PeopleIcon,
  Assignment as TaskIcon,
  EventNote as AllocationIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  PersonOff as PersonOffIcon,
  CalendarMonth as CalendarIcon,
  Groups as GroupsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useDashboard } from '@renderer/hooks/useDashboard';
import { useTeams } from '@renderer/hooks/useTeams';
import { PageLayout } from '@renderer/components/PageLayout';
import {
  SummaryCard,
  SummaryCardIcon,
  SummaryCardContent,
  SummaryCardValue,
  SummaryCardLabel,
  FiltersContainer,
  SectionCard,
  SectionTitle,
  MemberItem,
  MemberInfo,
  EmptyState,
  CardsGrid,
  ContentGrid,
  TeamCard,
  TeamHeader,
  TeamMembersList,
  MemberAvatar,
  TeamStats,
} from './styles';
import type {
  DashboardPeriod,
  TeamMemberRole,
} from '@shared/interfaces/config/index.types';

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
  developer: '#2196F3',
  analyst: '#9C27B0',
  qa: '#4CAF50',
  tech_lead: '#FF9800',
  devops: '#00BCD4',
  designer: '#E91E63',
  product_owner: '#673AB7',
};

const getDefaultPeriod = (): DashboardPeriod => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { startDate, endDate };
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function TeamDashboardPage() {
  const {
    loading,
    error,
    summary,
    membersWithoutAllocation,
    getSummary,
    clearError,
  } = useDashboard();

  const { teams, findAll: findAllTeams, loading: teamsLoading } = useTeams();

  const [period, setPeriod] = useState<DashboardPeriod>(getDefaultPeriod);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());

  const loadDashboardData = useCallback(async () => {
    clearError();
    await Promise.all([getSummary(period), findAllTeams()]);
    setLastUpdated(new Date());
  }, [getSummary, findAllTeams, period, clearError]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSetCurrentMonth = () => {
    setPeriod(getDefaultPeriod());
  };

  const handleSetCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    setPeriod({ startDate, endDate });
  };

  const toggleTeamExpanded = (teamId: number) => {
    setExpandedTeams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  const activeTeams = teams.filter((team) => team.isActive);
  const totalMembers = activeTeams.reduce(
    (acc, team) => acc + (team.members?.length ?? 0),
    0,
  );

  if ((loading || teamsLoading) && !summary) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando dados do dashboard...
          </Typography>
        </Stack>
      </PageLayout>
    );
  }

  if (error && !summary) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <IconButton onClick={loadDashboardData} sx={{ mt: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </PageLayout>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <PageLayout>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Dashboard da Equipe
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Visão geral da situação da equipe e alocações
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            {lastUpdated && (
              <Typography variant="caption" color="text.secondary">
                Atualizado em {lastUpdated.toLocaleString('pt-BR')}
              </Typography>
            )}
            <Tooltip title="Atualizar dados">
              <IconButton
                onClick={loadDashboardData}
                size="small"
                disabled={loading || teamsLoading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Period Selector */}
        <FiltersContainer>
          <CalendarIcon color="action" />
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            Período de análise:
          </Typography>
          <DatePicker
            label="Data Início"
            value={period.startDate}
            onChange={(newValue) => {
              if (newValue) {
                setPeriod((prev) => ({ ...prev, startDate: newValue }));
              }
            }}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
                slotProps: { inputLabel: { shrink: true } },
              },
            }}
          />
          <DatePicker
            label="Data Fim"
            value={period.endDate}
            onChange={(newValue) => {
              if (newValue) {
                setPeriod((prev) => ({ ...prev, endDate: newValue }));
              }
            }}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
                slotProps: { inputLabel: { shrink: true } },
              },
            }}
          />
          <Chip
            label="Semana Atual"
            size="small"
            variant="outlined"
            onClick={handleSetCurrentWeek}
            sx={{ cursor: 'pointer' }}
          />
          <Chip
            label="Mês Atual"
            size="small"
            variant="outlined"
            onClick={handleSetCurrentMonth}
            sx={{ cursor: 'pointer' }}
          />
        </FiltersContainer>

        {/* Summary Cards */}
        <CardsGrid>
          <SummaryCard $variant="primary">
            <SummaryCardIcon $variant="primary">
              <PeopleIcon />
            </SummaryCardIcon>
            <SummaryCardContent>
              <SummaryCardLabel>Membros Ativos</SummaryCardLabel>
              <SummaryCardValue>{summary?.activeMembers ?? 0}</SummaryCardValue>
            </SummaryCardContent>
          </SummaryCard>

          <SummaryCard $variant="info">
            <SummaryCardIcon $variant="info">
              <TaskIcon />
            </SummaryCardIcon>
            <SummaryCardContent>
              <SummaryCardLabel>Tarefas em Andamento</SummaryCardLabel>
              <SummaryCardValue>
                {summary?.tasksInProgress ?? 0}
              </SummaryCardValue>
            </SummaryCardContent>
          </SummaryCard>

          <SummaryCard $variant="success">
            <SummaryCardIcon $variant="success">
              <AllocationIcon />
            </SummaryCardIcon>
            <SummaryCardContent>
              <SummaryCardLabel>Alocações Ativas</SummaryCardLabel>
              <SummaryCardValue>
                {summary?.totalAllocations ?? 0}
              </SummaryCardValue>
            </SummaryCardContent>
          </SummaryCard>

          <SummaryCard $variant="warning">
            <SummaryCardIcon $variant="warning">
              <GroupsIcon />
            </SummaryCardIcon>
            <SummaryCardContent>
              <SummaryCardLabel>Equipes Ativas</SummaryCardLabel>
              <SummaryCardValue>{activeTeams.length}</SummaryCardValue>
            </SummaryCardContent>
          </SummaryCard>
        </CardsGrid>

        {/* Content Grid */}
        <ContentGrid>
          {/* Teams with Members */}
          <SectionCard $fullWidth>
            <SectionTitle>
              <Typography variant="h6" fontWeight={600}>
                <GroupsIcon
                  sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }}
                />
                Equipes e Integrantes
              </Typography>
              <Chip
                label={`${activeTeams.length} equipe(s) • ${totalMembers} membro(s)`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </SectionTitle>

            {activeTeams.length > 0 ? (
              <Stack spacing={2}>
                {activeTeams.map((team) => (
                  <TeamCard key={team.id}>
                    <TeamHeader
                      onClick={() => toggleTeamExpanded(team.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <GroupsIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {team.name}
                          </Typography>
                          {team.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {team.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <TeamStats>
                          <Chip
                            icon={<PeopleIcon />}
                            label={`${team.members?.length ?? 0} membros`}
                            size="small"
                            variant="outlined"
                          />
                        </TeamStats>
                        {team.members && team.members.length > 0 && (
                          <AvatarGroup max={4} sx={{ mr: 1 }}>
                            {team.members.map((member) => (
                              <Tooltip key={member.id} title={member.name}>
                                <MemberAvatar
                                  sx={{
                                    bgcolor: roleColors[member.role],
                                    width: 32,
                                    height: 32,
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {getInitials(member.name)}
                                </MemberAvatar>
                              </Tooltip>
                            ))}
                          </AvatarGroup>
                        )}
                        <IconButton size="small">
                          {expandedTeams.has(team.id) ? (
                            <ExpandLessIcon />
                          ) : (
                            <ExpandMoreIcon />
                          )}
                        </IconButton>
                      </Box>
                    </TeamHeader>
                    <Collapse in={expandedTeams.has(team.id)}>
                      <TeamMembersList>
                        {team.members && team.members.length > 0 ? (
                          team.members.map((member) => (
                            <MemberItem key={member.id}>
                              <Avatar
                                sx={{
                                  bgcolor: roleColors[member.role],
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
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {roleLabels[member.role]} • {member.email}
                                </Typography>
                              </MemberInfo>
                              <Chip
                                label={member.isActive ? 'Ativo' : 'Inativo'}
                                size="small"
                                color={member.isActive ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </MemberItem>
                          ))
                        ) : (
                          <EmptyState>
                            <Typography variant="body2" color="text.secondary">
                              Nenhum membro nesta equipe
                            </Typography>
                          </EmptyState>
                        )}
                      </TeamMembersList>
                    </Collapse>
                  </TeamCard>
                ))}
              </Stack>
            ) : (
              <EmptyState>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma equipe cadastrada
                </Typography>
              </EmptyState>
            )}
          </SectionCard>

          {/* Members without Allocation */}
          <SectionCard>
            <SectionTitle>
              <Typography variant="h6" fontWeight={600}>
                <PersonOffIcon
                  sx={{ mr: 1, verticalAlign: 'middle', color: 'info.main' }}
                />
                Membros sem Alocação
              </Typography>
              <Chip
                label={`${membersWithoutAllocation.length} membro(s)`}
                size="small"
                color="info"
                variant="outlined"
              />
            </SectionTitle>

            {membersWithoutAllocation.length > 0 ? (
              <Stack spacing={1}>
                {membersWithoutAllocation.map((member) => (
                  <MemberItem key={member.id}>
                    <Avatar
                      sx={{
                        bgcolor: roleColors[member.role],
                        width: 36,
                        height: 36,
                      }}
                    >
                      {getInitials(member.name)}
                    </Avatar>
                    <MemberInfo>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {member.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {roleLabels[member.role]} • {member.email}
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
              </Stack>
            ) : (
              <EmptyState>
                <Typography variant="body2" color="text.secondary">
                  Todos os membros ativos possuem alocação no período
                </Typography>
              </EmptyState>
            )}
          </SectionCard>

          {/* Quick Stats */}
          <SectionCard>
            <SectionTitle>
              <Typography variant="h6" fontWeight={600}>
                <SpeedIcon
                  sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }}
                />
                Resumo Rápido
              </Typography>
            </SectionTitle>

            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                }}
              >
                <CheckCircleIcon color="success" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    Taxa de Alocação
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Membros com alocação no período
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {summary?.activeMembers
                    ? Math.round(
                        ((summary.activeMembers -
                          membersWithoutAllocation.length) /
                          summary.activeMembers) *
                          100,
                      )
                    : 0}
                  %
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                }}
              >
                <ScheduleIcon color="info" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    Média de Membros por Equipe
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Distribuição entre equipes ativas
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} color="info.main">
                  {activeTeams.length
                    ? (totalMembers / activeTeams.length).toFixed(1)
                    : 0}
                </Typography>
              </Box>
            </Stack>
          </SectionCard>
        </ContentGrid>
      </PageLayout>
    </LocalizationProvider>
  );
}

export default TeamDashboardPage;
