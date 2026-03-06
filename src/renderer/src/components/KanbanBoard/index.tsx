import { type FC, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Button,
  type SelectChangeEvent,
} from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import ClearIcon from '@mui/icons-material/Clear';
import styled, { keyframes, css } from 'styled-components';
import { rgba } from 'polished';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DroppableProvided,
  type DroppableStateSnapshot,
} from '@hello-pangea/dnd';
import { Task, Sprint, Team } from '@shared/interfaces/config/index.types';
import { SimplifiedCard } from '../SimplifiedCard';
import { useKanbanBoard, type LocalPosition } from '../../hooks/useKanbanBoard';

/**
 * Kanban column configuration.
 *
 * Validates: Requirements 18.2, 18.7
 */
export interface KanbanColumn {
  id: string;
  title: string;
  statuses: string[]; // Azure DevOps statuses that map to this column
  color: string;
}

/**
 * Props for the KanbanBoard component.
 *
 * Validates: Requirements 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.9
 * Property 38: Filtros de Kanban
 * Property 39: Kanban respeita contexto de navegação
 */
export interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onEnterTask?: (taskId: number) => void;
  loading?: boolean;
  // Filter props (Property 38)
  sprints?: Sprint[];
  teams?: Team[];
  assignees?: string[];
  selectedSprintId?: number;
  selectedTeamId?: number;
  selectedAssignee?: string;
  onSprintChange?: (sprintId: number | undefined) => void;
  onTeamChange?: (teamId: number | undefined) => void;
  onAssigneeChange?: (assignee: string | undefined) => void;
  // Drill-down context (Property 39)
  parentId?: number;
}

/**
 * Default Kanban columns configuration.
 * Maps Azure DevOps statuses to three main columns.
 *
 * Property 37: Agrupamento de Kanban por status
 */
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'todo',
    title: 'To Do',
    statuses: ['New', 'To Do', 'Approved'],
    color: '#919EAB', // grey
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    statuses: ['Active', 'In Progress', 'Committed'],
    color: '#135bec', // blue
  },
  {
    id: 'done',
    title: 'Done',
    statuses: ['Resolved', 'Done', 'Closed', 'Removed'],
    color: '#36B37E', // green
  },
];

// Styled components
const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 400px;
`;

/**
 * Filter bar container for Sprint, Team, and Assignee filters.
 * Property 38: Filtros de Kanban
 * Validates: Requirements 18.5
 */
const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background-color: ${({ theme }) => theme.COLORS.grey_100};
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterControl = styled(FormControl)`
  min-width: 180px;
  flex: 1;
  max-width: 250px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const ClearFiltersButton = styled(Button)`
  height: 40px;
  white-space: nowrap;
`;

const ColumnsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  /* Responsive: stack columns on mobile */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.COLORS.grey_100};
  border-radius: 0.5rem;
  min-height: 0;
  overflow: hidden;
`;

const ColumnHeader = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: ${({ $color }) => rgba($color, 0.15)};
  border-bottom: 2px solid ${({ $color }) => $color};
  flex-shrink: 0;
`;

const ColumnTitle = styled.h3<{ $color: string }>`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CardCount = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.375rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  background-color: ${({ $color }) => $color};
  color: #ffffff;
`;

// Pulse animation for drop zone highlight
const pulseAnimation = keyframes`
  0% {
    background-color: ${rgba('#135bec', 0.05)};
  }
  50% {
    background-color: ${rgba('#135bec', 0.15)};
  }
  100% {
    background-color: ${rgba('#135bec', 0.05)};
  }
`;

const ColumnContent = styled.div<{ $isDraggingOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  flex: 1;
  overflow-y: auto;
  min-height: 100px;
  transition: background-color 0.2s ease;

  /* Highlight drop zone when dragging over (Requirement 18.9) */
  ${({ $isDraggingOver }) =>
    $isDraggingOver &&
    css`
      animation: ${pulseAnimation} 1s ease-in-out infinite;
      border: 2px dashed ${rgba('#135bec', 0.5)};
      border-radius: 0.25rem;
    `}

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.COLORS.grey_300};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.COLORS.grey_400};
  }
