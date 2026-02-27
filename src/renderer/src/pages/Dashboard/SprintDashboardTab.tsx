import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Chip,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import type { SprintDashboard } from '@shared/interfaces/config/index.types';
import {
  SummaryCard,
  SummaryCardIcon,
  SummaryCardContent,
  SummaryCardValue,
  SummaryCardLabel,
  SectionCard,
  SectionTitle,
  EmptyState,
  CardsGrid,
  ContentGrid,
} from './TeamDashboard/styles';

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export function SprintDashboardTab() {
  const [data, setData] = useState<SprintDashboard | null>(null);
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

      const response = await window.electronAPI.dashboard.getSprintDashboard();
      if (!response.success) {
        setError(response.error || 'Erro ao buscar dados de sprints');
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
          Carregando dados de sprints...
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

  return (
    <Box>
      {!azureConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Configuração do Azure DevOps não definida. Configure a integração em
          Sistema &gt; Azure DevOps para sincronizar dados.
        </Alert>
      )}
      <CardsGrid>
        <SummaryCard $variant="primary">
          <SummaryCardIcon $variant="primary">
            <CalendarIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Sprints Ativas</SummaryCardLabel>
            <SummaryCardValue>{data.activeSprints.length}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>

        <SummaryCard $variant="success">
          <SummaryCardIcon $variant="success">
            <CheckCircleIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Sprints Concluídas</SummaryCardLabel>
            <SummaryCardValue>{data.completedSprints}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>

        <SummaryCard $variant="info">
          <SummaryCardIcon $variant="info">
            <SpeedIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Total Tarefas/Sprint</SummaryCardLabel>
            <SummaryCardValue>{data.tasksBySprint.length}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>

        <SummaryCard $variant="warning">
          <SummaryCardIcon $variant="warning">
            <TrendingUpIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Velocity (Sprints)</SummaryCardLabel>
            <SummaryCardValue>{data.velocity.length}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>
      </CardsGrid>

      <ContentGrid>
        {/* Sprints Ativas */}
        <SectionCard>
          <SectionTitle>
            <Typography variant="h6" fontWeight={600}>
              <CalendarIcon
                sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }}
              />
              Sprints Ativas
            </Typography>
          </SectionTitle>

          {data.activeSprints.length > 0 ? (
            <Stack spacing={1.5}>
              {data.activeSprints.map((sprint) => {
                const progress =
                  sprint.totalTasks > 0
                    ? Math.round(
                        (sprint.completedTasks / sprint.totalTasks) * 100,
                      )
                    : 0;
                return (
                  <Box
                    key={sprint.id}
                    sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={0.5}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        {sprint.name}
                      </Typography>
                      <Chip
                        label={`${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                    <Stack direction="row" spacing={2} mb={1}>
                      <Typography variant="caption" color="text.secondary">
                        {sprint.completedTasks}/{sprint.totalTasks} tarefas
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {sprint.totalStoryPoints} story points
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <EmptyState>
              <Typography variant="body2" color="text.secondary">
                Nenhuma sprint ativa no momento
              </Typography>
            </EmptyState>
          )}
        </SectionCard>

        {/* Tarefas por Sprint */}
        <SectionCard>
          <SectionTitle>
            <Typography variant="h6" fontWeight={600}>
              <SpeedIcon
                sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }}
              />
              Tarefas por Sprint
            </Typography>
          </SectionTitle>

          {data.tasksBySprint.length > 0 ? (
            <Stack spacing={1.5}>
              {data.tasksBySprint.map(({ sprintName, total, completed }) => {
                const progress =
                  total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <Box key={sprintName}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      mb={0.5}
                    >
                      <Typography variant="body2">{sprintName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {completed}/{total} ({progress}%)
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 2,
                          bgcolor:
                            progress === 100 ? 'success.main' : 'primary.main',
                        },
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <EmptyState>
              <Typography variant="body2" color="text.secondary">
                Nenhuma sprint com tarefas
              </Typography>
            </EmptyState>
          )}
        </SectionCard>
      </ContentGrid>

      {/* Velocity */}
      {data.velocity.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <SectionCard>
            <SectionTitle>
              <Typography variant="h6" fontWeight={600}>
                <TrendingUpIcon
                  sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }}
                />
                Velocity (Story Points por Sprint)
              </Typography>
            </SectionTitle>

            <Stack spacing={1}>
              {data.velocity.map(({ sprintName, storyPoints }) => {
                const maxPoints = Math.max(
                  ...data.velocity.map((v) => v.storyPoints),
                  1,
                );
                return (
                  <Stack
                    key={sprintName}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {sprintName}
                    </Typography>
                    <Chip
                      label={`${storyPoints} pts`}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                    <Box sx={{ width: 100 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(storyPoints / maxPoints) * 100}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </SectionCard>
        </Box>
      )}
    </Box>
  );
}
