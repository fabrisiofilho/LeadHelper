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
  type SelectChangeEvent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  VerifiedUser as AuditIcon,
  Gavel as HomologacaoIcon,
  RocketLaunch as ImplantacaoIcon,
} from '@mui/icons-material';
import { PageLayout } from '@renderer/components/PageLayout';
import { useTableSort } from '@renderer/hooks/useTableSort';
import { StandardTable, type StandardColumn } from '@renderer/components/StandardTable';
import { TaskViewModal } from '@renderer/components/TaskViewModal';
import type {
  Sprint,
  ProjetosResult,
  ProjetosItem,
  SprintAlert,
  Task,
} from '@shared/interfaces/config/index.types';

import { getStatusColor } from '@shared/constants/status-colors';
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' | 'secondary';
  }
> = {
  pending: { label: 'Pendentes', color: 'warning' },
  desenvolvimento: { label: 'Desenvolvimento', color: 'primary' },
  auditoria: { label: 'Auditoria', color: 'secondary' },
  homologacao: { label: 'Homologação', color: 'info' },
  implantacao: { label: 'Implantação', color: 'default' },
  completed: { label: 'Concluídos', color: 'success' },
  cancelled: { label: 'Cancelados', color: 'error' },
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
    'Aguardando Homologação',
    'Em Implantação',
    'Em validação',
    'Em classificação',
    'Preparando para Dev',
  ];
  if (completed.includes(status)) return 'completed';
  if (cancelled.includes(status)) return 'cancelled';
  if (inProgress.includes(status)) return 'inProgress';
  return 'pending';
}

type DetailedCategory = 'pending' | 'desenvolvimento' | 'auditoria' | 'homologacao' | 'implantacao' | 'completed' | 'cancelled';

function categorizeStatusDetailed(status: string): DetailedCategory {
  const completed = ['completed', 'Done', 'Closed', 'Resolved', 'Finalizado'];
  const cancelled = ['cancelled', 'Removed', 'Cut', 'Cancelado'];
  const auditoria = ['Aguardando Auditoria', 'Aguardando auditoria', 'Em Auditoria', 'Em auditoria'];
  const homologacao = [
    'Aguardando Homologação', 'Aguardando homologação',
    'Em Homologação', 'Em homologação',
    'Aguardando Validação', 'Aguardando validação',
    'Em validação', 'Em Validação',
  ];
  const implantacao = [
    'Aguardando Implantação', 'Aguardando implantação',
    'Em Implantação', 'Em implantação',
  ];
  const desenvolvimento = [
    'in_progress', 'Active', 'In Progress', 'Committed',
    'Em Andamento', 'Em andamento', 'Em Desenvolvimento', 'Em desenvolvimento',
    'Preparando para Dev', 'Em classificação', 'Backlog Comprometido',
  ];

  if (completed.includes(status)) return 'completed';
  if (cancelled.includes(status)) return 'cancelled';
  if (implantacao.includes(status)) return 'implantacao';
  if (homologacao.includes(status)) return 'homologacao';
  if (auditoria.includes(status)) return 'auditoria';
  if (desenvolvimento.includes(status)) return 'desenvolvimento';
  return 'pending';
}

/**
 * Derive the displayed status for a parent item considering both its own
 * status and the progress of its children.
 *
 * Rules:
 * - If the parent's own status is already categorized as inProgress, completed
 *   or cancelled, use it directly (but show the real Azure DevOps label when
 *   it's a known "homologação/validação" status).
 * - If the parent is "pending" but ALL children are completed, treat it as
 *   "Em Homologação" since the work is done and awaiting validation.
 * - If the parent is "pending" but SOME children are completed or in progress,
 *   treat it as "inProgress".
 */