`;

const EmptyColumn = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: ${({ theme }) => theme.COLORS.grey_500};
  font-size: 0.875rem;
  text-align: center;
`;

const LoadingContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  width: 100%;
  height: 100%;
`;

// Draggable card wrapper with drag styles
const DraggableCardWrapper = styled.div<{ $isDragging?: boolean }>`
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  ${({ $isDragging }) =>
    $isDragging &&
    css`
      transform: rotate(3deg);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    `}
`;

// Local position indicator badge (Requirement 18.9)
const LocalIndicatorWrapper = styled.div`
  position: relative;
`;

const LocalBadge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.COLORS.warn};
  color: #ffffff;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  svg {
    font-size: 14px;
  }
`;

/**
 * Groups tasks by their status into Kanban columns.
 * If a task has a local position, it uses that column instead of the original status.
 *
 * Property 37: Agrupamento de Kanban por status
 *
 * @param tasks - Array of tasks to group
 * @param columns - Kanban column configuration
 * @param localPositions - Map of external IDs to local positions
 * @returns Map of column ID to tasks in that column
 */
const groupTasksByColumn = (
  tasks: Task[],
  columns: KanbanColumn[],
  localPositions: Map<string, LocalPosition>,
): Map<string, Task[]> => {
  const grouped = new Map<string, Task[]>();

  // Initialize all columns with empty arrays
  columns.forEach((column) => {
    grouped.set(column.id, []);
  });

  // Group tasks by matching their status to column statuses
  // If task has local position, use that column instead
  tasks.forEach((task) => {
    const externalId = task.externalId || String(task.id);
    const localPosition = localPositions.get(externalId);

    // If task has local position, use that column
    if (localPosition) {
      const columnTasks = grouped.get(localPosition.column) || [];
      columnTasks.push(task);
      grouped.set(localPosition.column, columnTasks);
      return;
    }

    // Otherwise, use original status
    const taskStatus = task.status?.toLowerCase() || '';

    for (const column of columns) {
      const matchesColumn = column.statuses.some(
        (status) => status.toLowerCase() === taskStatus,
      );

      if (matchesColumn) {
        const columnTasks = grouped.get(column.id) || [];
        columnTasks.push(task);
        grouped.set(column.id, columnTasks);
        break;
      }
    }
  });

  // Sort tasks within each column by local order if available
  grouped.forEach((columnTasks, columnId) => {
    columnTasks.sort((a, b) => {
      const aExternalId = a.externalId || String(a.id);
      const bExternalId = b.externalId || String(b.id);
      const aPosition = localPositions.get(aExternalId);
      const bPosition = localPositions.get(bExternalId);

      // Tasks with local positions come first, sorted by order
      if (aPosition && bPosition) {
        return aPosition.order - bPosition.order;
      }
      if (aPosition) return -1;
      if (bPosition) return 1;

      // Default: maintain original order
      return 0;
    });
    grouped.set(columnId, columnTasks);
  });

  return grouped;
};

/**
 * KanbanBoard component for displaying tasks organized by status columns.
 *
 * This is the base structure for the Kanban board with three columns:
 * - "To Do": New, To Do, Approved
 * - "In Progress": Active, In Progress, Committed
 * - "Done": Resolved, Done, Closed, Removed
 *
 * Features:
 * - Three columns organized by status (Property 37)
 * - Card counter per column (Property 40)
 * - Drag-and-drop between columns (Requirements 18.3, 18.4)
 * - Local position persistence via useKanbanBoard hook
 * - Visual indicator for local-only positions (Requirement 18.9)
 * - Responsive layout (columns stack on mobile)
 * - Visual distinction between columns (different header colors)
 * - Uses SimplifiedCard component for cards
 * - Filter bar with Sprint, Team, and Assignee selectors (Property 38)
 * - Respects drill-down navigation context (Property 39)
 *
 * Validates: Requirements 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.9
 */
