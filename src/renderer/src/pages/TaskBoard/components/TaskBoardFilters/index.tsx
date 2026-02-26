import {
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Box,
} from '@mui/material';
import {
  Search as SearchIcon,
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
} from '@mui/icons-material';
import type {
  TaskPriority,
  TaskType,
} from '@shared/interfaces/config/index.types';
import { TASK_TYPE_OPTIONS } from '@renderer/utils/task-type';

export type ViewMode = 'list' | 'kanban';

export interface TaskBoardFiltersState {
  search: string;
  priority: TaskPriority | 'all';
  type: TaskType | 'all';
  status: string;
  sprintFilter: 'all' | 'with_sprint' | 'without_sprint';
}

export const EMPTY_FILTERS: TaskBoardFiltersState = {
  search: '',
  priority: 'all',
  type: 'all',
  status: 'all',
  sprintFilter: 'all',
};

interface TaskBoardFiltersProps {
  filters: TaskBoardFiltersState;
  viewMode: ViewMode;
  statusOptions: { value: string; label: string }[];
  onChange: (filters: TaskBoardFiltersState) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function TaskBoardFilters({
  filters,
  viewMode,
  statusOptions,
  onChange,
  onViewModeChange,
}: TaskBoardFiltersProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      flexWrap="wrap"
      gap={1.5}
      sx={{
        p: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <TextField
        size="small"
        placeholder="Buscar tarefas..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ minWidth: 220, flex: 1, maxWidth: 320 }}
      />

      <TextField
        select
        size="small"
        label="Prioridade"
        value={filters.priority}
        onChange={(e) =>
          onChange({
            ...filters,
            priority: e.target.value as TaskPriority | 'all',
          })
        }
        sx={{ minWidth: 130 }}
      >
        <MenuItem value="all">Todas</MenuItem>
        <MenuItem value="low">Baixa</MenuItem>
        <MenuItem value="medium">Média</MenuItem>
        <MenuItem value="high">Alta</MenuItem>
        <MenuItem value="critical">Crítica</MenuItem>
      </TextField>

      <TextField
        select
        size="small"
        label="Tipo"
        value={filters.type}
        onChange={(e) =>
          onChange({
            ...filters,
            type: e.target.value as TaskType | 'all',
          })
        }
        sx={{ minWidth: 130 }}
      >
        <MenuItem value="all">Todos</MenuItem>
        {TASK_TYPE_OPTIONS.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Status"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="all">Todos</MenuItem>
        {statusOptions.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Sprint"
        value={filters.sprintFilter}
        onChange={(e) =>
          onChange({
            ...filters,
            sprintFilter: e.target
              .value as TaskBoardFiltersState['sprintFilter'],
          })
        }
        sx={{ minWidth: 150 }}
      >
        <MenuItem value="all">Todas</MenuItem>
        <MenuItem value="with_sprint">Com Sprint</MenuItem>
        <MenuItem value="without_sprint">Sem Sprint</MenuItem>
      </TextField>

      <Box sx={{ flex: 1 }} />

      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_, val) => val && onViewModeChange(val)}
        size="small"
      >
        <ToggleButton value="list">
          <Tooltip title="Lista">
            <ListIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="kanban">
          <Tooltip title="Kanban">
            <KanbanIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
