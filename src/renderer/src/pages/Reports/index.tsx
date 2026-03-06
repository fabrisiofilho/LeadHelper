import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import { useTasks } from '@renderer/hooks/useTasks';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTheme } from '@mui/material/styles';
import {
  PageContainer,
  ContentArea,
  FiltersContainer,
  MetricsGrid,
  MetricCard,
} from './styles';

/**
 * Team type options for filtering.
 */
const TEAM_TYPE_OPTIONS = [
  { value: 'all', label: 'Todas as Equipes' },
  { value: 'sustentacao', label: 'Sustentação' },
  { value: 'projetos', label: 'Projetos' },
];

/**
 * Task type options for filtering (Azure DevOps work item types).
 */
const TASK_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'Epic', label: 'Epic' },
  { value: 'Feature', label: 'Feature' },
  { value: 'User Story', label: 'User Story' },
  { value: 'Task', label: 'Task' },
  { value: 'Bug', label: 'Bug' },
];

/**
 * Status color mapping.
 */
const STATUS_COLORS: Record<string, string> = {
  New: '#2196F3',
  Active: '#FFC107',
  'In Progress': '#FFC107',
  Resolved: '#4CAF50',
  Done: '#4CAF50',
  Closed: '#9E9E9E',
  pending: '#2196F3',
  in_progress: '#FFC107',
  completed: '#4CAF50',
  cancelled: '#9E9E9E',
};

/**
 * Completed statuses for velocity calculation.
 */
const COMPLETED_STATUSES = ['completed', 'Done', 'Closed'];

/**
 * Default stale days threshold.
 */
const DEFAULT_STALE_DAYS = 7;

interface ReportsFilters {
  startDate: string;
  endDate: string;
  teamType: string;
  taskType: string;
}

/**
 * Get default date range (last 30 days).
 */
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * ReportsPage - Consolidated reports with metrics.
 */