function deriveParentDisplayStatus(
  item: ProjetosItem,
): { cat: string; label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' | 'secondary' } {
  const { task, childrenCount, completedChildrenCount } = item;
  const detailedCat = categorizeStatusDetailed(task.status);

  // If the detailed category already captures the real status, use it
  if (detailedCat !== 'pending') {
    const cfg = STATUS_CONFIG[detailedCat];
    return { cat: detailedCat, label: task.status, color: cfg.color };
  }

  // Parent is "pending" — check children to derive a better status
  if (childrenCount > 0 && completedChildrenCount === childrenCount) {
    return { cat: 'homologacao', label: 'Em Homologação', color: STATUS_CONFIG.homologacao.color };
  }

  if (childrenCount > 0 && completedChildrenCount > 0) {
    return { cat: 'desenvolvimento', label: 'Em Andamento', color: STATUS_CONFIG.desenvolvimento.color };
  }

  // Truly pending
  const cfg = STATUS_CONFIG.pending;
  return { cat: 'pending', label: cfg.label, color: cfg.color };
}

// ── Children columns ──

const CHILDREN_COLUMNS: StandardColumn[] = [
  { id: 'externalId', label: 'ID', width: 80 },
  { id: 'type', label: 'Tipo', width: 100 },
  { id: 'title', label: 'Título' },
  { id: 'status', label: 'Status', width: 140 },
  { id: 'assignedToName', label: 'Responsável', width: 160 },
];

// ── Children table for accordion ──

function ChildrenTable({ children, onTaskClick }: { children: Task[]; onTaskClick: (task: Task) => void }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { sortedItems, sortConfig, handleSort } = useTableSort(children);

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

  const paginatedChildren = sortedItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <Box>
      <Stack direction="row" spacing={1} mb={1} pl={1}>
        {statusSummary.completed > 0 && (
          <Chip label={`${statusSummary.completed} concluído(s)`} size="small" color="success" variant="outlined" />
        )}
        {statusSummary.inProgress > 0 && (
          <Chip label={`${statusSummary.inProgress} em andamento`} size="small" color="primary" variant="outlined" />
        )}
        {statusSummary.pending > 0 && (
          <Chip label={`${statusSummary.pending} pendente(s)`} size="small" color="warning" variant="outlined" />
        )}
        {statusSummary.cancelled > 0 && (
          <Chip label={`${statusSummary.cancelled} cancelado(s)`} size="small" color="error" variant="outlined" />
        )}
      </Stack>
      <StandardTable
        columns={CHILDREN_COLUMNS}
        rows={paginatedChildren.map((child) => ({
          id: child.id,
          onClick: () => onTaskClick(child),
          cells: {
            externalId: (
              <Typography variant="caption" color="text.secondary">
                #{child.externalId ?? child.id}
              </Typography>
            ),
            type: (
              <Chip label={child.type} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
            ),
            title: (
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {child.title}
              </Typography>
            ),
            status: (
              <Chip
                label={child.status}
                size="small"
                sx={{
                  bgcolor: getStatusColor(child.status),
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                }}
              />
            ),
            assignedToName: (
              <Typography variant="body2">{child.assignedToName || '—'}</Typography>
            ),
          },
        }))}
        sortConfig={sortConfig}
        onSort={handleSort}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={sortedItems.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Box>
  );
}

// ── User Story Accordion ──

