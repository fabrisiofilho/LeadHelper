import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Lock as LockIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeams } from '@renderer/hooks/useTeams';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTableSort } from '@renderer/hooks/useTableSort';
import { TaskViewModal } from '@renderer/components/TaskViewModal';
import { StandardTable, type StandardColumn } from '@renderer/components/StandardTable';
import { WorkItemTypeChip } from '@renderer/components/WorkItemTypeChip';
import type { Task } from '@shared/interfaces/config/index.types';
import { PageContainer, ContentArea, FiltersContainer } from './styles';

// Status options for filter
const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
];

// Type options for filter (Azure DevOps work item types)
const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'Task', label: 'Task' },
  { value: 'User Story', label: 'User Story' },
  { value: 'Bug', label: 'Bug' },
  { value: 'Feature', label: 'Feature' },
  { value: 'Epic', label: 'Epic' },
  { value: 'Ticket', label: 'Ticket' },
  { value: 'Improvement', label: 'Improvement' },
];

// Team type options
const TEAM_TYPE_OPTIONS = [
  { value: 'all', label: 'Todas as Equipes' },
  { value: 'sustentacao', label: 'Sustentação' },
  { value: 'projetos', label: 'Projetos' },
];

interface TaskManagementFilters {
  search: string;
  status: string;
  type: string;
  teamType: string;
  sprintId: string;
}

const EMPTY_FILTERS: TaskManagementFilters = {
  search: '',
  status: 'all',
  type: 'all',
  teamType: 'all',
  sprintId: 'all',
};

// Table columns configuration
const HEAD_CELLS: StandardColumn[] = [
  { id: 'externalId', label: 'ID', width: 100 },
  { id: 'title', label: 'Título', width: '30%' },
  { id: 'type', label: 'Tipo', width: 120 },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'assignedToName', label: 'Responsável', width: 150 },
  { id: 'team', label: 'Equipe', width: 120 },
  { id: 'sprint', label: 'Sprint', width: 150 },
];

// Status color mapping
import { getStatusColor } from '@shared/constants/status-colors';

// Type color mapping
const getTypeColor = (type: string): string => {
  const typeColors: Record<string, string> = {
    epic: '#ff8c00',
    feature: '#9c27b0',
    improvement: '#e91e63',
    rework: '#d32f2f',
    bug: '#d32f2f',
    roadmap: '#424242',
    task: '#c8a415',
    ticket: '#4caf50',
    'user story': '#2196f3',
  };
  return typeColors[type.toLowerCase()] || '#757575';
};

// Get team type from area path
const getTeamTypeFromAreaPath = (areaPath?: string): string => {
  if (!areaPath) return '-';
  if (areaPath.includes('Sustentação')) return 'Sustentação';
  if (areaPath.includes('Projetos')) return 'Projetos';
  return '-';
};

