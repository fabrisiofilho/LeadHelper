import { useState, useEffect, useCallback } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getStatusColor as _getStatusColor } from '@shared/constants/status-colors';
import BarChartIcon from '@mui/icons-material/BarChart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useTheme as useStyledTheme } from 'styled-components';
import type { Task } from '@shared/interfaces/config/index.types';
import {
  ChartsContainer,
  ChartSection,
  ChartTitle,
  ChartWrapper,
  ProgressBarContainer,
  ProgressBarWrapper,
  ProgressBarFill,
  ProgressBarText,
  ProgressStats,
  EmptyChartMessage,
  LegendContainer,
  LegendItem,
  LegendColorBox,
} from './styles';

/**
 * Data point for burndown chart.
 * Property 41: Shows completed vs planned items over time.
 */
export interface BurndownDataPoint {
  date: string;
  completed: number;
  planned: number;
}

/**
 * Status distribution for pie chart.
 * Property 42: Count of items per status with color.
 */
export interface StatusDistribution {
  status: string;
  count: number;
  color: string;
}

/**
 * Assignee distribution for bar chart.
 * Property 43: Count of items per assignee.
 */
export interface AssigneeDistribution {
  assignee: string;
  count: number;
}

/**
 * Hierarchy progress data.
 * Property 44, 45: Completed children vs total for parent item.
 */
export interface HierarchyProgress {
  total: number;
  completed: number;
  percentage: number;
}

/**
 * Props for HierarchyCharts component.
 * Requirement 19.8: Collapsible panel containing multiple charts.
 */
export interface HierarchyChartsProps {
  tasks: Task[];
  parentId?: number; // For context-aware charts (Property 45)
  sprintId?: number; // For sprint-filtered charts
  defaultExpanded?: boolean;
}

/**
 * HierarchyCharts - Collapsible panel with contextual charts.
 *
 * Implements:
 * - Requirement 19.8: Collapsible panel for charts
 * - Property 41: Burndown chart (completed vs planned over time)
 * - Property 42: Status distribution pie chart
 * - Property 43: Assignee distribution bar chart
 * - Property 44, 45: Hierarchy progress for parent item
 */