export function ReportsPage() {
  const theme = useTheme();
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState<ReportsFilters>({
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    teamType: 'all',
    taskType: 'all',
  });
  const [loading, setLoading] = useState(true);

  const { tasks, loading: tasksLoading, findAll: findAllTasks } = useTasks();
  const { findAll: findAllSprints } = useSprints();

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([findAllTasks(), findAllSprints()]);
    setLoading(false);
  }, [findAllTasks, findAllSprints]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter((task) => {
        if (!task.updatedAt) return false;
        const updatedAt = new Date(task.updatedAt);
        return updatedAt >= start && updatedAt <= end;
      });
    }

    if (filters.teamType !== 'all') {
      result = result.filter((task) => {
        if (!task.areaPath) return false;
        if (filters.teamType === 'sustentacao') {
          return task.areaPath.includes('Sustentação');
        }
        if (filters.teamType === 'projetos') {
          return task.areaPath.includes('Projetos');
        }
        return true;
      });
    }

    if (filters.taskType !== 'all') {
      result = result.filter((task) => task.type === filters.taskType);
    }

    return result;
  }, [tasks, filters]);

  const metrics = useMemo(() => {
    const totalItems = filteredTasks.length;

    const statusCounts: Record<string, number> = {};
    for (const task of filteredTasks) {
      const status = task.status ?? 'unknown';
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    const sustentacaoCount = filteredTasks.filter((t) =>
      t.areaPath?.includes('Sustentação'),
    ).length;
    const projetosCount = filteredTasks.filter((t) =>
      t.areaPath?.includes('Projetos'),
    ).length;

    const now = new Date();
    const staleThreshold = new Date();
    staleThreshold.setDate(now.getDate() - DEFAULT_STALE_DAYS);

    const staleItems = filteredTasks.filter((task) => {
      if (!task.updatedAt) return false;
      const updatedAt = new Date(task.updatedAt);
      return (
        updatedAt < staleThreshold && !COMPLETED_STATUSES.includes(task.status)
      );
    }).length;

    const velocity = filteredTasks
      .filter((t) => COMPLETED_STATUSES.includes(t.status))
      .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);

    return {
      totalItems,
      statusCounts,
      sustentacaoCount,
      projetosCount,
      staleItems,
      velocity,
    };
  }, [filteredTasks]);

  const statusDistribution = useMemo(() => {
    const distribution: Array<{
      status: string;
      count: number;
      color: string;
      percent: number;
    }> = [];

    const total = filteredTasks.length || 1;
    for (const [status, count] of Object.entries(metrics.statusCounts)) {
      distribution.push({
        status,
        count,
        color: STATUS_COLORS[status] ?? '#757575',
        percent: Math.round((count / total) * 100),
      });
    }

    return distribution.sort((a, b) => b.count - a.count);
  }, [metrics.statusCounts, filteredTasks.length]);

  const assigneeDistribution = useMemo(() => {
    const assigneeMap = new Map<string, number>();

    for (const task of filteredTasks) {
      const assignee = task.assignedToName ?? 'Não atribuído';
      assigneeMap.set(assignee, (assigneeMap.get(assignee) ?? 0) + 1);
    }

    return Array.from(assigneeMap.entries())
      .map(([assignee, count]) => ({ assignee, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredTasks]);

  const handleFilterChange = useCallback(
    (field: keyof ReportsFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleExportPdf = useCallback(async () => {
    if (exporting) return;

    setExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Relatório de Métricas', margin, 15);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const periodText = `Período: ${new Date(filters.startDate).toLocaleDateString('pt-BR')} - ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`;
      const teamText = `Equipe: ${TEAM_TYPE_OPTIONS.find((o) => o.value === filters.teamType)?.label ?? 'Todas'}`;
      pdf.text(periodText, margin, 22);
      pdf.text(teamText, margin, 28);
      pdf.text(`Total de itens: ${filteredTasks.length}`, margin, 34);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Métricas Consolidadas', margin, 44);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const metricsY = 52;
      const metricsSpacing = 50;
      pdf.text(`Total de Itens: ${metrics.totalItems}`, margin, metricsY);
      pdf.text(
        `Sustentação: ${metrics.sustentacaoCount}`,
        margin + metricsSpacing,
        metricsY,
      );
      pdf.text(
        `Projetos: ${metrics.projetosCount}`,
        margin + metricsSpacing * 2,
        metricsY,
      );
      pdf.text(
        `Itens Parados: ${metrics.staleItems}`,
        margin + metricsSpacing * 3,
        metricsY,
      );
      pdf.text(
        `Velocity: ${metrics.velocity} SP`,
        margin + metricsSpacing * 4,
        metricsY,
      );

      // Status distribution table
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Distribuição por Status', margin, 65);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      let yPos = 72;
      for (const item of statusDistribution) {
        pdf.text(
          `${item.status}: ${item.count} (${item.percent}%)`,
          margin,
          yPos,
        );
        yPos += 6;
      }

      // Assignee distribution table
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Distribuição por Responsável', margin + 100, 65);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      yPos = 72;
      for (const item of assigneeDistribution) {
        pdf.text(`${item.assignee}: ${item.count}`, margin + 100, yPos);
        yPos += 6;
      }

      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
        margin,
        pageHeight - 10,
      );

      const fileName = `relatorio-metricas-${filters.startDate}-${filters.endDate}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setExporting(false);
    }
  }, [
    exporting,
    filters,
    filteredTasks.length,
    metrics,
    statusDistribution,
    assigneeDistribution,
  ]);

  const isLoading = loading || (tasksLoading && tasks.length === 0);

  if (isLoading) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando relatórios...
          </Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexShrink={0}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Relatórios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Métricas consolidadas e distribuições
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Exportar PDF">
            <span>
              <IconButton
                onClick={handleExportPdf}
                size="small"
                disabled={exporting || filteredTasks.length === 0}
              >
                {exporting ? (
                  <CircularProgress size={20} />
                ) : (
                  <PictureAsPdfIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Atualizar">
            <IconButton onClick={loadData} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <ContentArea ref={contentRef}>
        <FiltersContainer>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField
              label="Data Início"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />

            <TextField
              label="Data Fim"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
              slotProps={{
                inputLabel: { shrink: true },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Equipe</InputLabel>
              <Select
                value={filters.teamType}
                label="Equipe"
                onChange={(e) => handleFilterChange('teamType', e.target.value)}
              >
                {TEAM_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.taskType}
                label="Tipo"
                onChange={(e) => handleFilterChange('taskType', e.target.value)}
              >
                {TASK_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Typography variant="body2" color="text.secondary" mt={1}>
            {filteredTasks.length} item(s) no período selecionado
          </Typography>
        </FiltersContainer>

        <MetricsGrid>
          <MetricCard>
            <AssessmentIcon
              sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }}
            />
            <Typography variant="h4" fontWeight={700}>
              {metrics.totalItems}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total de Itens
            </Typography>
          </MetricCard>

          <MetricCard>
            <GroupIcon sx={{ fontSize: 40, color: '#FF9800', mb: 1 }} />
            <Typography variant="h4" fontWeight={700}>
              {metrics.sustentacaoCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sustentação
            </Typography>
          </MetricCard>

          <MetricCard>
            <GroupIcon sx={{ fontSize: 40, color: '#2196F3', mb: 1 }} />
            <Typography variant="h4" fontWeight={700}>
              {metrics.projetosCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Projetos
            </Typography>
          </MetricCard>

          <MetricCard>
            <WarningIcon sx={{ fontSize: 40, color: '#F44336', mb: 1 }} />
            <Typography variant="h4" fontWeight={700}>
              {metrics.staleItems}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Itens Parados
            </Typography>
          </MetricCard>

          <MetricCard>
            <SpeedIcon sx={{ fontSize: 40, color: '#4CAF50', mb: 1 }} />
            <Typography variant="h4" fontWeight={700}>
              {metrics.velocity}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Velocity (Story Points)
            </Typography>
          </MetricCard>
        </MetricsGrid>

        {/* Status Distribution Table */}
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Distribuição por Status
          </Typography>
          {statusDistribution.length > 0 ? (
            <Stack spacing={1.5}>
              {statusDistribution.map((item) => (
                <Box key={item.status}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.5}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: 0.5,
                          bgcolor: item.color,
                        }}
                      />
                      <Typography variant="body2">{item.status}</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={600}>
                      {item.count} ({item.percent}%)
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={item.percent}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      bgcolor: theme.palette.grey[200],
                      '& .MuiLinearProgress-bar': {
                        bgcolor: item.color,
                        borderRadius: 1,
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sem dados para exibir
            </Typography>
          )}
        </Paper>

        {/* Assignee Distribution Table */}
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Distribuição por Responsável (Top 10)
          </Typography>
          {assigneeDistribution.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Responsável</TableCell>
                    <TableCell align="right">Itens</TableCell>
                    <TableCell align="right">%</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assigneeDistribution.map((item) => (
                    <TableRow key={item.assignee}>
                      <TableCell>{item.assignee}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={item.count}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {Math.round(
                          (item.count / (filteredTasks.length || 1)) * 100,
                        )}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sem dados para exibir
            </Typography>
          )}
        </Paper>
      </ContentArea>
    </PageContainer>
  );
}

export default ReportsPage;