export function TaskManagementPage() {
  const [filters, setFilters] = useState<TaskManagementFilters>(EMPTY_FILTERS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { tasks, loading: tasksLoading, findAll: findAllTasks } = useTasks();
  const { findAll: findAllTeams } = useTeams();
  const { sprints, findAll: findAllSprints } = useSprints();

  const loadData = useCallback(async () => {
    await Promise.all([
      findAllTasks(),
      findAllTeams({ isActive: true }),
      findAllSprints(),
    ]);
  }, [findAllTasks, findAllTeams, findAllSprints]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  }, []);

  // Filter tasks based on all filters (Property 15, 16)
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Global search - searches title, description, and externalId (Property 15)
    if (filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.externalId?.toLowerCase().includes(term) ||
          t.assignedToName?.toLowerCase().includes(term),
      );
    }

    // Status filter (Property 16)
    if (filters.status !== 'all') {
      result = result.filter((t) => t.status === filters.status);
    }

    // Type filter - Azure DevOps work item type
    if (filters.type !== 'all') {
      result = result.filter((t) => t.type === filters.type);
    }

    // Team type filter based on area path (Property 16)
    if (filters.teamType !== 'all') {
      result = result.filter((t) => {
        if (!t.areaPath) return false;
        if (filters.teamType === 'sustentacao') {
          return t.areaPath.includes('Sustentação');
        }
        if (filters.teamType === 'projetos') {
          return t.areaPath.includes('Projetos');
        }
        return true;
      });
    }

    // Sprint filter (Property 16)
    if (filters.sprintId !== 'all') {
      const sprintId = parseInt(filters.sprintId, 10);
      result = result.filter((t) => t.sprintId === sprintId);
    }

    return result;
  }, [tasks, filters]);

  // Sort tasks using standardized hook
  const {
    sortedItems: sortedTasks,
    sortConfig,
    handleSort,
  } = useTableSort(filteredTasks);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedTasks.slice(start, start + rowsPerPage);
  }, [sortedTasks, page, rowsPerPage]);

  // Build StandardTable rows from paginated tasks
  const tableRows = useMemo(() => {
    return paginatedTasks.map((task) => ({
      id: task.id,
      onClick: () => handleTaskClick(task),
      cells: {
        externalId: (
          <Typography variant="body2" fontWeight={500} color="primary">
            {task.externalId || `#${task.id}`}
          </Typography>
        ),
        title: (
          <Tooltip title={task.title} placement="top-start">
            <Typography
              variant="body2"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 300,
              }}
            >
              {task.title}
            </Typography>
          </Tooltip>
        ),
        type: task.type ? (
          <WorkItemTypeChip type={task.type} />
        ) : (
          '-'
        ),
        status: (
          <Chip
            label={task.status}
            size="small"
            sx={{
              bgcolor: getStatusColor(task.status),
              color: 'white',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
        ),
        assignedToName: (
          <Typography variant="body2" color="text.secondary">
            {task.assignedToName || '-'}
          </Typography>
        ),
        team: (
          <Typography variant="body2" color="text.secondary">
            {getTeamTypeFromAreaPath(task.areaPath)}
          </Typography>
        ),
        sprint: (
          <Typography variant="body2" color="text.secondary">
            {task.sprint?.name || '-'}
          </Typography>
        ),
      },
    }));
  }, [paginatedTasks, handleTaskClick]);

  const handleRefresh = async () => {
    await loadData();
  };

  const handleFilterChange = useCallback(
    (field: keyof TaskManagementFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [field]: value }));
      setPage(0); // Reset to first page when filters change
    },
    [],
  );

  const handleClearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.status !== 'all' ||
      filters.type !== 'all' ||
      filters.teamType !== 'all' ||
      filters.sprintId !== 'all'
    );
  }, [filters]);

  const isLoading = tasksLoading && tasks.length === 0;

  if (isLoading) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando tarefas...
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
            Gestão de Tarefas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pesquise e visualize demandas de forma centralizada
          </Typography>
        </Box>
        <Tooltip title="Atualizar">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Alert
        severity="info"
        icon={<LockIcon fontSize="small" />}
        sx={{ mb: 2, flexShrink: 0 }}
      >
        Dados gerenciados no Azure DevOps. Visualização somente leitura.
      </Alert>

      <ContentArea>
        {/* Filters Section */}
        <FiltersContainer>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {/* Global Search */}
            <TextField
              placeholder="Buscar por ID, título, descrição ou responsável..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              size="small"
              sx={{ minWidth: 300, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => handleFilterChange('search', '')}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Status Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Type Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.type}
                label="Tipo"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                {TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Team Type Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
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

            {/* Sprint Filter */}
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Sprint</InputLabel>
              <Select
                value={filters.sprintId}
                label="Sprint"
                onChange={(e) => handleFilterChange('sprintId', e.target.value)}
              >
                <MenuItem value="all">Todas as Sprints</MenuItem>
                {sprints.map((sprint) => (
                  <MenuItem key={sprint.id} value={sprint.id.toString()}>
                    {sprint.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Tooltip title="Limpar filtros">
                <IconButton onClick={handleClearFilters} size="small">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {/* Results count */}
          <Typography variant="body2" color="text.secondary" mt={1}>
            {sortedTasks.length} resultado(s) encontrado(s)
          </Typography>
        </FiltersContainer>

        {/* Results Table */}
        <StandardTable
          columns={HEAD_CELLS}
          rows={tableRows}
          sortConfig={sortConfig}
          onSort={handleSort}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={sortedTasks.length}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          fullHeight
        />
      </ContentArea>

      {/* Task Detail Modal */}
      <TaskViewModal
        open={isTaskModalOpen}
        task={selectedTask}
        onClose={handleCloseTaskModal}
      />
    </PageContainer>
  );
}

export default TaskManagementPage;
