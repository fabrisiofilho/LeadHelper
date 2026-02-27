import { useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Grid,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as TaskIcon,
  EventNote as AllocationIcon,
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  PersonOff as PersonOffIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useDashboard } from '@renderer/hooks/useDashboard';
import { useTeams } from '@renderer/hooks/useTeams';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import type {
  DashboardPeriod,
  Sprint,
} from '@shared/interfaces/config/index.types';

interface OverviewTabProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export function OverviewTab({ period }: OverviewTabProps) {
  const { summary, membersWithoutAllocation } = useDashboard();
  const { teams } = useTeams();
  const { sprints } = useSprints();
  const { tasks } = useTasks();
  const { teamMembers } = useTeamMembers();

  const activeTeams = useMemo(() => teams.filter((t) => t.isActive), [teams]);

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

  const completedTasks = useMemo(
    () =>
      sprintTasks.filter((t) => t.status === 'done' || t.status === 'completed')
        .length,
    [sprintTasks],
  );

  const allocationRate = useMemo(() => {
    if (!summary?.activeMembers) return 0;
    return Math.round(
      ((summary.activeMembers - membersWithoutAllocation.length) /
        summary.activeMembers) *
        100,
    );
  }, [summary, membersWithoutAllocation]);

  const Card = ({ icon, label, value, color }: any) => (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: `${color}.lighter`,
            color: `${color}.main`,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            icon={<PeopleIcon />}
            label="Membros Ativos"
            value={summary?.activeMembers ?? 0}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            icon={<TaskIcon />}
            label="Tarefas em Andamento"
            value={summary?.tasksInProgress ?? 0}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            icon={<AllocationIcon />}
            label="Alocações Ativas"
            value={summary?.totalAllocations ?? 0}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            icon={<GroupsIcon />}
            label="Equipes Ativas"
            value={activeTeams.length}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" fontWeight={600} mb={2}>
              Sprint Atual
            </Typography>
            {currentSprint ? (
              <Stack spacing={2}>
                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    mb={0.5}
                  >
                    <Typography variant="subtitle2">
                      {currentSprint.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {completedTasks}/{sprintTasks.length} tarefas
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={
                      sprintTasks.length > 0
                        ? (completedTasks / sprintTasks.length) * 100
                        : 0
                    }
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography variant="h6">{sprintTasks.length}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography variant="h6" color="success.main">
                        {completedTasks}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Concluídas
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography variant="h6" color="info.main">
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
                  </Grid>
                </Grid>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma sprint ativa
              </Typography>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" fontWeight={600} mb={2}>
              Indicadores Rápidos
            </Typography>
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
                    Membros com alocação ativa
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} color="success.main">
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
                <PersonOffIcon color="warning" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    Membros Disponíveis
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sem alocação no período
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} color="warning.main">
                  {membersWithoutAllocation.length}
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
                <TrendingUpIcon color="info" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    Média Membros/Equipe
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Distribuição entre equipes
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} color="info.main">
                  {activeTeams.length
                    ? (
                        teamMembers.filter((m) => m.isActive).length /
                        activeTeams.length
                      ).toFixed(1)
                    : 0}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Grid>
      </Grid>
    </Stack>
  );
}
