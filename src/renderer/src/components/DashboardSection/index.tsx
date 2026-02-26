import { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Skeleton, Chip } from '@mui/material';
import styled from 'styled-components';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import DonutSmallOutlinedIcon from '@mui/icons-material/DonutSmallOutlined';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import type { DashboardMetrics } from '@shared/interfaces/config/index.types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFAB00',
  in_progress: '#00B8D9',
  completed: '#36B37E',
  cancelled: '#FF5630',
};

const DashboardGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;

  @media ${({ theme }) => theme.SIZES.md} {
    grid-template-columns: repeat(2, 1fr);
  }

  @media ${({ theme }) => theme.SIZES.xs} {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const MetricCard = styled(Box)`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 1rem;
  background-color: ${({ theme }) => theme.COLORS.surface};
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.SHADOWS.z_12};
  }
`;

const IconWrapper = styled(Box)<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background-color: ${({ $color }) => `${$color}1a`};
  flex-shrink: 0;

  svg {
    font-size: 1.5rem;
    color: ${({ $color }) => $color};
  }
`;

const CardContent = styled(Box)`
  flex: 1;
  min-width: 0;
`;

const CardValue = styled.p`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: ${({ theme }) => theme.COLORS.text};
`;

const CardLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.COLORS.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatusBarRow = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const StatusLabel = styled(Typography)`
  font-size: 0.7rem;
  min-width: 80px;
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;

const StatusCount = styled(Typography)`
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 24px;
  text-align: right;
  color: ${({ theme }) => theme.COLORS.text};
`;

function formatDate(date?: Date): string {
  if (!date) return 'Nunca';
  const d = new Date(date);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}`;
}

function SkeletonCard() {
  return (
    <MetricCard>
      <Skeleton
        variant="rounded"
        width={48}
        height={48}
        sx={{ borderRadius: '0.75rem' }}
      />
      <CardContent>
        <Skeleton variant="text" width={60} height={32} />
        <Skeleton variant="text" width={100} height={16} />
      </CardContent>
    </MetricCard>
  );
}

export function DashboardSection() {
  const { getDashboardMetrics } = useAzureDevOps();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboardMetrics().then((data) => {
      if (!cancelled) {
        setMetrics(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [getDashboardMetrics]);

  if (loading) {
    return (
      <DashboardGrid>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </DashboardGrid>
    );
  }

  const total = metrics?.totalImported ?? 0;
  const maxCount = Math.max(
    ...(metrics?.byStatus ?? []).map((s) => s.count),
    1,
  );

  return (
    <DashboardGrid>
      {/* Total importado */}
      <MetricCard>
        <IconWrapper $color="#4d8df7">
          <StorageOutlinedIcon />
        </IconWrapper>
        <CardContent>
          <CardValue>{total}</CardValue>
          <CardLabel>Total Importado</CardLabel>
        </CardContent>
      </MetricCard>

      {/* Última sincronização */}
      <MetricCard>
        <IconWrapper $color="#36B37E">
          <SyncOutlinedIcon />
        </IconWrapper>
        <CardContent>
          <CardValue style={{ fontSize: '1rem' }}>
            {formatDate(metrics?.lastSyncDate)}
          </CardValue>
          <CardLabel>Última Sincronização</CardLabel>
        </CardContent>
      </MetricCard>

      {/* Pendentes de sincronização */}
      <MetricCard>
        <IconWrapper $color="#FFAB00">
          <PendingActionsOutlinedIcon />
        </IconWrapper>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CardValue>{metrics?.pendingSync ?? 0}</CardValue>
            {(metrics?.pendingSync ?? 0) > 0 && (
              <Chip
                label="Pendente"
                size="small"
                sx={{
                  bgcolor: '#FFAB001a',
                  color: '#FFAB00',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  height: 20,
                }}
              />
            )}
          </Box>
          <CardLabel>Pendentes de Sync</CardLabel>
        </CardContent>
      </MetricCard>

      {/* Distribuição por status */}
      <MetricCard sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          <IconWrapper $color="#8C65E2">
            <DonutSmallOutlinedIcon />
          </IconWrapper>
          <CardLabel>Distribuição por Status</CardLabel>
        </Box>
        <Box>
          {(metrics?.byStatus ?? []).map(({ status, count }) => (
            <StatusBarRow key={status}>
              <StatusLabel>{STATUS_LABELS[status] ?? status}</StatusLabel>
              <LinearProgress
                variant="determinate"
                value={(count / maxCount) * 100}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: STATUS_COLORS[status] ?? '#919EAB',
                  },
                }}
              />
              <StatusCount>{count}</StatusCount>
            </StatusBarRow>
          ))}
          {(metrics?.byStatus ?? []).length === 0 && (
            <Typography variant="caption" color="textSecondary">
              Sem dados
            </Typography>
          )}
        </Box>
      </MetricCard>
    </DashboardGrid>
  );
}

export default DashboardSection;
