import { useState, useEffect, useCallback, useMemo, type FC } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Stack,
  Collapse,
  IconButton,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import styled from 'styled-components';
import { Task } from '@shared/interfaces/config/index.types';
import { SimplifiedCard } from '@renderer/components/SimplifiedCard';
import { KanbanBoard } from '@renderer/components/KanbanBoard';
import { StaleItemIndicator } from '@renderer/components/StaleItemIndicator';
import { LocalPriorityBadge } from '@renderer/components/LocalPriorityBadge';
import { DrillDownNavigation } from '@renderer/components/DrillDownNavigation';
import { HierarchyCharts } from '@renderer/components/HierarchyCharts';
import { useLocalPriority } from '@renderer/hooks/useLocalPriority';
import { EmptyListMessage } from '@renderer/components/EmptyListMessage';

/**
 * View mode for the tab.
 */
type ViewMode = 'cards' | 'kanban';

/**
 * Sustentação item from the API.
 */
interface SustentacaoItem {
  task: Task;
  localPriority: number;
  isStale: boolean;
  daysSinceUpdate: number;
  childrenCount: number;
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

const StaleCounter = styled(Chip)`
  font-weight: 600;

  .MuiChip-icon {
    color: ${({ theme }) => theme.COLORS.warn};
  }
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

const CardWrapper = styled(Box)`
  position: relative;
`;

const CardExtras = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0 0.5rem;
`;

const ChildrenSection = styled(Box)`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-radius: 0.5rem;
  border-left: 3px solid ${({ theme }) => theme.COLORS.primary};
`;

const ChildItem = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  background-color: ${({ theme }) => theme.COLORS.surface};
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

/**
 * SustentacaoTab component - Dashboard tab for Sustentação team.
 *
 * Features:
 * - Filters Tickets and Improvements (Property 1)
 * - Highlights stale items (Property 4)
 * - Shows stale items counter
 * - Orders by local priority DESC, then updatedAt ASC (Property 5)
 * - Allows expansion to see child Tasks
 * - Toggle between Cards and Kanban view
 * - Integrates DrillDownNavigation for hierarchy navigation
 * - Integrates HierarchyCharts for contextual charts
 *
 * Validates: Requirements 2.1-2.9, 3.1-3.5
 */
export const SustentacaoTab: FC = () => {
  const [items, setItems] = useState<SustentacaoItem[]>([]);
  const [loading, setLoading] = useState(true);
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
   * Load Sustentação items from the API.
   */
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await window.electronAPI.dashboard.getSustentacaoItems({
        staleDays: 3,
      });

      if (!response.success) {
        setError(response.error || 'Erro ao carregar itens de Sustentação');
        return;
      }

      const data = response.data || [];
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
  }, [getBatchPriorities]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  /**
   * Count of stale items.
   */
  const staleCount = useMemo(
    () => items.filter((item) => item.isStale).length,
    [items],
  );

  /**
   * Convert items to Task array for KanbanBoard.
   */
  const tasks = useMemo(() => items.map((item) => item.task), [items]);

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
      // Reload items to get updated order
      await loadItems();
    },
    [setPriority, loadItems],
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
   * Get the current priority for an item.
   */
  const getItemPriority = useCallback(
    (item: SustentacaoItem): number => {
      const externalId = item.task.externalId;
      if (externalId && priorities.has(externalId)) {
        return priorities.get(externalId)!;
      }
      return item.localPriority;
    },
    [priorities],
  );

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress size={40} />
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <TabContainer>
      {/* Header with stale counter and view toggle */}
      <HeaderSection>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            Tickets e Improvements
          </Typography>
          {staleCount > 0 && (
            <StaleCounter
              icon={<WarningAmberIcon />}
              label={`${staleCount} ${staleCount === 1 ? 'item parado' : 'itens parados'}`}
              color="warning"
              variant="outlined"
            />
          )}
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
      </HeaderSection>

      {/* Charts section */}
      <HierarchyCharts tasks={tasks} />

      {/* Content section */}
      <ContentSection>
        {items.length === 0 ? (
          <EmptyListMessage
            title="Nenhum item encontrado"
            description="Não há Tickets ou Improvements em aberto no momento."
          />
        ) : viewMode === 'kanban' ? (
          <KanbanBoard tasks={tasks} />
        ) : (
          <DrillDownNavigation emptyMessage="Este item não possui tarefas filhas.">
            {({ isAtRoot, children: drillDownChildren, navigateToChild }) => (
              <CardsGrid>
                {(isAtRoot
                  ? items
                  : drillDownChildren.map((t) => ({
                      task: t,
                      localPriority: 0,
                      isStale: false,
                      daysSinceUpdate: 0,
                      childrenCount: 0,
                    }))
                ).map((item) => {
                  const task = 'task' in item ? item.task : (item as Task);
                  const sustItem =
                    'task' in item ? (item as SustentacaoItem) : null;
                  const isExpanded = expandedItems.has(task.id);
                  const children = childrenMap.get(task.id) || [];
                  const isLoadingChildren = loadingChildren.has(task.id);
                  const priority = sustItem ? getItemPriority(sustItem) : 0;

                  return (
                    <CardWrapper key={task.id}>
                      <SimplifiedCard
                        task={task}
                        childrenCount={
                          sustItem?.childrenCount ?? children.length
                        }
                        showEnterButton={
                          !isAtRoot || (sustItem?.childrenCount ?? 0) > 0
                        }
                        showBackButton={!isAtRoot}
                        onEnter={(taskId) => navigateToChild(taskId)}
                      />

                      {/* Extra info: priority and stale indicator */}
                      {sustItem && (
                        <CardExtras>
                          <LocalPriorityBadge
                            priority={priority}
                            onChange={(newPriority) =>
                              task.externalId &&
                              handlePriorityChange(task.externalId, newPriority)
                            }
                          />
                          {task.updatedAt && (
                            <StaleItemIndicator
                              lastUpdated={task.updatedAt}
                              staleDaysThreshold={3}
                              criticalDaysThreshold={7}
                            />
                          )}
                          {(sustItem.childrenCount ?? 0) > 0 && (
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
                            children.map((child) => (
                              <ChildItem key={child.id}>
                                <ChildInfo>
                                  <ChildTitle>
                                    #{child.externalId} - {child.title}
                                  </ChildTitle>
                                  <ChildMeta>
                                    {child.status} •{' '}
                                    {child.assignedToName || 'Não atribuído'}
                                  </ChildMeta>
                                </ChildInfo>
                              </ChildItem>
                            ))
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

export default SustentacaoTab;
