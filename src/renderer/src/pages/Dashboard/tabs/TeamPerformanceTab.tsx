import { useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Grid,
  LinearProgress,
  Chip,
  Avatar,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import type { DashboardPeriod } from '@shared/interfaces/config/index.types';
import { getInitials, ROLE_COLORS } from '@renderer/utils/member';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for interface compatibility
interface TeamPerformanceTabProps {
  period: DashboardPeriod;
}

export function TeamPerformanceTab() {
  const { sprints } = useSprints();
  const { tasks } = useTasks();
  const { teamMembers } = useTeamMembers();

  const completedSprints = useMemo(() => {
    return sprints
      .filter((s) => {
        const end = new Date(s.endDate);
        return end < new Date() && s.isActive;
      })
      .slice(0, 5);
  }, [sprints]);

  const velocity = useMemo(() => {
    return completedSprints.map((sprint) => {
      const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
      const completed = sprintTasks.filter(
        (t) => t.status === 'done' || t.status === 'completed',
      );
      const storyPoints = completed.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0,
      );
      return {
        sprint: sprint.name,
        points: storyPoints,
        tasks: completed.length,
      };
    });
  }, [completedSprints, tasks]);

  const avgVelocity = useMemo(() => {
    if (velocity.length === 0) return 0;
    return Math.round(
      velocity.reduce((sum, v) => sum + v.points, 0) / velocity.length,
    );
  }, [velocity]);

  const memberProductivity = useMemo(() => {
    return teamMembers
      .filter((m) => m.isActive)
      .map((member) => {
        const memberTasks = tasks.filter(
          (t) => t.assignedToEmail === member.email,
        );
        const completed = memberTasks.filter(
          (t) => t.status === 'done' || t.status === 'completed',
        );
        const inProgress = memberTasks.filter(
          (t) => t.status === 'in_progress',
        );
        return {
          member,
          total: memberTasks.length,
          completed: completed.length,
          inProgress: inProgress.length,
          rate:
            memberTasks.length > 0
              ? Math.round((completed.length / memberTasks.length) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 10);
  }, [teamMembers, tasks]);

  const taskCompletionRate = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (t) => t.status === 'done' || t.status === 'completed',
    ).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [tasks]);

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <SpeedIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" fontWeight={700}>
              {avgVelocity}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Velocity Média (Story Points)
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <CheckCircleIcon
              sx={{ fontSize: 40, color: 'success.main', mb: 1 }}
            />
            <Typography variant="h4" fontWeight={700}>
              {taskCompletionRate}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Taxa de Conclusão
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
            <Typography variant="h4" fontWeight={700}>
              {velocity.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sprints Completas
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <TimerIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h4" fontWeight={700}>
              {tasks.filter((t) => t.status === 'in_progress').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tarefas em Andamento
            </Typography>
          </Box>
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
              Velocity por Sprint
            </Typography>
            {velocity.length > 0 ? (
              <Stack spacing={1.5}>
                {velocity.map((v, idx) => (
                  <Box key={idx}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      mb={0.5}
                    >
                      <Typography variant="body2">{v.sprint}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {v.points} pts • {v.tasks} tarefas
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={
                        avgVelocity > 0 ? (v.points / avgVelocity) * 100 : 0
                      }
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma sprint completa
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
              Top Produtividade
            </Typography>
            {memberProductivity.length > 0 ? (
              <Stack spacing={1}>
                {memberProductivity.map((mp) => (
                  <Box
                    key={mp.member.id}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: ROLE_COLORS[mp.member.role],
                        width: 32,
                        height: 32,
                        fontSize: '0.75rem',
                      }}
                    >
                      {getInitials(mp.member.name)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {mp.member.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {mp.completed} concluídas • {mp.inProgress} em andamento
                      </Typography>
                    </Box>
                    <Chip
                      label={`${mp.rate}%`}
                      size="small"
                      color={
                        mp.rate >= 70
                          ? 'success'
                          : mp.rate >= 40
                            ? 'warning'
                            : 'default'
                      }
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhum dado disponível
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Stack>
  );
}
