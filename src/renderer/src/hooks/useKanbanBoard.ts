import { useState, useCallback, useRef } from 'react';
import { TaskLocalKanban } from '@shared/interfaces/config/index.types';

/**
 * Local position data for drag-and-drop state management.
 */
export interface LocalPosition {
  externalId: string;
  column: string;
  order: number;
}

/**
 * Context filter for fetching positions.
 */
export interface KanbanContext {
  parentId?: number;
}

/**
 * Return type for the useKanbanBoard hook.
 *
 * Validates: Requirements 18.3, 18.4
 */
export interface UseKanbanBoardReturn {
  loading: boolean;
  error: string | null;
  positions: Map<string, LocalPosition>;
  getPosition: (externalId: string) => Promise<LocalPosition | null>;
  setPosition: (
    externalId: string,
    column: string,
    order: number,
  ) => Promise<boolean>;
  resetPosition: (externalId: string) => Promise<boolean>;
  getByContext: (context: KanbanContext) => Promise<LocalPosition[]>;
  updateLocalPosition: (
    externalId: string,
    column: string,
    order: number,
  ) => void;
  clearLocalPositions: () => void;
  clearError: () => void;
}

interface UseKanbanBoardState {
  loading: boolean;
  error: string | null;
  positions: Map<string, LocalPosition>;
}

/**
 * Hook for managing Kanban board positions via IPC.
 *
 * This hook provides methods to get, set, and reset local Kanban positions
 * for work items, maintaining a local cache for efficient drag-and-drop operations.
 * Local positions allow users to simulate card movements without syncing to Azure DevOps.
 *
 * IPC Channels used:
 * - task-local-kanban:get-position
 * - task-local-kanban:set-position
 * - task-local-kanban:reset-position
 * - task-local-kanban:get-by-context
 *
 * Validates: Requirements 18.3, 18.4
 */
export function useKanbanBoard(): UseKanbanBoardReturn {
  const [state, setState] = useState<UseKanbanBoardState>({
    loading: false,
    error: null,
    positions: new Map(),
  });

  // Use ref to track the latest positions for cache updates
  const positionsRef = useRef<Map<string, LocalPosition>>(new Map());

  const setLoading = (loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading,
      error: loading ? null : prev.error,
    }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error, loading: false }));
  };

  const updateCache = (externalId: string, column: string, order: number) => {
    const position: LocalPosition = { externalId, column, order };
    positionsRef.current.set(externalId, position);
    setState((prev) => {
      const newPositions = new Map(prev.positions);
      newPositions.set(externalId, position);
      return { ...prev, positions: newPositions };
    });
  };

  const removeFromCache = (externalId: string) => {
    positionsRef.current.delete(externalId);
    setState((prev) => {
      const newPositions = new Map(prev.positions);
      newPositions.delete(externalId);
      return { ...prev, positions: newPositions };
    });
  };

  /**
   * Get the local Kanban position for a single work item.
   * Returns null if no position is set.
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns The position data or null
   */
  const getPosition = useCallback(
    async (externalId: string): Promise<LocalPosition | null> => {
      // Check cache first
      if (positionsRef.current.has(externalId)) {
        return positionsRef.current.get(externalId)!;
      }

      setLoading(true);
      try {
        const response =
          await window.electronAPI.taskLocalKanban.getPosition(externalId);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar posição do Kanban');
          return null;
        }

        if (response.data) {
          const position: LocalPosition = {
            externalId: response.data.externalId,
            column: response.data.localColumn,
            order: response.data.localOrder,
          };
          updateCache(externalId, position.column, position.order);
          setState((prev) => ({ ...prev, loading: false }));
          return position;
        }

        setState((prev) => ({ ...prev, loading: false }));
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  /**
   * Set the local Kanban position for a work item.
   * This persists the position to the database.
   *
   * @param externalId - The Azure DevOps work item ID
   * @param column - The Kanban column (e.g., "To Do", "In Progress", "Done")
   * @param order - The order within the column
   * @returns True if successful, false otherwise
   */
  const setPosition = useCallback(
    async (
      externalId: string,
      column: string,
      order: number,
    ): Promise<boolean> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.taskLocalKanban.setPosition(
          externalId,
          column,
          order,
        );
        if (!response.success) {
          setError(response.error || 'Erro ao definir posição do Kanban');
          return false;
        }

        updateCache(externalId, column, order);
        setState((prev) => ({ ...prev, loading: false }));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return false;
      }
    },
    [],
  );

  /**
   * Reset (delete) the local Kanban position for a work item.
   * This returns the card to its original Azure DevOps status.
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns True if successful, false otherwise
   */
  const resetPosition = useCallback(
    async (externalId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.taskLocalKanban.resetPosition(externalId);
        if (!response.success) {
          setError(response.error || 'Erro ao resetar posição do Kanban');
          return false;
        }

        removeFromCache(externalId);
        setState((prev) => ({ ...prev, loading: false }));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return false;
      }
    },
    [],
  );

  /**
   * Get all local Kanban positions for a given context.
   * Updates the local cache with all fetched positions.
   *
   * @param context - The context filter (parentId for drill-down navigation)
   * @returns Array of position data
   */
  const getByContext = useCallback(
    async (context: KanbanContext): Promise<LocalPosition[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.taskLocalKanban.getByContext(
          context.parentId,
        );
        if (!response.success) {
          setError(
            response.error || 'Erro ao buscar posições do Kanban por contexto',
          );
          return [];
        }

        const positions: LocalPosition[] = (response.data || []).map(
          (item: TaskLocalKanban) => ({
            externalId: item.externalId,
            column: item.localColumn,
            order: item.localOrder,
          }),
        );

        // Update cache with fetched positions
        setState((prev) => {
          const newPositions = new Map(prev.positions);
          for (const pos of positions) {
            newPositions.set(pos.externalId, pos);
            positionsRef.current.set(pos.externalId, pos);
          }
          return { ...prev, positions: newPositions, loading: false };
        });

        return positions;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  /**
   * Update local position in cache without persisting to database.
   * Useful for optimistic UI updates during drag-and-drop.
   *
   * @param externalId - The Azure DevOps work item ID
   * @param column - The Kanban column
   * @param order - The order within the column
   */
  const updateLocalPosition = useCallback(
    (externalId: string, column: string, order: number) => {
      updateCache(externalId, column, order);
    },
    [],
  );

  /**
   * Clear all local positions from cache.
   * Useful when navigating to a different context.
   */
  const clearLocalPositions = useCallback(() => {
    positionsRef.current.clear();
    setState((prev) => ({
      ...prev,
      positions: new Map(),
    }));
  }, []);

  /**
   * Clear the current error state.
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    positions: state.positions,
    getPosition,
    setPosition,
    resetPosition,
    getByContext,
    updateLocalPosition,
    clearLocalPositions,
    clearError,
  };
}
