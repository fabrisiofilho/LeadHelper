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
import { useSyncRefresh } from '@renderer/hooks/useSyncRefresh';
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
  critical: '#9333EA',
  high: '#DC2626',
  medium: '#2563EB',
  low: '#64748B',
};
const PRIO_LABEL: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data automatically when sync completes
  useSyncRefresh(fetchData);

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

  const alertCount = filteredWithTypes.filter(
    (m) => getCardState(m) === 'alert',
  ).length;
  const okCount = filteredWithTypes.filter(
    (m) => getCardState(m) === 'ok',
  ).length;

  if (loading) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" mt={2}>
            Carregando dados de alocação de tarefas...
          </Typography>
        </Stack>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <IconButton onClick={fetchData}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        mb={2}
      >
        <Typography variant="h5">Alocação de Tarefas</Typography>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <Chip
            icon={<OkIcon />}
            label={`${okCount} ok`}
            size="small"
            color="success"
            variant="outlined"
          />
          {alertCount > 0 && (
            <Chip
              icon={<NoTaskIcon />}
              label={`${alertCount} sem tarefas`}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
          <Tooltip title="Atualizar">
            <IconButton onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
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
        sx={{ mb: 2, maxWidth: { sm: 500 } }}
      />

      {/* Position filter */}
      {positionNames.length > 0 && (
        <Stack
          direction="row"
          spacing={0.75}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
        >
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
              onClick={() =>
                setSelectedPosition(selectedPosition === name ? null : name)
              }
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
      )}

      {/* Work item type filter */}
      {workItemTypes.length > 0 && (
        <Stack
          direction="row"
          spacing={0.75}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ alignSelf: 'center', mr: 0.5 }}
          >
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        {filteredWithTypes.map((item) => (
          <MemberCard
            key={item.member.id}
            item={item}
            onTaskClick={(task) => {
              setSelectedTask(task);
              setIsTaskModalOpen(true);
            }}
          />
        ))}
      </Box>

      {filteredWithTypes.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          mt={4}
        >
          Nenhum membro encontrado.
        </Typography>
      )}

      <TaskViewModal
        open={isTaskModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </PageLayout>
  );
}

const AREA_COLORS: Record<string, string> = {
  'Gestão de Terceiros': '#2563EB',
  'Chamada Tecnológica': '#DC2626',
  Sustentação: '#EA580C',
};

function getAreaColor(area: string): string {
  if (AREA_COLORS[area]) return AREA_COLORS[area];
  if (area.startsWith('Projetos')) return '#16A34A';
  return '#64748B';
}

function MemberCard({
  item,
  onTaskClick,
}: {
  item: TaskAllocationMember;
  onTaskClick: (task: Task) => void;
}) {
  const { member, taskGroups, positionName, totalTasks } = item;
  const state = getCardState(item);
  const isOk = state === 'ok';
  const roleColor = ROLE_COLORS[member.role] ?? '#64748B';
  const borderColor = isOk ? 'success.main' : 'warning.main';

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        borderColor,
        borderWidth: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      {/* Colored header band */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: isOk
            ? 'linear-gradient(135deg, rgba(46,125,50,0.08) 0%, rgba(76,175,80,0.04) 100%)'
            : 'linear-gradient(135deg, rgba(255,152,0,0.10) 0%, rgba(255,193,7,0.04) 100%)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            sx={{
              bgcolor: roleColor,
              width: 44,
              height: 44,
              fontSize: '0.9rem',
              fontWeight: 700,
              boxShadow: `0 0 0 2px currentColor, 0 0 0 4px ${roleColor}40`,
            }}
          >
            {getInitials(member.name)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ lineHeight: 1.3, wordBreak: 'break-word' }}
            >
              {member.name}
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 0.25 }}
            >
              <Chip
                label={positionName || ROLE_LABELS[member.role] || member.role}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: roleColor + '1A',
                  color: roleColor,
                }}
              />
            </Stack>
          </Box>
          {/* Status badge */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: isOk ? 'rgba(76,175,80,0.08)' : 'rgba(255,152,0,0.08)',
            }}
          >
            {isOk ? (
              <>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  lineHeight={1}
                  color="success.main"
                  sx={{ fontSize: '1.1rem' }}
                >
                  {totalTasks}
                </Typography>
                <Typography
                  variant="caption"
                  color="success.main"
                  sx={{ fontSize: '0.55rem', lineHeight: 1 }}
                >
                  {totalTasks === 1 ? 'tarefa' : 'tarefas'}
                </Typography>
              </>
            ) : (
              <WarningIcon sx={{ color: 'warning.main', fontSize: 26 }} />
            )}
          </Box>
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ px: 2, py: 1.5, flex: 1 }}>
        {/* Status alert */}
        {!isOk && (
          <Alert
            severity="warning"
            variant="standard"
            sx={{
              py: 0,
              px: 1,
              mb: 1.5,
              '& .MuiAlert-message': { fontSize: '0.75rem', py: 0.5 },
            }}
          >
            Sem tarefas ativas — necessita alocação
          </Alert>
        )}
        {isOk && !item.hasCards && (
          <Alert
            severity="info"
            variant="standard"
            sx={{
              py: 0,
              px: 1,
              mb: 1.5,
              '& .MuiAlert-message': { fontSize: '0.75rem', py: 0.5 },
            }}
          >
            Cargo sem etapas configuradas
          </Alert>
        )}

        {/* Task groups by area */}
        <Stack spacing={1.5}>
          {taskGroups.map((group) => (
            <Box key={group.area}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                mb={0.75}
              >
                <Box
                  sx={{
                    width: 4,
                    height: 16,
                    borderRadius: 1,
                    bgcolor: getAreaColor(group.area),
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color={getAreaColor(group.area)}
                  sx={{ flex: 1 }}
                >
                  {group.area}
                </Typography>
                <Chip
                  label={group.tasks.length}
                  size="small"
                  sx={{
                    minWidth: 24,
                    fontWeight: 700,
                    bgcolor: getAreaColor(group.area),
                    color: '#fff',
                  }}
                />
              </Stack>
              <Stack spacing={0.5}>
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.externalId ?? task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const prioColor = PRIO_COLOR[task.priority] ?? '#64748B';

  return (
    <Box
      onClick={onClick}
      sx={{
        px: 1,
        py: 0.75,
        borderRadius: 1.5,
        cursor: 'pointer',
        bgcolor: 'action.hover',
        borderLeft: `3px solid ${prioColor}`,
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: 'action.selected' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25}>
        <Typography
          variant="caption"
          color="text.disabled"
          fontWeight={700}
          sx={{ fontSize: '0.7rem' }}
        >
          #{task.externalId ?? task.id}
        </Typography>
        <WorkItemTypeChip type={task.type} />
        <Box sx={{ flex: 1 }} />
        <Chip
          label={task.status}
          size="small"
          variant="outlined"
        />
      </Stack>
      <Typography
        variant="caption"
        sx={{
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}
      >
        {task.title}
      </Typography>
    </Box>
  );
}