function UserStoryAccordion({ item, onTaskClick }: { item: ProjetosItem; onTaskClick: (task: Task) => void }) {
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
  const derived = deriveParentDisplayStatus(item);
  const borderColorMap: Record<string, string> = {
    completed: '#66BB6A',
    cancelled: '#EF5350',
    desenvolvimento: '#FF7043',
    auditoria: '#AB47BC',
    homologacao: '#7E57C2',
    implantacao: '#26A69A',
    pending: '#FFA726',
  };
  const borderColor = borderColorMap[derived.cat] || '#FFA726';

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
              label={derived.label}
              size="small"
              color={derived.color}
            />
            {task.assignedToName && (
              <Chip
                label={task.assignedToName}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
            {item.childrenCount > 0 && (() => {
              const allDone = item.progressPercent === 100;
              return (
                <Chip
                  label={`${item.completedChildrenCount}/${item.childrenCount} filhos`}
                  size="small"
                  variant={allDone ? 'outlined' : 'filled'}
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: allDone ? 400 : 700,
                    ...(allDone
                      ? { color: 'text.disabled', borderColor: 'divider' }
                      : { bgcolor: '#FF7043', color: '#fff' }),
                  }}
                />
              );
            })()}
          </Stack>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ wordBreak: 'break-word' }}
          >
            {task.title}
          </Typography>
          {item.childrenCount > 0 && (() => {
            const allDone = item.progressPercent === 100;
            return (
              <LinearProgress
                variant="determinate"
                value={item.progressPercent}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  mt: 0.5,
                  bgcolor: allDone ? 'action.disabledBackground' : undefined,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: allDone ? 'text.disabled' : '#FF7043',
                    borderRadius: 2,
                  },
                }}
              />
            );
          })()}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {loadingChildren ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : children ? (
          <ChildrenTable children={children} onTaskClick={onTaskClick} />
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  }, []);

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

  // Group user stories by detailed status category
  const grouped: Record<DetailedCategory, ProjetosItem[]> = {
    pending: [],
    desenvolvimento: [],
    auditoria: [],
    homologacao: [],
    implantacao: [],
    completed: [],
    cancelled: [],
  };
  for (const item of userStories) {
    const derived = deriveParentDisplayStatus(item);
    const cat = (derived.cat in grouped ? derived.cat : 'pending') as DetailedCategory;
    grouped[cat].push(item);
  }

  // Summary based on user stories only
  const usSummary = result
    ? {
        total: userStories.length,
        completed: grouped.completed.length,
        desenvolvimento: grouped.desenvolvimento.length,
        auditoria: grouped.auditoria.length,
        homologacao: grouped.homologacao.length,
        implantacao: grouped.implantacao.length,
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
          {(['desenvolvimento', 'auditoria', 'homologacao', 'implantacao', 'pending', 'completed', 'cancelled'] as DetailedCategory[]).map(
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
                      <UserStoryAccordion key={item.task.id} item={item} onTaskClick={handleTaskClick} />
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

      <TaskViewModal
        open={isTaskModalOpen}
        task={selectedTask}
        onClose={handleCloseTaskModal}
      />
    </PageLayout>
  );
}

export default DashboardProjetosPage;

// ── Summary Section ──

interface ProjetosSummary {
  total: number;
  completed: number;
  desenvolvimento: number;
  auditoria: number;
  homologacao: number;
  implantacao: number;
  pending: number;
  cancelled: number;
  completionPercentage: number;
}

function SummarySection({ summary }: { summary: ProjetosSummary }) {
  const stats = [
    {
      label: 'Total',
      value: summary.total,
      icon: <AssignmentIcon />,
      color: 'text.primary',
    },
    {
      label: 'Desenvolvimento',
      value: summary.desenvolvimento,
      icon: <CodeIcon />,
      hexColor: '#FF7043',
    },
    {
      label: 'Auditoria',
      value: summary.auditoria,
      icon: <AuditIcon />,
      hexColor: '#AB47BC',
    },
    {
      label: 'Homologação',
      value: summary.homologacao,
      icon: <HomologacaoIcon />,
      hexColor: '#7E57C2',
    },
    {
      label: 'Implantação',
      value: summary.implantacao,
      icon: <ImplantacaoIcon />,
      hexColor: '#26A69A',
    },
    {
      label: 'Pendentes',
      value: summary.pending,
      icon: <HourglassEmptyIcon />,
      color: 'warning.main',
    },
    {
      label: 'Concluídos',
      value: summary.completed,
      icon: <CheckCircleIcon />,
      color: 'success.main',
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
              <Box sx={{ color: stat.hexColor || stat.color }}>{stat.icon}</Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{ color: stat.hexColor || stat.color }}
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
