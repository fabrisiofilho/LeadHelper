import { useState, useCallback, useRef } from 'react';
import { Task, BreadcrumbItem } from '@shared/interfaces/config/index.types';

/**
 * Return type for the useHierarchyNavigation hook.
 *
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 16.3
 */
export interface UseHierarchyNavigationReturn {
  loading: boolean;
  error: string | null;
  currentParentId: number | undefined;
  breadcrumb: BreadcrumbItem[];
  children: Task[];
  childrenCount: number;
  navigationHistory: number[];
  navigateToChild: (childId: number) => Promise<void>;
  navigateToParent: () => Promise<void>;
  navigateToBreadcrumb: (itemId: number) => Promise<void>;
  navigateToRoot: () => void;
  clearError: () => void;
}

interface UseHierarchyNavigationState {
  loading: boolean;
  error: string | null;
  currentParentId: number | undefined;
  breadcrumb: BreadcrumbItem[];
  children: Task[];
  childrenCount: number;
}

/**
 * Hook for managing hierarchical drill-down navigation.
 *
 * This hook provides methods to navigate through work item hierarchies,
 * maintaining navigation history for back navigation and building breadcrumbs.
 *
 * IPC Channels used:
 * - hierarchy:get-children
 * - hierarchy:count-children
 * - hierarchy:build-breadcrumb
 *
 * Properties implemented:
 * - Property 28: Histórico de navegação permite voltar
 * - Property 30: Construção de breadcrumb percorre ancestrais
 *
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 16.3
 */
export function useHierarchyNavigation(): UseHierarchyNavigationReturn {
  const [state, setState] = useState<UseHierarchyNavigationState>({
    loading: false,
    error: null,
    currentParentId: undefined,
    breadcrumb: [],
    children: [],
    childrenCount: 0,
  });

  // Navigation history stack for back navigation (Property 28)
  // Stores parent IDs in order of navigation
  const navigationHistoryRef = useRef<number[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([]);

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

  /**
   * Load children and breadcrumb for a given parent ID.
   * If parentId is undefined, we're at the root level.
   *
   * @param parentId - The parent ID to load children for
   */
  const loadChildrenAndBreadcrumb = useCallback(
    async (parentId: number | undefined) => {
      setLoading(true);

      try {
        let children: Task[] = [];
        let childrenCount = 0;
        let breadcrumb: BreadcrumbItem[] = [];

        if (parentId !== undefined) {
          // Fetch children for the parent
          const childrenResponse =
            await window.electronAPI.hierarchy.getChildren(parentId);
          if (!childrenResponse.success) {
            setError(childrenResponse.error || 'Erro ao buscar filhos');
            return;
          }
          children = childrenResponse.data || [];
          childrenCount = children.length;

          // Build breadcrumb for the current parent
          const breadcrumbResponse =
            await window.electronAPI.hierarchy.buildBreadcrumb(parentId);
          if (!breadcrumbResponse.success) {
            setError(
              breadcrumbResponse.error || 'Erro ao construir breadcrumb',
            );
            return;
          }
          breadcrumb = breadcrumbResponse.data || [];
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          currentParentId: parentId,
          children,
          childrenCount,
          breadcrumb,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
      }
    },
    [],
  );

  /**
   * Navigate to a child item (drill-down).
   *
   * Property 28: Adds current parent to history before navigating.
   *
   * @param childId - The ID of the child to navigate to
   */
  const navigateToChild = useCallback(
    async (childId: number): Promise<void> => {
      // Push current parent to history before navigating
      if (state.currentParentId !== undefined) {
        navigationHistoryRef.current.push(state.currentParentId);
      } else {
        // Mark root level with a special value (-1 represents root)
        navigationHistoryRef.current.push(-1);
      }
      setNavigationHistory([...navigationHistoryRef.current]);

      await loadChildrenAndBreadcrumb(childId);
    },
    [state.currentParentId, loadChildrenAndBreadcrumb],
  );

  /**
   * Navigate to the parent level (back navigation).
   *
   * Property 28: Pops from history to return to previous level.
   */
  const navigateToParent = useCallback(async (): Promise<void> => {
    if (navigationHistoryRef.current.length === 0) {
      // Already at root, nothing to do
      return;
    }

    // Pop the last parent from history
    const previousParentId = navigationHistoryRef.current.pop();
    setNavigationHistory([...navigationHistoryRef.current]);

    // -1 represents root level
    const targetParentId =
      previousParentId === -1 ? undefined : previousParentId;
    await loadChildrenAndBreadcrumb(targetParentId);
  }, [loadChildrenAndBreadcrumb]);

  /**
   * Navigate directly to a breadcrumb item.
   *
   * Property 31: Allows direct navigation to any level in the hierarchy.
   *
   * @param itemId - The ID of the breadcrumb item to navigate to
   */
  const navigateToBreadcrumb = useCallback(
    async (itemId: number): Promise<void> => {
      // Find the index of the target item in the breadcrumb
      const targetIndex = state.breadcrumb.findIndex(
        (item) => item.id === itemId,
      );

      if (targetIndex === -1) {
        // Item not found in breadcrumb, navigate directly
        await loadChildrenAndBreadcrumb(itemId);
        return;
      }

      // Build new history from breadcrumb items before the target
      // The history should contain all ancestors up to (but not including) the target
      const newHistory: number[] = [];

      // Add root marker if we're not navigating to root
      if (targetIndex > 0) {
        newHistory.push(-1); // Root marker
      }

      // Add all breadcrumb items before the target to history
      for (let i = 0; i < targetIndex; i++) {
        newHistory.push(state.breadcrumb[i].id);
      }

      navigationHistoryRef.current = newHistory;
      setNavigationHistory([...newHistory]);

      await loadChildrenAndBreadcrumb(itemId);
    },
    [state.breadcrumb, loadChildrenAndBreadcrumb],
  );

  /**
   * Navigate to the root level, clearing all history.
   */
  const navigateToRoot = useCallback(() => {
    navigationHistoryRef.current = [];
    setNavigationHistory([]);
    setState((prev) => ({
      ...prev,
      currentParentId: undefined,
      breadcrumb: [],
      children: [],
      childrenCount: 0,
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
    currentParentId: state.currentParentId,
    breadcrumb: state.breadcrumb,
    children: state.children,
    childrenCount: state.childrenCount,
    navigationHistory,
    navigateToChild,
    navigateToParent,
    navigateToBreadcrumb,
    navigateToRoot,
    clearError,
  };
}