export const KanbanBoard: FC<Readonly<KanbanBoardProps>> = ({
  tasks,
  onTaskClick,
  onEnterTask,
  loading = false,
  // Filter props (Property 38)
  sprints = [],
  teams = [],
  assignees = [],
  selectedSprintId,
  selectedTeamId,
  selectedAssignee,
  onSprintChange,
  onTeamChange,
  onAssigneeChange,
  // Drill-down context (Property 39)
  parentId,
}) => {
  // Use the Kanban board hook for local position management
  const {
    positions: localPositions,
    setPosition,
    updateLocalPosition,
    getByContext,
  } = useKanbanBoard();

  // Load local positions on mount
  useEffect(() => {
    getByContext({});
  }, [getByContext]);

  /**
   * Filter tasks based on selected filters and drill-down context.
   *
   * Property 38: Filtros de Kanban - filters work together (AND logic)
   * Property 39: Kanban respeita contexto de navegação - only show children of parentId
   *
   * Validates: Requirements 18.5, 18.6
   */
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Property 39: When parentId is provided (drill-down context), only show children of that parent
    if (parentId !== undefined) {
      result = result.filter((task) => task.parentId === parentId);
    }

    // Property 38: Apply Sprint filter
    if (selectedSprintId !== undefined) {
      result = result.filter((task) => task.sprintId === selectedSprintId);
    }

    // Property 38: Apply Team filter
    if (selectedTeamId !== undefined) {
      result = result.filter((task) => task.teamId === selectedTeamId);
    }

    // Property 38: Apply Assignee filter
    if (selectedAssignee !== undefined && selectedAssignee !== '') {
      result = result.filter(
        (task) =>
          task.assignedToName === selectedAssignee ||
          task.assignee?.name === selectedAssignee,
      );
    }

    return result;
  }, [tasks, parentId, selectedSprintId, selectedTeamId, selectedAssignee]);

  // Group filtered tasks by column, considering local positions (Property 37)
  const tasksByColumn = useMemo(
    () =>
      groupTasksByColumn(filteredTasks, DEFAULT_KANBAN_COLUMNS, localPositions),
    [filteredTasks, localPositions],
  );

  /**
   * Check if any filter is active.
   */
  const hasActiveFilters = useMemo(
    () =>
      selectedSprintId !== undefined ||
      selectedTeamId !== undefined ||
      (selectedAssignee !== undefined && selectedAssignee !== ''),
    [selectedSprintId, selectedTeamId, selectedAssignee],
  );

  /**
   * Check if filter controls should be shown.
   * Show filters if any filter data is provided.
   */
  const showFilters = useMemo(
    () => sprints.length > 0 || teams.length > 0 || assignees.length > 0,
    [sprints.length, teams.length, assignees.length],
  );

  /**
   * Handle Sprint filter change.
   * Property 38: Filtros de Kanban
   */
  const handleSprintChange = useCallback(
    (event: SelectChangeEvent<number | ''>) => {
      const value = event.target.value;
      if (onSprintChange) {
        onSprintChange(value === '' ? undefined : (value as number));
      }
    },
    [onSprintChange],
  );

  /**
   * Handle Team filter change.
   * Property 38: Filtros de Kanban
   */
  const handleTeamChange = useCallback(
    (event: SelectChangeEvent<number | ''>) => {
      const value = event.target.value;
      if (onTeamChange) {
        onTeamChange(value === '' ? undefined : (value as number));
      }
    },
    [onTeamChange],
  );

  /**
   * Handle Assignee filter change.
   * Property 38: Filtros de Kanban
   */
  const handleAssigneeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      if (onAssigneeChange) {
        onAssigneeChange(value === '' ? undefined : value);
      }
    },
    [onAssigneeChange],
  );

  /**
   * Clear all filters.
   * Property 38: Filtros de Kanban
   */
  const handleClearFilters = useCallback(() => {
    if (onSprintChange) onSprintChange(undefined);
    if (onTeamChange) onTeamChange(undefined);
    if (onAssigneeChange) onAssigneeChange(undefined);
  }, [onSprintChange, onTeamChange, onAssigneeChange]);

  // Handle card click
  const handleCardClick = useCallback(
    (task: Task) => {
      if (onTaskClick) {
        onTaskClick(task);
      }
    },
    [onTaskClick],
  );

  // Handle enter task (drill-down)
  const handleEnterTask = useCallback(
    (taskId: number) => {
      if (onEnterTask) {
        onEnterTask(taskId);
      }
    },
    [onEnterTask],
  );

  /**
   * Handle drag end event.
   * Saves the new position locally without syncing to Azure DevOps.
   *
   * Property 37: Agrupamento de Kanban por status
   * Requirement 18.3: Permitir arrastar cards entre colunas
   * Requirement 18.4: Armazenar a posição simulada do card apenas localmente
   */
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;

      // Dropped outside a valid droppable
      if (!destination) {
        return;
      }

      // Dropped in the same position
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      // Extract external ID from draggable ID
      const externalId = draggableId.replace('kanban-card-', '');
      const newColumn = destination.droppableId;
      const newOrder = destination.index;

      // Optimistic update: update local state immediately
      updateLocalPosition(externalId, newColumn, newOrder);

      // Persist to database
      await setPosition(externalId, newColumn, newOrder);
    },
    [setPosition, updateLocalPosition],
  );

  /**
   * Check if a task has a local position (moved from original status).
   */
  const hasLocalPosition = useCallback(
    (task: Task): boolean => {
      const externalId = task.externalId || String(task.id);
      return localPositions.has(externalId);
    },
    [localPositions],
  );

  /**
   * Render a draggable card with local position indicator.
   */
  const renderDraggableCard = useCallback(
    (
      task: Task,
      provided: DraggableProvided,
      snapshot: DraggableStateSnapshot,
    ) => {
      const isLocal = hasLocalPosition(task);

      return (
        <DraggableCardWrapper
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          $isDragging={snapshot.isDragging}
          style={provided.draggableProps.style}
        >
          <LocalIndicatorWrapper>
            {/* Requirement 18.9: Visual indicator for local-only position */}
            {isLocal && (
              <Tooltip
                title="Posição local - não sincronizada com Azure DevOps"
                arrow
              >
                <LocalBadge aria-label="Posição local">
                  <CloudOffIcon />
                </LocalBadge>
              </Tooltip>
            )}
            <SimplifiedCard
              task={task}
              childrenCount={task.children?.length || 0}
              showEnterButton={true}
              onEnter={handleEnterTask}
              onCardClick={handleCardClick}
            />
          </LocalIndicatorWrapper>
        </DraggableCardWrapper>
      );
    },
    [hasLocalPosition, handleEnterTask, handleCardClick],
  );

  // Loading state
  if (loading) {
    return (
      <BoardContainer>
        <LoadingContainer>
          <CircularProgress size={40} />
        </LoadingContainer>
      </BoardContainer>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <BoardContainer role="region" aria-label="Quadro Kanban">
        {/* Filter bar (Property 38: Filtros de Kanban) */}
        {showFilters && (
          <FilterBar role="group" aria-label="Filtros do Kanban">
            {/* Sprint filter */}
            {sprints.length > 0 && (
              <FilterControl size="small">
                <InputLabel id="kanban-sprint-filter-label">Sprint</InputLabel>
                <Select
                  labelId="kanban-sprint-filter-label"
                  id="kanban-sprint-filter"
                  value={selectedSprintId ?? ''}
                  onChange={handleSprintChange}
                  input={<OutlinedInput label="Sprint" />}
                >
                  <MenuItem value="">
                    <em>Todas</em>
                  </MenuItem>
                  {sprints.map((sprint) => (
                    <MenuItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </MenuItem>
                  ))}
                </Select>
              </FilterControl>
            )}

            {/* Team filter */}
            {teams.length > 0 && (
              <FilterControl size="small">
                <InputLabel id="kanban-team-filter-label">Equipe</InputLabel>
                <Select
                  labelId="kanban-team-filter-label"
                  id="kanban-team-filter"
                  value={selectedTeamId ?? ''}
                  onChange={handleTeamChange}
                  input={<OutlinedInput label="Equipe" />}
                >
                  <MenuItem value="">
                    <em>Todas</em>
                  </MenuItem>
                  {teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FilterControl>
            )}

            {/* Assignee filter */}
            {assignees.length > 0 && (
              <FilterControl size="small">
                <InputLabel id="kanban-assignee-filter-label">
                  Responsável
                </InputLabel>
                <Select
                  labelId="kanban-assignee-filter-label"
                  id="kanban-assignee-filter"
                  value={selectedAssignee ?? ''}
                  onChange={handleAssigneeChange}
                  input={<OutlinedInput label="Responsável" />}
                >
                  <MenuItem value="">
                    <em>Todos</em>
                  </MenuItem>
                  {assignees.map((assignee) => (
                    <MenuItem key={assignee} value={assignee}>
                      {assignee}
                    </MenuItem>
                  ))}
                </Select>
              </FilterControl>
            )}

            {/* Clear filters button */}
            {hasActiveFilters && (
              <ClearFiltersButton
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                aria-label="Limpar filtros"
              >
                Limpar Filtros
              </ClearFiltersButton>
            )}
          </FilterBar>
        )}

        <ColumnsContainer>
          {DEFAULT_KANBAN_COLUMNS.map((column) => {
            const columnTasks = tasksByColumn.get(column.id) || [];
            const cardCount = columnTasks.length;

            return (
              <Column
                key={column.id}
                role="group"
                aria-label={`Coluna ${column.title}`}
              >
                {/* Column header with title and card count (Property 40) */}
                <ColumnHeader $color={column.color}>
                  <ColumnTitle $color={column.color}>
                    {column.title}
                  </ColumnTitle>
                  <CardCount
                    $color={column.color}
                    aria-label={`${cardCount} ${cardCount === 1 ? 'card' : 'cards'}`}
                  >
                    {cardCount}
                  </CardCount>
                </ColumnHeader>

                {/* Droppable column content */}
                <Droppable droppableId={column.id}>
                  {(
                    droppableProvided: DroppableProvided,
                    droppableSnapshot: DroppableStateSnapshot,
                  ) => (
                    <ColumnContent
                      ref={droppableProvided.innerRef}
                      {...droppableProvided.droppableProps}
                      $isDraggingOver={droppableSnapshot.isDraggingOver}
                    >
                      {columnTasks.length === 0 ? (
                        <EmptyColumn>Nenhum item nesta coluna</EmptyColumn>
                      ) : (
                        columnTasks.map((task, index) => {
                          const draggableId = `kanban-card-${task.externalId || task.id}`;

                          return (
                            <Draggable
                              key={draggableId}
                              draggableId={draggableId}
                              index={index}
                            >
                              {(
                                draggableProvided: DraggableProvided,
                                draggableSnapshot: DraggableStateSnapshot,
                              ) =>
                                renderDraggableCard(
                                  task,
                                  draggableProvided,
                                  draggableSnapshot,
                                )
                              }
                            </Draggable>
                          );
                        })
                      )}
                      {droppableProvided.placeholder}
                    </ColumnContent>
                  )}
                </Droppable>
              </Column>
            );
          })}
        </ColumnsContainer>
      </BoardContainer>
    </DragDropContext>
  );
};

export default KanbanBoard;
