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
  Assignment as TaskIcon,
  Warning as WarningIcon,
  Groups as GroupsIcon,
  Category as CategoryIcon,
  PersonOff as PersonOffIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import type { TaskManagementDashboard } from '@shared/interfaces/config/index.types';
import { getStatusColor as getStatusColorFromMap } from '@shared/constants/status-colors';
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

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  code_review: 'Code Review',
  testing: 'Em Teste',
  done: 'Concluído',
  cancelled: 'Cancelado',
};

const statusColors = (status: string): string => getStatusColorFromMap(status);

const typeLabels: Record<string, string> = {
  task: 'Tarefa',
  bug: 'Bug',
  user_story: 'User Story',
  feature: 'Feature',
  epic: 'Épico',
};

const typeColors: Record<string, string> = {
  task: '#2563EB',
  bug: '#DC2626',
  user_story: '#16A34A',
  feature: '#D97706',
  epic: '#7C3AED',
};

export function TaskManagementDashboardTab() {
  const [data, setData] = useState<TaskManagementDashboard | null>(null);
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
        await window.electronAPI.dashboard.getTaskManagementDashboard();
      if (!response.success) {
        setError(response.error || 'Erro ao buscar dados de tarefas');
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
          Carregando dados de tarefas...
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
            <TaskIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Total de Tarefas</SummaryCardLabel>
            <SummaryCardValue>{data.totalTasks}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>

        <SummaryCard $variant="info">
          <SummaryCardIcon $variant="info">
            <CategoryIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Tipos Diferentes</SummaryCardLabel>
            <SummaryCardValue>{data.tasksByType.length}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>

        <SummaryCard $variant="success">
          <SummaryCardIcon $variant="success">
            <GroupsIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Equipes com Tarefas</SummaryCardLabel>
            <SummaryCardValue>{data.tasksByTeam.length}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>

        <SummaryCard $variant="warning">
          <SummaryCardIcon $variant="warning">
            <PersonOffIcon />
          </SummaryCardIcon>
          <SummaryCardContent>
            <SummaryCardLabel>Não Atribuídas</SummaryCardLabel>
            <SummaryCardValue>{data.unassignedTasks}</SummaryCardValue>
          </SummaryCardContent>
        </SummaryCard>
      </CardsGrid>

      <ContentGrid>
        {/* Tarefas por Status */}
        <SectionCard>
          <SectionTitle>
            <Typography variant="h6" fontWeight={600}>
              <TaskIcon
                sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }}
              />
              Por Status
            </Typography>
          </SectionTitle>

          {data.tasksByStatus.length > 0 ? (
            <Stack spacing={1}>
              {data.tasksByStatus
                .sort((a, b) => b.count - a.count)
                .map(({ status, count }) => (
                  <Stack
                    key={status}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                  >
                    <DotIcon
                      sx={{
                        fontSize: 10,
                        color: statusColors(status),
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
                        bgcolor: statusColors(status) + '20',
                        color: statusColors(status),
                      }}
                    />
                    <Box sx={{ width: 60 }}>
                      <LinearProgress
                        variant="determinate"
                        value={
                          data.totalTasks > 0
                            ? (count / data.totalTasks) * 100
                            : 0
                        }
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                            bgcolor: statusColors(status),
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                ))}
            </Stack>
          ) : (
            <EmptyState>
              <Typography variant="body2" color="text.secondary">
                Nenhuma tarefa encontrada
              </Typography>
            </EmptyState>
          )}
        </SectionCard>

        {/* Tarefas por Tipo */}
        <SectionCard>
          <SectionTitle>
            <Typography variant="h6" fontWeight={600}>
              <CategoryIcon
                sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }}
              />
              Por Tipo
            </Typography>
          </SectionTitle>

          {data.tasksByType.length > 0 ? (
            <Stack spacing={1}>
              {data.tasksByType
                .sort((a, b) => b.count - a.count)
                .map(({ type, count }) => (
                  <Stack
                    key={type}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                  >
                    <DotIcon
                      sx={{
                        fontSize: 10,
                        color: typeColors[type] || '#64748B',
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {typeLabels[type] || type}
                    </Typography>
                    <Chip
                      label={count}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: (typeColors[type] || '#64748B') + '20',
                        color: typeColors[type] || '#64748B',
                      }}
                    />
                    <Box sx={{ width: 60 }}>
                      <LinearProgress
                        variant="determinate"
                        value={
                          data.totalTasks > 0
                            ? (count / data.totalTasks) * 100
                            : 0
                        }
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 2,
                            bgcolor: typeColors[type] || '#64748B',
                          },
                        }}
                      />
                    </Box>
                  </Stack>
                ))}
            </Stack>
          ) : (
            <EmptyState>
              <Typography variant="body2" color="text.secondary">
                Nenhuma tarefa encontrada
              </Typography>
            </EmptyState>
          )}
        </SectionCard>
      </ContentGrid>

      {/* Tarefas por Equipe */}
      {data.tasksByTeam.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <SectionCard>
            <SectionTitle>
              <Typography variant="h6" fontWeight={600}>
                <GroupsIcon
                  sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }}
                />
                Tarefas por Equipe
              </Typography>
            </SectionTitle>

            <Stack spacing={1}>
              {data.tasksByTeam
                .sort((a, b) => b.count - a.count)
                .map(({ teamName, count }) => {
                  const maxCount = Math.max(
                    ...data.tasksByTeam.map((t) => t.count),
                    1,
                  );
                  return (
                    <Stack
                      key={teamName}
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                    >
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {teamName}
                      </Typography>
                      <Chip label={count} size="small" variant="outlined" />
                      <Box sx={{ width: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(count / maxCount) * 100}
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
