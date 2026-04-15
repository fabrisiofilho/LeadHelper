import { useState, useEffect, useCallback, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Collapse,
  IconButton,
  Chip,
  Stack,
  type SelectChangeEvent,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import styled from 'styled-components';
import { rgba } from 'polished';
import { Task, Sprint } from '@shared/interfaces/config/index.types';
import { SimplifiedCard } from '@renderer/components/SimplifiedCard';
import { KanbanBoard } from '@renderer/components/KanbanBoard';
import { LocalPriorityBadge } from '@renderer/components/LocalPriorityBadge';
import { useSyncRefresh } from '@renderer/hooks/useSyncRefresh';
import { DrillDownNavigation } from '@renderer/components/DrillDownNavigation';
import { HierarchyCharts } from '@renderer/components/HierarchyCharts';
import { useLocalPriority } from '@renderer/hooks/useLocalPriority';
import { EmptyListMessage } from '@renderer/components/EmptyListMessage';

/**
 * View mode for the tab.
 */
type ViewMode = 'cards' | 'kanban';

/**
 * Projetos item from the API.
 */
interface ProjetosItem {
  task: Task;
  localPriority: number;
  childrenCount: number;
  completedChildrenCount: number;
  progressPercent: number;
}

// Styled components
const TabContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
`;

const HeaderSection = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem 0;
`;

const ControlsSection = styled(Box)`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SprintSelector = styled(FormControl)`
  min-width: 200px;
`;

const ViewToggle = styled(ToggleButtonGroup)`
  .MuiToggleButton-root {
    padding: 0.5rem 1rem;
    text-transform: none;

    &.Mui-selected {
      background-color: ${({ theme }) => theme.COLORS.primary_100};
      color: ${({ theme }) => theme.COLORS.primary};
    }
  }
`;

const ContentSection = styled(Box)`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

const CardsGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  padding: 0.5rem 0;
`;

const LoadingContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  width: 100%;
`;

const CardWrapper = styled(Box)<{ $isComplete?: boolean }>`
  position: relative;
  ${({ $isComplete, theme }) =>
    $isComplete &&
    `
    border: 2px solid ${theme.COLORS.success};
    border-radius: 0.5rem;
    padding: 0.25rem;
  `}
`;

const CompleteBadge = styled(Chip)`
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 10;
  font-size: 0.6875rem;
  height: 24px;

  .MuiChip-icon {
    font-size: 1rem;
  }
`;

const CardExtras = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0 0.5rem;
`;

const ProgressSection = styled(Box)`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ProgressBar = styled(LinearProgress)<{ $isComplete?: boolean }>`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.COLORS.grey_200};

  .MuiLinearProgress-bar {
    background-color: ${({ $isComplete, theme }) =>
      $isComplete ? theme.COLORS.success : theme.COLORS.primary};
    border-radius: 4px;
  }
`;

const ProgressText = styled(Typography)`
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
`;

const ChildrenSection = styled(Box)`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-radius: 0.5rem;
  border-left: 3px solid ${({ theme }) => theme.COLORS.primary};
`;

const ChildItem = styled(Box)<{ $isComplete?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  background-color: ${({ theme, $isComplete }) =>
    $isComplete ? rgba(theme.COLORS.success, 0.1) : theme.COLORS.surface};
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ChildInfo = styled(Box)`
  flex: 1;
  min-width: 0;
`;

const ChildTitle = styled(Typography)`
  font-size: 0.8125rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChildMeta = styled(Typography)`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;

const StatusBadge = styled(Chip)<{ $isComplete?: boolean }>`
  font-size: 0.625rem;
  height: 20px;
`;

/**
 * ProjetosTab component - Dashboard tab for Projetos team.
 *
 * Features:
 * - Sprint selector dropdown
 * - Filters User Stories by selected Sprint (Property 2)
 * - Shows progress bar for each User Story (Property 10)
 * - Highlights completed User Stories (Property 11)
 * - Allows expansion to see child Tasks
 * - Toggle between Cards and Kanban view
 * - Integrates DrillDownNavigation for hierarchy navigation
 * - Integrates HierarchyCharts for contextual charts
 *
 * Validates: Requirements 5.1-5.8, 6.1-6.5
 */
export const ProjetosTab: FC = () => {
  const [items, setItems] = useState<ProjetosItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [loadingSprints, setLoadingSprints] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Map<number, Task[]>>(
    new Map(),
  );
  const [loadingChildren, setLoadingChildren] = useState<Set<number>>(
    new Set(),
  );

  const { setPriority, getBatchPriorities, priorities } = useLocalPriority();

  /**
   * Load available sprints.
   */
  const loadSprints = useCallback(async () => {
    setLoadingSprints(true);
    try {
      const response = await window.electronAPI.sprint.findAll();
      if (response.success && response.data) {
        // Sort sprints by start date (most recent first)
        const sortedSprints = [...response.data].sort((a, b) => {
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
          return bDate - aDate;
        });
        setSprints(sortedSprints);

        // Auto-select current sprint if available
        const now = new Date();
        const currentSprint = sortedSprints.find((sprint) => {
          const start = sprint.startDate ? new Date(sprint.startDate) : null;
          const end = sprint.endDate ? new Date(sprint.endDate) : null;
          return start && end && now >= start && now <= end;
        });

        if (currentSprint) {
          setSelectedSprintId(currentSprint.id);
        } else if (sortedSprints.length > 0) {
          setSelectedSprintId(sortedSprints[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading sprints:', err);
    } finally {
      setLoadingSprints(false);
    }
  }, []);

  /**
   * Load Projetos items for the selected sprint.
   */
  const loadItems = useCallback(async () => {
    if (!selectedSprintId) {
      setItems([]);
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
        setError(response.error || 'Erro ao carregar itens de Projetos');
        return;
      }

      const data = response.data?.items || [];
      setItems(data);

      // Pre-load priorities for all items
      const externalIds = data
        .map((item) => item.task.externalId)
        .filter((id): id is string => !!id);
      if (externalIds.length > 0) {
        await getBatchPriorities(externalIds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId, getBatchPriorities]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  useEffect(() => {
    if (selectedSprintId) {
      loadItems();
    }
  }, [selectedSprintId, loadItems]);

  // Refresh data automatically when sync completes
  useSyncRefresh(loadItems);

  /**
   * Convert items to Task array for KanbanBoard.
   */
  const tasks = useMemo(() => items.map((item) => item.task), [items]);

  /**
   * Handle sprint selection change.
   */
  const handleSprintChange = (event: SelectChangeEvent<number | ''>) => {
    setSelectedSprintId(event.target.value as number | '');
    setExpandedItems(new Set());
    setChildrenMap(new Map());
  };

  /**
   * Handle view mode change.
   */
  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: ViewMode | null,
  ) => {
    if (newMode) {
      setViewMode(newMode);
    }
  };

  /**
   * Handle priority change for an item.
   */
  const handlePriorityChange = useCallback(
    async (externalId: string, newPriority: number) => {
      await setPriority(externalId, newPriority);
    },
    [setPriority],
  );

  /**
   * Toggle expansion of an item to show/hide children.
   */
  const toggleExpand = useCallback(
    async (itemId: number) => {
      const newExpanded = new Set(expandedItems);

      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);

        // Load children if not already loaded
        if (!childrenMap.has(itemId)) {
          setLoadingChildren((prev) => new Set(prev).add(itemId));
          try {
            const response =
              await window.electronAPI.hierarchy.getChildren(itemId);
            if (response.success && response.data) {
              setChildrenMap((prev) =>
                new Map(prev).set(itemId, response.data!),
              );
            }
          } catch {
            // Ignore errors, just don't show children
          } finally {
            setLoadingChildren((prev) => {
              const next = new Set(prev);
              next.delete(itemId);
              return next;
            });
          }
        }
      }

      setExpandedItems(newExpanded);
    },
    [expandedItems, childrenMap],
  );

  /**
   * Expand all items.
   */
  const expandAll = useCallback(async () => {
    const allIds = new Set(items.map((item) => item.task.id));
    setExpandedItems(allIds);

    // Load children for all items that don't have them yet
    const idsToLoad = items
      .filter(
        (item) => !childrenMap.has(item.task.id) && item.childrenCount > 0,
      )
      .map((item) => item.task.id);

    if (idsToLoad.length > 0) {
      setLoadingChildren(new Set(idsToLoad));
      await Promise.all(
        idsToLoad.map(async (id) => {
          try {
            const response = await window.electronAPI.hierarchy.getChildren(id);
            if (response.success && response.data) {
              setChildrenMap((prev) => new Map(prev).set(id, response.data!));
            }
          } catch {
            // Ignore errors
          }
        }),
      );
      setLoadingChildren(new Set());
    }
  }, [items, childrenMap]);

  /**
   * Collapse all items.
   */
  const collapseAll = useCallback(() => {
    setExpandedItems(new Set());
  }, []);

  /**
   * Get the current priority for an item.
   */
  const getItemPriority = useCallback(
    (item: ProjetosItem): number => {
      const externalId = item.task.externalId;
      if (externalId && priorities.has(externalId)) {
        return priorities.get(externalId)!;
      }
      return item.localPriority;
    },
    [priorities],
  );

  /**
   * Check if a User Story is complete (all children done).
   * Property 11: Destaque de User Story completa
   */
  const isComplete = (item: ProjetosItem): boolean => {
    return item.childrenCount > 0 && item.progressPercent === 100;
  };

  /**
   * Check if a child task is complete.
   */
  const isChildComplete = (child: Task): boolean => {
    const completedStatuses = ['completed', 'Done', 'Closed'];
    return completedStatuses.includes(child.status);
  };

  if (loadingSprints) {
    return (
      <LoadingContainer>
        <CircularProgress size={40} />
      </LoadingContainer>
    );
  }

  return (
    <TabContainer>
      {/* Header with sprint selector and view toggle */}
      <HeaderSection>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            User Stories
          </Typography>
        </Stack>

        <ControlsSection>
          <SprintSelector size="small">
            <InputLabel id="sprint-selector-label">Sprint</InputLabel>
            <Select
              labelId="sprint-selector-label"
              id="sprint-selector"
              value={selectedSprintId}
              onChange={handleSprintChange}
              label="Sprint"
            >
              {sprints.map((sprint) => (
                <MenuItem key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </MenuItem>
              ))}
            </Select>
          </SprintSelector>

          <Stack direction="row" spacing={1}>
            <Chip
              label="Expandir Todos"
              onClick={expandAll}
              variant="outlined"
              size="small"
            />
            <Chip
              label="Colapsar Todos"
              onClick={collapseAll}
              variant="outlined"
              size="small"
            />
          </Stack>

          <ViewToggle
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="Modo de visualização"
          >
            <ToggleButton value="cards" aria-label="Visualização em cards">
              <ViewModuleIcon sx={{ mr: 0.5 }} />
              Cards
            </ToggleButton>
            <ToggleButton value="kanban" aria-label="Visualização Kanban">
              <ViewKanbanIcon sx={{ mr: 0.5 }} />
              Kanban
            </ToggleButton>
          </ViewToggle>
        </ControlsSection>
      </HeaderSection>

      {/* Charts section */}
      <HierarchyCharts tasks={tasks} sprintId={selectedSprintId as number} />

      {/* Content section */}
      <ContentSection>
        {loading ? (
          <LoadingContainer>
            <CircularProgress size={40} />
          </LoadingContainer>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        ) : !selectedSprintId ? (
          <EmptyListMessage
            title="Selecione uma Sprint"
            description="Escolha uma Sprint no seletor acima para visualizar as User Stories."
          />
        ) : items.length === 0 ? (
          <EmptyListMessage
            title="Nenhuma User Story encontrada"
            description="Não há User Stories para a Sprint selecionada."
          />
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            tasks={tasks}
            sprints={sprints}
            selectedSprintId={selectedSprintId as number}
          />
        ) : (
          <DrillDownNavigation emptyMessage="Esta User Story não possui tarefas filhas.">
            {({ isAtRoot, children: drillDownChildren, navigateToChild }) => (
              <CardsGrid>
                {(isAtRoot
                  ? items
                  : drillDownChildren.map((t) => ({
                      task: t,
                      localPriority: 0,
                      childrenCount: 0,
                      completedChildrenCount: 0,
                      progressPercent: 0,
                    }))
                ).map((item) => {
                  const task = 'task' in item ? item.task : (item as Task);
                  const projItem =
                    'task' in item ? (item as ProjetosItem) : null;
                  const isExpanded = expandedItems.has(task.id);
                  const children = childrenMap.get(task.id) || [];
                  const isLoadingChildren = loadingChildren.has(task.id);
                  const priority = projItem ? getItemPriority(projItem) : 0;
                  const complete = projItem ? isComplete(projItem) : false;

                  return (
                    <CardWrapper key={task.id} $isComplete={complete}>
                      {complete && (
                        <CompleteBadge
                          icon={<CheckCircleIcon />}
                          label="Completa"
                          color="success"
                          size="small"
                        />
                      )}

                      <SimplifiedCard
                        task={task}
                        childrenCount={
                          projItem?.childrenCount ?? children.length
                        }
                        showEnterButton={
                          !isAtRoot || (projItem?.childrenCount ?? 0) > 0
                        }
                        showBackButton={!isAtRoot}
                        onEnter={(taskId) => navigateToChild(taskId)}
                      />

                      {/* Extra info: priority, progress, and expand button */}
                      {projItem && (
                        <CardExtras>
                          <LocalPriorityBadge
                            priority={priority}
                            onChange={(newPriority) =>
                              task.externalId &&
                              handlePriorityChange(task.externalId, newPriority)
                            }
                          />

                          {/* Progress bar (Property 10) */}
                          <ProgressSection>
                            <ProgressBar
                              variant="determinate"
                              value={projItem.progressPercent}
                              $isComplete={complete}
                            />
                            <ProgressText>
                              {projItem.progressPercent}%
                            </ProgressText>
                          </ProgressSection>

                          {(projItem.childrenCount ?? 0) > 0 && (
                            <IconButton
                              size="small"
                              onClick={() => toggleExpand(task.id)}
                              aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                            >
                              {isExpanded ? (
                                <ExpandLessIcon />
                              ) : (
                                <ExpandMoreIcon />
                              )}
                            </IconButton>
                          )}
                        </CardExtras>
                      )}

                      {/* Children section */}
                      <Collapse in={isExpanded}>
                        <ChildrenSection>
                          {isLoadingChildren ? (
                            <Box display="flex" justifyContent="center" py={1}>
                              <CircularProgress size={20} />
                            </Box>
                          ) : children.length === 0 ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Nenhuma tarefa filha encontrada.
                            </Typography>
                          ) : (
                            children.map((child) => {
                              const childComplete = isChildComplete(child);
                              return (
                                <ChildItem
                                  key={child.id}
                                  $isComplete={childComplete}
                                >
                                  <ChildInfo>
                                    <ChildTitle>
                                      #{child.externalId} - {child.title}
                                    </ChildTitle>
                                    <ChildMeta>
                                      {child.assignedToName || 'Não atribuído'}
                                    </ChildMeta>
                                  </ChildInfo>
                                  <StatusBadge
                                    label={child.status}
                                    size="small"
                                    color={
                                      childComplete ? 'success' : 'default'
                                    }
                                    variant={
                                      childComplete ? 'filled' : 'outlined'
                                    }
                                    $isComplete={childComplete}
                                  />
                                </ChildItem>
                              );
                            })
                          )}
                        </ChildrenSection>
                      </Collapse>
                    </CardWrapper>
                  );
                })}
              </CardsGrid>
            )}
          </DrillDownNavigation>
        )}
      </ContentSection>
    </TabContainer>
  );
};

export default ProjetosTab;
