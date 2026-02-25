import { useEffect, useState, useCallback, useMemo } from 'react';
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
  LinearProgress,
  Button,
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
  TrendingUp as TrendingUpIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { useDashboard } from '@renderer/hooks/useDashboard';
import { useTeams } from '@renderer/hooks/useTeams';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useTeamMemberAllocations } from '@renderer/hooks/useTeamMemberAllocations';
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
  Sprint,
} from '@shared/interfaces/config/index.types';
import { getInitials, ROLE_COLORS } from '@renderer/utils/member';

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

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  code_review: 'Code Review',
  testing: 'Em Teste',
  done: 'Concluído',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  backlog: '#9e9e9e',
  todo: '#2196F3',
  in_progress: '#FF9800',
  code_review: '#9C27B0',
  testing: '#00BCD4',
  done: '#4CAF50',
  cancelled: '#f44336',
};

const COLLAPSED_LIMIT = 4;

const getDefaultPeriod = (): DashboardPeriod => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { startDate, endDate };
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
  const { sprints, findAll: findAllSprints } = useSprints();
  const { tasks, findAll: findAllTasks } = useTasks();
  const { teamMembers, findAll: findAllMembers } = useTeamMembers();
  const { findAll: findAllAllocations } = useTeamMemberAllocations();

  const [period, setPeriod] = useState<DashboardPeriod>(getDefaultPeriod);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [showAllUnallocated, setShowAllUnallocated] = useState(false);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [now] = useState(() => new Date());

  const loadDashboardData = useCallback(async () => {
    clearError();
    await Promise.all([
      getSummary(period),
      findAllTeams(),
      findAllSprints(),
      findAllTasks(),
      findAllMembers({ isActive: true }),
      findAllAllocations({ isActive: true }),
    ]);
    setLastUpdated(new Date());
  }, [
    getSummary,
    findAllTeams,
    findAllSprints,
    findAllTasks,
    findAllMembers,
    findAllAllocations,
    period,
    clearError,
  ]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSetCurrentMonth = () => setPeriod(getDefaultPeriod());

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
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  // Computed metrics
  const activeTeams = useMemo(() => teams.filter((t) => t.isActive), [teams]);
  const totalMembers = useMemo(
    () => activeTeams.reduce((acc, t) => acc + (t.members?.length ?? 0), 0),
    [activeTeams],
  );

  const currentSprint = useMemo<Sprint | null>(() => {
    const now = new Date();
    return (
      sprints.find((s) => {
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        return s.isActive && start <= now && end >= now;
      }) ?? null
    );
  }, [sprints]);

  const sprintTasks = useMemo(
    () =>
      currentSprint ? tasks.filter((t) => t.sprintId === currentSprint.id) : [],
    [tasks, currentSprint],
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, number> = {};
    sprintTasks.forEach((t) => {
      grouped[t.status] = (grouped[t.status] || 0) + 1;
    });
    return grouped;
  }, [sprintTasks]);

  const roleDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    teamMembers.forEach((m) => {
      if (m.isActive) {
        dist[m.role] = (dist[m.role] || 0) + 1;
      }
    });
    return Object.entries(dist)
      .map(([role, count]) => ({ role: role as TeamMemberRole, count }))
      .sort((a, b) => b.count - a.count);
  }, [teamMembers]);

  const allocationRate = useMemo(() => {
    if (!summary?.activeMembers) return 0;
    return Math.round(
      ((summary.activeMembers - membersWithoutAllocation.length) /
        summary.activeMembers) *
        100,
    );
  }, [summary, membersWithoutAllocation]);

  const sprintProgress = useMemo(() => {
    if (!currentSprint) return 0;
    const start = new Date(currentSprint.startDate).getTime();
    const end = new Date(currentSprint.endDate).getTime();
    const nowMs = now.getTime();
    if (nowMs >= end) return 100;
    if (nowMs <= start) return 0;
    return Math.round(((nowMs - start) / (end - start)) * 100);
  }, [currentSprint, now]);

  const completedTasks = useMemo(
    () =>
      sprintTasks.filter((t) => t.status === 'done' || t.status === 'completed')
        .length,
    [sprintTasks],
  );

  const teamsToShow = showAllTeams
    ? activeTeams
    : activeTeams.slice(0, COLLAPSED_LIMIT);
  const unallocatedToShow = showAllUnallocated
    ? membersWithoutAllocation
    : membersWithoutAllocation.slice(0, COLLAPSED_LIMIT);

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
                {lastUpdated.toLocaleString('pt-BR')}
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
            Período:
          </Typography>
          <DatePicker
            label="Início"
            value={period.startDate}
            onChange={(v) => v && setPeriod((p) => ({ ...p, startDate: v }))}
            slotProps={{
              textField: {
                size: 'small',
                sx: { minWidth: 150 },
                slotProps: { inputLabel: { shrink: true } },
              },
            }}
          />
          <DatePicker
            label="Fim"
            value={period.endDate}
            onChange={(v) => v && setPeriod((p) => ({ ...p, endDate: v }))}
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

        {/* Sprint Atual + Distribuição por Cargo */}
        <ContentGrid>
          {/* Sprint Atual */}
          <SectionCard>
            <SectionTitle>
              <Typography variant="h6" fontWeight={600}>
                <CalendarIcon
                  sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }}
                />
                Sprint Atual
              </Typography>
              {currentSprint && (
                <Chip
                  label={`${formatDate(currentSprint.startDate)} - ${formatDate(currentSprint.endDate)}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </SectionTitle>

            {currentSprint ? (
              <Stack spacing={2}>
                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.5}
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      {currentSprint.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {sprintProgress}% do tempo
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={sprintProgress}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>

                <Stack direction="row" spacing={2}>
                  <Box
                    sx={{
                      flex: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h5" fontWeight={700}>
                      {sprintTasks.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total de Tarefas
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color="success.main"
                    >
                      {completedTasks}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Concluídas
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h5" fontWeight={700} color="info.main">
                      {sprintTasks.length > 0
                        ? Math.round(
                            (completedTasks / sprintTasks.length) * 100,
                          )
                        : 0}
                      %
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Progresso
                    </Typography>
                  </Box>
                </Stack>

                {/* Tasks by status */}
                {Object.keys(tasksByStatus).length > 0 && (
                  <Stack spacing={1}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                      textTransform="uppercase"
                    >
                      Distribuição por Status
                    </Typography>
                    {Object.entries(tasksByStatus)
                      .sort(([, a], [, b]) => b - a)
                      .map(([status, count]) => (
                        <Stack
                          key={status}
                          direction="row"
                          alignItems="center"
                          spacing={1}
                        >
                          <DotIcon
                            sx={{
                              fontSize: 10,
                              color:
                                statusColors[status] || statusColors.backlog,
                            }}
                          />
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {statusLabels[status] || status}
                          </Typography>
                          <Chip
                            label={count}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              bgcolor:
                                (statusColors[status] || statusColors.backlog) +
                                '20',
                              color:
                                statusColors[status] || statusColors.backlog,
                            }}
                          />
                          <Box sx={{ width: 60 }}>
                            <LinearProgress
                              variant="determinate"
                              value={
                                sprintTasks.length > 0
                                  ? (count / sprintTasks.length) * 100
                                  : 0
                              }
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 2,
                                  bgcolor:
                                    statusColors[status] ||
                                    statusColors.backlog,
                                },
                              }}
                            />
                          </Box>
                        </Stack>
                      ))}
                  </Stack>
                )}
              </Stack>
            ) : (
              <EmptyState>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma sprint ativa no momento
                </Typography>
              </EmptyState>
            )}
          </SectionCard>

          {/* Distribuição por Cargo + Resumo Rápido */}
          <Stack spacing={1.5}>
            {/* Distribuição por Cargo */}
            <SectionCard>
              <SectionTitle>
                <Typography variant="h6" fontWeight={600}>
                  <TrendingUpIcon
                    sx={{
                      mr: 1,
                      verticalAlign: 'middle',
                      color: 'secondary.main',
                    }}
                  />
                  Distribuição por Cargo
                </Typography>
                <Chip
                  label={`${teamMembers.filter((m) => m.isActive).length} ativos`}
                  size="small"
                  variant="outlined"
                />
              </SectionTitle>

              {roleDistribution.length > 0 ? (
                <Stack spacing={1}>
                  {roleDistribution.map(({ role, count }) => {
                    const total = teamMembers.filter((m) => m.isActive).length;
                    const pct =
                      total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <Stack
                        key={role}
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                      >
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.65rem',
                            bgcolor: roleColors[role],
                          }}
                        >
                          {count}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2">
                              {roleLabels[role]}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {pct}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 2,
                                bgcolor: roleColors[role],
                              },
                            }}
                          />
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              ) : (
                <EmptyState>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum membro cadastrado
                  </Typography>
                </EmptyState>
              )}
            </SectionCard>

            {/* Resumo Rápido */}
            <SectionCard>
              <SectionTitle>
                <Typography variant="h6" fontWeight={600}>
                  <SpeedIcon
                    sx={{
                      mr: 1,
                      verticalAlign: 'middle',
                      color: 'warning.main',
                    }}
                  />
                  Resumo Rápido
                </Typography>
              </SectionTitle>

              <Stack spacing={1.5}>
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
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color="success.main"
                  >
                    {allocationRate}%
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
                      Média de Membros/Equipe
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
                  <PersonOffIcon color="warning" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      Membros Disponíveis
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sem alocação no período
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color="warning.main"
                  >
                    {membersWithoutAllocation.length}
                  </Typography>
                </Box>
              </Stack>
            </SectionCard>
          </Stack>
        </ContentGrid>

        {/* Teams + Unallocated Members */}
        <ContentGrid sx={{ mt: 1.5 }}>
          {/* Equipes e Integrantes */}
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
                {teamsToShow.map((team) => (
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

                {activeTeams.length > COLLAPSED_LIMIT && (
                  <Button
                    size="small"
                    onClick={() => setShowAllTeams((v) => !v)}
                    sx={{ alignSelf: 'center' }}
                  >
                    {showAllTeams
                      ? 'Ver menos'
                      : `Ver mais (${activeTeams.length - COLLAPSED_LIMIT})`}
                  </Button>
                )}
              </Stack>
            ) : (
              <EmptyState>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma equipe cadastrada
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
                label={`${membersWithoutAllocation.length} membro(s)`}
                size="small"
                color="info"
                variant="outlined"
              />
            </SectionTitle>

            {membersWithoutAllocation.length > 0 ? (
              <Stack spacing={1}>
                {unallocatedToShow.map((member) => (
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

                {membersWithoutAllocation.length > COLLAPSED_LIMIT && (
                  <Button
                    size="small"
                    onClick={() => setShowAllUnallocated((v) => !v)}
                    sx={{ alignSelf: 'center' }}
                  >
                    {showAllUnallocated
                      ? 'Ver menos'
                      : `Ver mais (${membersWithoutAllocation.length - COLLAPSED_LIMIT})`}
                  </Button>
                )}
              </Stack>
            ) : (
              <EmptyState>
                <Typography variant="body2" color="text.secondary">
                  Todos os membros ativos possuem alocação no período
                </Typography>
              </EmptyState>
            )}
          </SectionCard>
        </ContentGrid>
      </PageLayout>
    </LocalizationProvider>
  );
}

export default TeamDashboardPage;
