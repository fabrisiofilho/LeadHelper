import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Avatar,
  Paper,
  TextField,
  InputAdornment,
  Alert,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  WarningAmber as WarningIcon,
  CheckCircleOutline as OkIcon,
  PersonOff as NoTaskIcon,
} from '@mui/icons-material';
import { PageLayout } from '@renderer/components/PageLayout';
import { TaskViewModal } from '@renderer/components/TaskViewModal';
import { WorkItemTypeChip } from '@renderer/components/WorkItemTypeChip';
import { getInitials, ROLE_COLORS } from '@renderer/utils/member';
import type {
  TeamMemberRole,
  Task,
  TaskAllocationMember,
} from '@shared/interfaces/config/index.types';

const ROLE_LABELS: Record<TeamMemberRole, string> = {
  developer: 'Desenvolvedor',
  analyst: 'Analista',
  qa: 'QA',
  tech_lead: 'Tech Lead',
  devops: 'DevOps',
  designer: 'Designer',
  product_owner: 'PO',
};
const PRIO_COLOR: Record<string, string> = {
  critical: '#d32f2f', high: '#ed6c02', medium: '#0288d1', low: '#757575',
};
const PRIO_LABEL: Record<string, string> = {
  critical: 'Crítica', high: 'Alto', medium: 'Médio', low: 'Baixo',
};

type CardState = 'ok' | 'alert';
function getCardState(item: TaskAllocationMember): CardState {
  if (item.hasCards) return 'ok';
  if (!item.hasAllowedStatuses) return 'ok';
  return 'alert';
}

export function TaskAllocationPage() {
  const [data, setData] = useState<TaskAllocationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [excludedTypes, setExcludedTypes] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const api = (
    window as unknown as {
      electronAPI: import('@shared/interfaces/config/index.types').CustomElectronAPI;
    }
  ).electronAPI;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dashboard.getTaskAllocationData();
      if (res.success && res.data) setData(res.data);
      else setError(res.error ?? 'Erro ao carregar dados');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Extract unique position names for filter
  const positionNames = useMemo(() => {
    const names = new Set<string>();
    for (const m of data) {
      if (m.positionName) names.add(m.positionName);
    }
    return Array.from(names).sort();
  }, [data]);

  // Extract unique work item types for filter
  const workItemTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of data) {
      for (const g of m.taskGroups) {
        for (const t of g.tasks) {
          if (t.type) types.add(t.type);
        }
      }
    }
    return Array.from(types).sort();
  }, [data]);

  const toggleType = useCallback((type: string) => {
    setExcludedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let result = data;

    // Filter by position
    if (selectedPosition) {
      result = result.filter((m) => m.positionName === selectedPosition);
    }

    // Filter by search text
    if (searchText.trim()) {
      const term = searchText.trim().toLowerCase();
      result = result.filter((m) => {
        if (m.member.name.toLowerCase().includes(term)) return true;
        if (m.member.email.toLowerCase().includes(term)) return true;
        return m.taskGroups.some((g) =>
          g.tasks.some(
            (t) =>
              (t.externalId ?? String(t.id)).toLowerCase().includes(term) ||
              t.title.toLowerCase().includes(term),
          ),
        );
      });
    }

    return result;
  }, [data, searchText, selectedPosition]);

  // Apply work item type filter on tasks inside members
  const filteredWithTypes = useMemo(() => {
    if (excludedTypes.size === 0) return filtered;
    return filtered.map((m) => {
      const taskGroups = m.taskGroups
        .map((g) => ({
          ...g,
          tasks: g.tasks.filter((t) => !excludedTypes.has(t.type)),
        }))
        .filter((g) => g.tasks.length > 0);
      const totalTasks = taskGroups.reduce((sum, g) => sum + g.tasks.length, 0);
      return {
        ...m,
        taskGroups,
        totalTasks,
        hasCards: totalTasks > 0,
      };
    });
  }, [filtered, excludedTypes]);

  const alertCount = filteredWithTypes.filter((m) => getCardState(m) === 'alert').length;
  const okCount = filteredWithTypes.filter((m) => getCardState(m) === 'ok').length;

  if (loading) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" mt={2}>Carregando dados de alocação de tarefas...</Typography>
        </Stack>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <IconButton onClick={fetchData}><RefreshIcon /></IconButton>
        </Stack>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Alocação de Tarefas</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip icon={<OkIcon />} label={`${okCount} ok`} size="small" color="success" variant="outlined" />
          {alertCount > 0 && (
            <Chip icon={<NoTaskIcon />} label={`${alertCount} sem tarefas`} size="small" color="warning" variant="outlined" />
          )}
          <Tooltip title="Atualizar">
            <IconButton onClick={fetchData}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="Buscar por nome, e-mail, código ou título da tarefa..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 2 }}
      />

      {/* Position filter */}
      {positionNames.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip
            label="Todos"
            size="small"
            variant={selectedPosition === null ? 'filled' : 'outlined'}
            color={selectedPosition === null ? 'primary' : 'default'}
            onClick={() => setSelectedPosition(null)}
            sx={{ fontWeight: 600 }}
          />
          {positionNames.map((name) => (
            <Chip
              key={name}
              label={name}
              size="small"
              variant={selectedPosition === name ? 'filled' : 'outlined'}
              color={selectedPosition === name ? 'primary' : 'default'}
              onClick={() => setSelectedPosition(selectedPosition === name ? null : name)}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
      )}

      {/* Work item type filter */}
      {workItemTypes.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
            Tipos:
          </Typography>
          {workItemTypes.map((type) => (
            <Chip
              key={type}
              label={type}
              size="small"
              variant={excludedTypes.has(type) ? 'outlined' : 'filled'}
              color={excludedTypes.has(type) ? 'default' : 'primary'}
              onClick={() => toggleType(type)}
              sx={{
                fontWeight: 600,
                opacity: excludedTypes.has(type) ? 0.5 : 1,
              }}
            />
          ))}
        </Stack>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {filteredWithTypes.map((item) => (
          <MemberCard
            key={item.member.id}
            item={item}
            onTaskClick={(task) => { setSelectedTask(task); setIsTaskModalOpen(true); }}
          />
        ))}
      </Box>

      {filteredWithTypes.length === 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>Nenhum membro encontrado.</Typography>
      )}

      <TaskViewModal
        open={isTaskModalOpen}
        task={selectedTask}
        onClose={() => { setIsTaskModalOpen(false); setSelectedTask(null); }}
      />
    </PageLayout>
  );
}

