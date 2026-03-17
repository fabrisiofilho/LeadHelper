import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  type SelectChangeEvent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Cancel as CancelIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { PageLayout } from '@renderer/components/PageLayout';
import type {
  Sprint,
  ProjetosResult,
  ProjetosItem,
  SprintAlert,
  SprintQuantitativeSummary,
  Task,
} from '@shared/interfaces/config/index.types';

const STATUS_COLOR: Record<string, string> = {
  // Azure DevOps real states
  Novo: '#2196F3',
  New: '#2196F3',
  Active: '#FFC107',
  'In Progress': '#FFC107',
  'Em Andamento': '#FFC107',
  'Em Desenvolvimento': '#FF9800',
  'Em Auditoria': '#AB47BC',
  'Aguardando Auditoria': '#CE93D8',
  'Em Homologação': '#7E57C2',
  'Aguardando Validação': '#9575CD',
  'Preparando para Dev': '#42A5F5',
  Done: '#4CAF50',
  Closed: '#9E9E9E',
  Finalizado: '#4CAF50',
  Cancelado: '#EF5350',
  // Legacy
  pending: '#2196F3',
  in_progress: '#FFC107',
  completed: '#4CAF50',
  cancelled: '#9E9E9E',
};

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: 'default' | 'primary' | 'success' | 'error' | 'warning';
  }
> = {
  pending: { label: 'Pendente', color: 'warning' },
  inProgress: { label: 'Em Andamento', color: 'primary' },
  completed: { label: 'Concluído', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'error' },
};

function categorizeStatus(
  status: string,
): 'pending' | 'inProgress' | 'completed' | 'cancelled' {
  const completed = ['completed', 'Done', 'Closed', 'Resolved', 'Finalizado'];
  const cancelled = ['cancelled', 'Removed', 'Cut', 'Cancelado'];
  const inProgress = [
    'in_progress',
    'Active',
    'In Progress',
    'Committed',
    'Em Andamento',
    'Em Desenvolvimento',
    'Em Auditoria',
    'Em Homologação',
    'Aguardando Auditoria',
    'Aguardando Validação',
    'Aguardando Implantação',
    'Preparando para Dev',
  ];
  if (completed.includes(status)) return 'completed';
  if (cancelled.includes(status)) return 'cancelled';
  if (inProgress.includes(status)) return 'inProgress';
  return 'pending';
}

// ── Children row for accordion ──