export function HierarchyCharts({
  tasks,
  parentId,
  sprintId,
  defaultExpanded = false,
}: HierarchyChartsProps) {
  const theme = useStyledTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loading, setLoading] = useState(false);
  const [burndownData, setBurndownData] = useState<BurndownDataPoint[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<
    StatusDistribution[]
  >([]);
  const [assigneeDistribution, setAssigneeDistribution] = useState<
    AssigneeDistribution[]
  >([]);
  const [hierarchyProgress, setHierarchyProgress] =
    useState<HierarchyProgress | null>(null);

  /**
   * Calculate burndown data from tasks.
   * Property 41: For each day, planned = total items, completed = items with Done/Closed status.
   */
  const calculateBurndownData = useCallback(
    (taskList: Task[]): BurndownDataPoint[] => {
      if (taskList.length === 0) return [];

      const completedStatuses = ['completed', 'Done', 'Closed'];
      const totalPlanned = taskList.length;

      // Get date range from tasks
      const dates = taskList
        .filter((t) => t.updatedAt)
        .map((t) => new Date(t.updatedAt!).getTime());

      if (dates.length === 0) return [];

      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates, Date.now()));

      const points: BurndownDataPoint[] = [];
      const currentDate = new Date(minDate);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= maxDate) {
        const completedCount = taskList.filter((task) => {
          const isCompleted = completedStatuses.includes(task.status);
          const updatedAt = task.updatedAt ? new Date(task.updatedAt) : null;
          return isCompleted && updatedAt && updatedAt <= currentDate;
        }).length;

        points.push({
          date: currentDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          }),
          planned: totalPlanned,
          completed: completedCount,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Limit to last 14 days if too many points
      return points.length > 14 ? points.slice(-14) : points;
    },
    [],
  );

  /**
   * Calculate status distribution from tasks.
   * Property 42: Count of items per status with color mapping.
   */
  const calculateStatusDistribution = useCallback(
    (taskList: Task[]): StatusDistribution[] => {
      const statusMap = new Map<string, number>();
      for (const task of taskList) {
        const status = task.status ?? 'unknown';
        statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
      }

      return Array.from(statusMap.entries())
        .map(([status, count]) => ({
          status,
          count,
          color: _getStatusColor(status),
        }))
        .sort((a, b) => b.count - a.count);
    },
    [],
  );

  /**
   * Calculate assignee distribution from tasks.
   * Property 43: Count of items per assignee.
   */
  const calculateAssigneeDistribution = useCallback(
    (taskList: Task[]): AssigneeDistribution[] => {
      const assigneeMap = new Map<string, number>();
      for (const task of taskList) {
        const assignee = task.assignedToName ?? 'Não atribuído';
        assigneeMap.set(assignee, (assigneeMap.get(assignee) ?? 0) + 1);
      }

      return Array.from(assigneeMap.entries())
        .map(([assignee, count]) => ({ assignee, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Limit to top 10 assignees
    },
    [],
  );

  /**
   * Calculate hierarchy progress from tasks.
   * Property 44: Proportion of completed children vs total.
   * Property 45: Respects navigation context (parentId).
   */
  const calculateHierarchyProgress = useCallback(
    (taskList: Task[]): HierarchyProgress => {
      const completedStatuses = ['completed', 'Done', 'Closed'];
      const total = taskList.length;
      const completed = taskList.filter((t) =>
        completedStatuses.includes(t.status),
      ).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, percentage };
    },
    [],
  );

  /**
   * Load chart data when tasks or context changes.
   */
  useEffect(() => {
    setLoading(true);

    // Filter tasks by parentId if provided (Property 45)
    let filteredTasks = tasks;
    if (parentId !== undefined) {
      filteredTasks = tasks.filter((t) => t.parentId === parentId);
    }

    // Filter by sprintId if provided
    if (sprintId !== undefined) {
      filteredTasks = filteredTasks.filter((t) => t.sprintId === sprintId);
    }

    // Calculate all chart data
    setBurndownData(calculateBurndownData(filteredTasks));
    setStatusDistribution(calculateStatusDistribution(filteredTasks));
    setAssigneeDistribution(calculateAssigneeDistribution(filteredTasks));
    setHierarchyProgress(calculateHierarchyProgress(filteredTasks));

    setLoading(false);
  }, [
    tasks,
    parentId,
    sprintId,
    calculateBurndownData,
    calculateStatusDistribution,
    calculateAssigneeDistribution,
    calculateHierarchyProgress,
  ]);

  /**
   * Handle accordion expand/collapse toggle.
   * Requirement 19.8: Collapsible panel.
   */
  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const hasData = tasks.length > 0;

  return (
    <ChartsContainer>
      <Accordion
        expanded={expanded}
        onChange={handleToggle}
        sx={{
          backgroundColor: theme.COLORS.surface,
          borderRadius: '8px !important',
          '&:before': { display: 'none' },
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
              gap: 1,
            },
          }}
        >
          <BarChartIcon sx={{ color: theme.COLORS.primary }} />
          <Typography variant="subtitle1" fontWeight={600}>
            Gráficos de Acompanhamento
          </Typography>
          {!hasData && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (sem dados)
            </Typography>
          )}
        </AccordionSummary>

        <AccordionDetails>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={32} />
            </Box>
          ) : !hasData ? (
            <EmptyChartMessage>
              Nenhum dado disponível para exibir os gráficos.
            </EmptyChartMessage>
          ) : (
            <Box>
              {/* Hierarchy Progress - Property 44, 45 */}
              {hierarchyProgress && (
                <ChartSection>
                  <ChartTitle>Progresso Hierárquico</ChartTitle>
                  <ProgressBarContainer>
                    <ProgressBarWrapper>
                      <ProgressBarFill
                        $percentage={hierarchyProgress.percentage}
                      />
                      <ProgressBarText>
                        {hierarchyProgress.percentage}%
                      </ProgressBarText>
                    </ProgressBarWrapper>
                    <ProgressStats>
                      <Typography variant="caption" color="text.secondary">
                        {hierarchyProgress.completed} de{' '}
                        {hierarchyProgress.total} concluídos
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {hierarchyProgress.total - hierarchyProgress.completed}{' '}
                        pendentes
                      </Typography>
                    </ProgressStats>
                  </ProgressBarContainer>
                </ChartSection>
              )}

              {/* Burndown Chart - Property 41 */}
              {burndownData.length > 0 && (
                <ChartSection>
                  <ChartTitle>Burndown</ChartTitle>
                  <ChartWrapper $height={200}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={burndownData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={theme.COLORS.border}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: theme.COLORS.grey_500 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: theme.COLORS.grey_500 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme.COLORS.surface,
                            border: `1px solid ${theme.COLORS.border}`,
                            borderRadius: 4,
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="planned"
                          name="Planejado"
                          stroke={theme.COLORS.primary}
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="completed"
                          name="Concluído"
                          stroke={theme.COLORS.success}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartWrapper>
                </ChartSection>
              )}

              {/* Status Distribution Pie Chart - Property 42 */}
              {statusDistribution.length > 0 && (
                <ChartSection>
                  <ChartTitle>Distribuição por Status</ChartTitle>
                  <ChartWrapper $height={220}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ status, count }) => `${status}: ${count}`}
                          labelLine={false}
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme.COLORS.surface,
                            border: `1px solid ${theme.COLORS.border}`,
                            borderRadius: 4,
                          }}
                          formatter={(value: number, name: string) => [
                            value,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartWrapper>
                  <LegendContainer>
                    {statusDistribution.map((item) => (
                      <LegendItem key={item.status}>
                        <LegendColorBox $color={item.color} />
                        <Typography variant="caption">
                          {item.status} ({item.count})
                        </Typography>
                      </LegendItem>
                    ))}
                  </LegendContainer>
                </ChartSection>
              )}

              {/* Assignee Distribution Bar Chart - Property 43 */}
              {assigneeDistribution.length > 0 && (
                <ChartSection>
                  <ChartTitle>Distribuição por Responsável</ChartTitle>
                  <ChartWrapper
                    $height={Math.max(200, assigneeDistribution.length * 35)}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={assigneeDistribution}
                        layout="vertical"
                        margin={{ left: 80, right: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={theme.COLORS.border}
                        />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: theme.COLORS.grey_500 }}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="assignee"
                          tick={{ fontSize: 11, fill: theme.COLORS.grey_500 }}
                          tickLine={false}
                          axisLine={false}
                          width={80}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme.COLORS.surface,
                            border: `1px solid ${theme.COLORS.border}`,
                            borderRadius: 4,
                          }}
                          formatter={(value: number) => [value, 'Itens']}
                        />
                        <Bar
                          dataKey="count"
                          name="Itens"
                          fill={theme.COLORS.primary}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartWrapper>
                </ChartSection>
              )}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </ChartsContainer>
  );
}

export default HierarchyCharts;
