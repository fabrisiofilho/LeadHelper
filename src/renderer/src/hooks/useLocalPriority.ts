import { useState, useCallback, useRef } from 'react';

/**
 * Local priority data structure.
 */
export interface TaskLocalPriorityData {
  id: number;
  externalId: string;
  localPriority: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Return type for the useLocalPriority hook.
 *
 * Validates: Requirements 4.3, 4.5
 */
export interface UseLocalPriorityReturn {
  loading: boolean;
  error: string | null;
  priorities: Map<string, number>;
  getPriority: (externalId: string) => Promise<number>;
  setPriority: (externalId: string, priority: number) => Promise<boolean>;
  removePriority: (externalId: string) => Promise<boolean>;
  getBatchPriorities: (
    externalIds: string[],
  ) => Promise<Record<string, number>>;
  clearError: () => void;
}

interface UseLocalPriorityState {
  loading: boolean;
  error: string | null;
  priorities: Map<string, number>;
}

/**
 * Hook for managing local task priorities via IPC.
 *
 * This hook provides methods to get, set, and remove local priorities
 * for work items, maintaining a local cache for efficient lookups.
 *
 * IPC Channels used:
 * - task-local-priority:get
 * - task-local-priority:set
 * - task-local-priority:remove
 * - task-local-priority:get-batch
 *
 * Validates: Requirements 4.3, 4.5
 */
export function useLocalPriority(): UseLocalPriorityReturn {
  const [state, setState] = useState<UseLocalPriorityState>({
    loading: false,
    error: null,
    priorities: new Map(),
  });

  // Use ref to track the latest priorities for cache updates
  const prioritiesRef = useRef<Map<string, number>>(new Map());

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

  const updateCache = (externalId: string, priority: number) => {
    prioritiesRef.current.set(externalId, priority);
    setState((prev) => {
      const newPriorities = new Map(prev.priorities);
      newPriorities.set(externalId, priority);
      return { ...prev, priorities: newPriorities };
    });
  };

  const removeFromCache = (externalId: string) => {
    prioritiesRef.current.delete(externalId);
    setState((prev) => {
      const newPriorities = new Map(prev.priorities);
      newPriorities.delete(externalId);
      return { ...prev, priorities: newPriorities };
    });
  };

  /**
   * Get the priority for a single work item.
   * Returns 0 if no priority is set (Property 9).
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns The priority value (0-5)
   */
  const getPriority = useCallback(
    async (externalId: string): Promise<number> => {
      // Check cache first
      if (prioritiesRef.current.has(externalId)) {
        return prioritiesRef.current.get(externalId)!;
      }

      setLoading(true);
      try {
        const response =
          await window.electronAPI.taskLocalPriority.get(externalId);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar prioridade');
          return 0;
        }

        const priority = response.data?.localPriority ?? 0;
        updateCache(externalId, priority);
        setState((prev) => ({ ...prev, loading: false }));
        return priority;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return 0;
      }
    },
    [],
  );

  /**
   * Set the priority for a work item.
   *
   * @param externalId - The Azure DevOps work item ID
   * @param priority - The priority value (0-5)
   * @returns True if successful, false otherwise
   */
  const setPriority = useCallback(
    async (externalId: string, priority: number): Promise<boolean> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.taskLocalPriority.set(
          externalId,
          priority,
        );
        if (!response.success) {
          setError(response.error || 'Erro ao definir prioridade');
          return false;
        }

        updateCache(externalId, priority);
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
   * Remove the priority for a work item.
   *
   * @param externalId - The Azure DevOps work item ID
   * @returns True if successful, false otherwise
   */
  const removePriority = useCallback(
    async (externalId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.taskLocalPriority.remove(externalId);
        if (!response.success) {
          setError(response.error || 'Erro ao remover prioridade');
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
   * Get priorities for multiple work items in batch.
   * Updates the local cache with all fetched priorities.
   *
   * @param externalIds - Array of Azure DevOps work item IDs
   * @returns Record of externalId to priority value
   */
  const getBatchPriorities = useCallback(
    async (externalIds: string[]): Promise<Record<string, number>> => {
      if (externalIds.length === 0) {
        return {};
      }

      // Check which IDs are not in cache
      const uncachedIds = externalIds.filter(
        (id) => !prioritiesRef.current.has(id),
      );

      // If all are cached, return from cache
      if (uncachedIds.length === 0) {
        const result: Record<string, number> = {};
        for (const id of externalIds) {
          result[id] = prioritiesRef.current.get(id) ?? 0;
        }
        return result;
      }

      setLoading(true);
      try {
        const response =
          await window.electronAPI.taskLocalPriority.getBatch(uncachedIds);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar prioridades em lote');
          // Return cached values for what we have
          const result: Record<string, number> = {};
          for (const id of externalIds) {
            result[id] = prioritiesRef.current.get(id) ?? 0;
          }
          return result;
        }

        // Update cache with fetched values
        const fetchedPriorities = response.data || {};
        setState((prev) => {
          const newPriorities = new Map(prev.priorities);
          for (const [id, priority] of Object.entries(fetchedPriorities)) {
            newPriorities.set(id, priority);
            prioritiesRef.current.set(id, priority);
          }
          return { ...prev, priorities: newPriorities, loading: false };
        });

        // Build result combining cache and fetched values
        const result: Record<string, number> = {};
        for (const id of externalIds) {
          result[id] =
            fetchedPriorities[id] ?? prioritiesRef.current.get(id) ?? 0;
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        // Return cached values for what we have
        const result: Record<string, number> = {};
        for (const id of externalIds) {
          result[id] = prioritiesRef.current.get(id) ?? 0;
        }
        return result;
      }
    },
    [],
  );

  /**
   * Clear the current error state.
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    priorities: state.priorities,
    getPriority,
    setPriority,
    removePriority,
    getBatchPriorities,
    clearError,
  };
}