const AREA_COLORS: Record<string, string> = {
  'Gestão de Terceiros': '#1565c0',
  'Chamada Tecnológica': '#c62828',
  'Sustentação': '#e65100',
};

function getAreaColor(area: string): string {
  if (AREA_COLORS[area]) return AREA_COLORS[area];
  if (area.startsWith('Projetos')) return '#2e7d32';
  return '#455a64';
}

function MemberCard({ item, onTaskClick }: { item: TaskAllocationMember; onTaskClick: (task: Task) => void }) {
  const { member, taskGroups, positionName, totalTasks } = item;
  const state = getCardState(item);
  const isOk = state === 'ok';
  const roleColor = ROLE_COLORS[member.role] ?? '#455a64';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: isOk ? 'success.main' : 'warning.main',
        borderWidth: 2,
        bgcolor: isOk ? 'rgba(46,125,50,0.04)' : 'rgba(255,152,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Avatar sx={{ bgcolor: roleColor, width: 40, height: 40, fontSize: '0.85rem' }}>
          {getInitials(member.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={600} noWrap>{member.name}</Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
            {positionName ? (
              <Chip label={positionName} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, bgcolor: roleColor + '18', color: roleColor }} />
            ) : (
              <Chip label={ROLE_LABELS[member.role] ?? member.role} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, bgcolor: roleColor + '18', color: roleColor }} />
            )}
          </Stack>
        </Box>
        {isOk ? (
          <Stack alignItems="center">
            <OkIcon sx={{ color: 'success.main', fontSize: 22 }} />
            {totalTasks > 0 && (
              <Typography variant="caption" color="success.dark" fontWeight={700} sx={{ fontSize: '0.65rem' }}>
                {totalTasks}
              </Typography>
            )}
          </Stack>
        ) : (
          <WarningIcon sx={{ color: 'warning.main', fontSize: 22 }} />
        )}
      </Stack>

      {/* Status line */}
      {!isOk && (
        <Typography variant="caption" color="warning.dark" fontWeight={600} sx={{ px: 0.5 }}>
          Sem tarefas ativas — necessita alocação
        </Typography>
      )}
      {isOk && !item.hasCards && (
        <Typography variant="caption" color="success.dark" fontWeight={600} sx={{ px: 0.5 }}>
          Cargo sem etapas configuradas
        </Typography>
      )}

      {/* Task groups by area */}
      {taskGroups.map((group, idx) => (
        <Box key={group.area}>
          {idx > 0 && <Divider sx={{ mb: 1 }} />}
          <Stack direction="row" alignItems="center" spacing={0.5} mb={0.75}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getAreaColor(group.area), flexShrink: 0 }} />
            <Typography variant="caption" fontWeight={700} color={getAreaColor(group.area)}>
              {group.area}
            </Typography>
            <Chip label={group.tasks.length} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: getAreaColor(group.area) + '18', color: getAreaColor(group.area) }} />
          </Stack>
          <Stack spacing={0.5}>
            {group.tasks.map((task) => (
              <TaskRow key={task.externalId ?? task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </Stack>
        </Box>
      ))}
    </Paper>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const context = task.areaPath?.includes('Sustentação') ? 'Sustentação'
    : task.areaPath?.includes('Projetos') ? 'Projeto'
    : null;
  const contextColor = context === 'Sustentação' ? '#e65100' : context === 'Projeto' ? '#2e7d32' : undefined;

  return (
    <Paper
      variant="outlined"
      sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
      onClick={onClick}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25} flexWrap="wrap">
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          #{task.externalId ?? task.id}
        </Typography>
        <WorkItemTypeChip type={task.type} sx={{ height: 16 }} />
        <Chip
          label={PRIO_LABEL[task.priority] ?? task.priority}
          size="small"
          sx={{ height: 14, fontSize: '0.55rem', fontWeight: 700, bgcolor: PRIO_COLOR[task.priority] ?? '#757575', color: '#fff' }}
        />
        {context && (
          <Chip
            label={context}
            size="small"
            sx={{ height: 14, fontSize: '0.55rem', fontWeight: 700, bgcolor: contextColor + '18', color: contextColor, border: '1px solid', borderColor: contextColor + '40' }}
          />
        )}
      </Stack>
      <Typography variant="caption" sx={{ lineHeight: 1.3, display: 'block' }}>{task.title}</Typography>
      <Chip label={task.status} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.55rem', mt: 0.25 }} />
    </Paper>
  );
}