function ChildrenTable({ children }: { children: Task[] }) {
  if (children.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1, pl: 2 }}>
        Nenhum item filho encontrado.
      </Typography>
    );
  }

  const statusSummary = children.reduce(
    (acc, c) => {
      const cat = categorizeStatus(c.status);
      acc[cat]++;
      return acc;
    },
    { pending: 0, inProgress: 0, completed: 0, cancelled: 0 },
  );

  return (
    <Box>
      <Stack direction="row" spacing={1} mb={1} pl={1}>
        {statusSummary.completed > 0 && (
          <Chip
            label={`${statusSummary.completed} concluído(s)`}
            size="small"
            color="success"
            variant="outlined"
          />
        )}
        {statusSummary.inProgress > 0 && (
          <Chip
            label={`${statusSummary.inProgress} em andamento`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
        {statusSummary.pending > 0 && (
          <Chip
            label={`${statusSummary.pending} pendente(s)`}
            size="small"
            color="warning"
            variant="outlined"
          />
        )}
        {statusSummary.cancelled > 0 && (
          <Chip
            label={`${statusSummary.cancelled} cancelado(s)`}
            size="small"
            color="error"
            variant="outlined"
          />
        )}
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Responsável</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {children.map((child) => {
              const statusColor = STATUS_COLOR[child.status] ?? '#757575';
              return (
                <TableRow key={child.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      #{child.externalId ?? child.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={child.type}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: 'break-word' }}
                    >
                      {child.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={child.status}
                      size="small"
                      sx={{
                        bgcolor: statusColor,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {child.assignedToName || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ── User Story Accordion ──

function UserStoryAccordion({ item }: { item: ProjetosItem }) {
  const [children, setChildren] = useState<Task[] | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleExpand = useCallback(
    async (_: unknown, isExpanded: boolean) => {
      setExpanded(isExpanded);
      if (isExpanded && children === null) {
        setLoadingChildren(true);
        try {
          const res = await window.electronAPI.hierarchy.getChildren(
            item.task.id,
          );
          if (res.success && res.data) {
            setChildren(res.data);
          } else {
            setChildren([]);
          }
        } catch {
          setChildren([]);
        } finally {
          setLoadingChildren(false);
        }
      }
    },
    [children, item.task.id],
  );

  const { task } = item;
  const cat = categorizeStatus(task.status);
  const statusCfg = STATUS_CONFIG[cat];
  const borderColor =
    cat === 'completed'
      ? 'success.main'
      : cat === 'inProgress'
        ? 'primary.main'
        : cat === 'cancelled'
          ? 'error.main'
          : 'warning.main';

  return (
    <Accordion
      expanded={expanded}
      onChange={handleExpand}
      TransitionProps={{ unmountOnExit: true }}
      sx={{
        borderLeft: 4,
        borderLeftColor: borderColor,
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack spacing={0.5} sx={{ width: '100%', pr: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              #{task.externalId ?? task.id}
            </Typography>
            <Chip
              label={statusCfg.label}
              size="small"
              color={statusCfg.color}
            />
            {task.assignedToName && (
              <Chip
                label={task.assignedToName}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
            {item.childrenCount > 0 && (
              <Chip
                label={`${item.completedChildrenCount}/${item.childrenCount} filhos`}
                size="small"
                variant="outlined"
                color={item.progressPercent === 100 ? 'success' : 'default'}
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Stack>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ wordBreak: 'break-word' }}
          >
            {task.title}
          </Typography>
          {item.childrenCount > 0 && (
            <LinearProgress
              variant="determinate"
              value={item.progressPercent}
              color={item.progressPercent === 100 ? 'success' : 'primary'}
              sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
            />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {loadingChildren ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : children ? (
          <ChildrenTable children={children} />
        ) : null}
      </AccordionDetails>
    </Accordion>
  );
}

// ── Main Component ──

export function DashboardProjetosPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | ''>('');
  const [result, setResult] = useState<ProjetosResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSprints, setLoadingSprints] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSprints = useCallback(async () => {
    setLoadingSprints(true);
    try {
      const response = await window.electronAPI.sprint.findAll();
      if (response.success && response.data) {
        const sorted = [...response.data].sort((a, b) => {
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
          return bDate - aDate;
        });
        setSprints(sorted);

        const now = new Date();
        const current = sorted.find((s) => {
          const start = s.startDate ? new Date(s.startDate) : null;
          const end = s.endDate ? new Date(s.endDate) : null;
          return start && end && now >= start && now <= end;
        });

        if (current) {
          setSelectedSprintId(current.id);
        } else if (sorted.length > 0) {
          setSelectedSprintId(sorted[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading sprints:', err);
    } finally {
      setLoadingSprints(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedSprintId) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await window.electronAPI.dashboard.getProjetosItems(
        selectedSprintId as number,
      );
      if (!response.success) {
        setError(response.error || 'Erro ao carregar dados de Projetos');
        return;
      }
      setResult(response.data || null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);
  useEffect(() => {
    if (selectedSprintId) loadData();
  }, [selectedSprintId, loadData]);

  const handleSprintChange = (event: SelectChangeEvent<number | ''>) => {
    setSelectedSprintId(event.target.value as number | '');
  };

  // Filter only User Story items
  const userStories = result
    ? result.items.filter((i) => i.task.type === 'User Story')
    : [];

  // Group user stories by status category
  const grouped = {
    pending: userStories.filter(
      (i) => categorizeStatus(i.task.status) === 'pending',
    ),
    inProgress: userStories.filter(
      (i) => categorizeStatus(i.task.status) === 'inProgress',
    ),
    completed: userStories.filter(
      (i) => categorizeStatus(i.task.status) === 'completed',
    ),
    cancelled: userStories.filter(
      (i) => categorizeStatus(i.task.status) === 'cancelled',
    ),
  };

  // Summary based on user stories only
  const usSummary: SprintQuantitativeSummary | null = result
    ? {
        total: userStories.length,
        completed: grouped.completed.length,
        inProgress: grouped.inProgress.length,
        pending: grouped.pending.length,
        cancelled: grouped.cancelled.length,
        completionPercentage:
          userStories.length > 0
            ? (grouped.completed.length / userStories.length) * 100
            : 0,
      }
    : null;

  if (loadingSprints) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando sprints...
          </Typography>
        </Stack>
      </PageLayout>
    );
  }

  return (
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
            Dashboard Projetos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            User Stories da sprint — expanda para ver Tasks e Bugs
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="sprint-select-label">Sprint</InputLabel>
            <Select
              labelId="sprint-select-label"
              value={selectedSprintId}
              onChange={handleSprintChange}
              label="Sprint"
            >
              {sprints.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
            </Typography>
          )}
          <Tooltip title="Atualizar dados">
            <IconButton
              onClick={() => loadSprints()}
              size="small"
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Content */}
      {!selectedSprintId ? (
        <Alert severity="info">
          Selecione uma sprint para visualizar os dados.
        </Alert>
      ) : loading ? (
        <Stack alignItems="center" justifyContent="center" minHeight="40vh">
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary" mt={2}>
            Carregando dados da sprint...
          </Typography>
        </Stack>
      ) : error ? (
        <Stack alignItems="center" justifyContent="center" minHeight="40vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <IconButton onClick={loadData} sx={{ mt: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      ) : result && usSummary ? (
        <Stack spacing={3}>
          {/* Summary */}
          <SummarySection summary={usSummary} />

          {/* Alerts */}
          {result.alerts.length > 0 && <AlertsSection alerts={result.alerts} />}

          {/* User Stories grouped by status */}
          {(['inProgress', 'pending', 'completed', 'cancelled'] as const).map(
            (key) => {
              const items = grouped[key];
              if (items.length === 0) return null;
              const cfg = STATUS_CONFIG[key];
              return (
                <Box key={key}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {cfg.label}
                    </Typography>
                    <Chip label={items.length} size="small" color={cfg.color} />
                  </Stack>
                  <Stack spacing={1}>
                    {items.map((item) => (
                      <UserStoryAccordion key={item.task.id} item={item} />
                    ))}
                  </Stack>
                </Box>
              );
            },
          )}

          {userStories.length === 0 && (
            <Alert severity="info">
              Nenhuma User Story encontrada nesta sprint.
            </Alert>
          )}
        </Stack>
      ) : (
        <Alert severity="info">
          Nenhum dado encontrado para a sprint selecionada.
        </Alert>
      )}
    </PageLayout>
  );
}

export default DashboardProjetosPage;

// ── Summary Section ──

function SummarySection({ summary }: { summary: SprintQuantitativeSummary }) {
  const stats = [
    {
      label: 'Total',
      value: summary.total,
      icon: <AssignmentIcon />,
      color: 'text.primary',
    },
    {
      label: 'Concluídos',
      value: summary.completed,
      icon: <CheckCircleIcon />,
      color: 'success.main',
    },
    {
      label: 'Em Andamento',
      value: summary.inProgress,
      icon: <TrendingUpIcon />,
      color: 'primary.main',
    },
    {
      label: 'Pendentes',
      value: summary.pending,
      icon: <HourglassEmptyIcon />,
      color: 'warning.main',
    },
    {
      label: 'Cancelados',
      value: summary.cancelled,
      icon: <CancelIcon />,
      color: 'error.main',
    },
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Resumo da Sprint (User Stories)
        </Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          {stats.map((stat) => (
            <Stack
              key={stat.label}
              alignItems="center"
              spacing={0.5}
              sx={{ minWidth: 80 }}
            >
              <Box sx={{ color: stat.color }}>{stat.icon}</Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ color: stat.color }}
              >
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Box mt={2}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" color="text.secondary">
              Progresso de conclusão
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {Math.round(summary.completionPercentage)}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(summary.completionPercentage, 100)}
            color="success"
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Alerts Section ──

function AlertsSection({ alerts }: { alerts: SprintAlert[] }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" fontWeight={600}>
        Alertas da Sprint
      </Typography>
      {alerts.map((alert) => (
        <Alert
          key={`${alert.type}-${alert.taskId}`}
          severity={alert.type === 'pending_no_progress' ? 'warning' : 'error'}
          icon={<WarningIcon />}
        >
          <Typography variant="body2" fontWeight={600}>
            #{alert.taskId} — {alert.taskTitle}
          </Typography>
          <Typography variant="caption">{alert.message}</Typography>
        </Alert>
      ))}
    </Stack>
  );
}
