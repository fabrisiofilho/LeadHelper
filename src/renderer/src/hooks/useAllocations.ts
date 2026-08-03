import { useState, useCallback } from 'react';
import type {
  GanttData,
  GanttFilters,
} from '@shared/interfaces/config/index.types';

/** @deprecated — member-task allocations have been removed from the schema */
interface Allocation {
  id: number;
  teamMemberId: number;
  taskId: number;
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/** @deprecated */
interface CreateAllocationInput {
  teamMemberId: number;
  taskId: number;
  startDate: Date;
  endDate: Date;
}

/** @deprecated */
interface UpdateAllocationInput {
  startDate?: Date;
  endDate?: Date;
}

interface UseAllocationsState {
  loading: boolean;
  error: string | null;
  allocations: Allocation[];
  selectedAllocation: Allocation | null;
  ganttData: GanttData | null;
}

export function useAllocations() {
  const [state, setState] = useState<UseAllocationsState>({
    loading: false,
    error: null,
    allocations: [],
    selectedAllocation: null,
    ganttData: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading,
      error: loading ? null : prev.error,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, loading: false }));
  }, []);

  const create = useCallback(
    async (data: CreateAllocationInput): Promise<Allocation | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.allocation.create(data);
        if (!response.success) {
          setError(response.error || 'Erro ao criar alocação');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          allocations: response.data
            ? [...prev.allocations, response.data]
            : prev.allocations,
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [setLoading, setError],
  );

  const update = useCallback(
    async (
      id: number,
      data: UpdateAllocationInput,
    ): Promise<Allocation | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.allocation.update(id, data);
        if (!response.success) {
          setError(response.error || 'Erro ao atualizar alocação');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          allocations: prev.allocations.map((a) =>
            a.id === id && response.data ? response.data : a,
          ),
          selectedAllocation:
            prev.selectedAllocation?.id === id
              ? response.data || null
              : prev.selectedAllocation,
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [setLoading, setError],
  );

  const deleteAllocation = useCallback(
    async (id: number): Promise<boolean> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.allocation.delete(id);
        if (!response.success) {
          setError(response.error || 'Erro ao excluir alocação');
          return false;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          allocations: prev.allocations.filter((a) => a.id !== id),
          selectedAllocation:
            prev.selectedAllocation?.id === id ? null : prev.selectedAllocation,
        }));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return false;
      }
    },
    [setLoading, setError],
  );

  const findById = useCallback(
    async (id: number): Promise<Allocation | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.allocation.findById(id);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar alocação');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          selectedAllocation: response.data || null,
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [setLoading, setError],
  );

  const findByTeamMember = useCallback(
    async (teamMemberId: number): Promise<Allocation[]> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.allocation.findByTeamMember(teamMemberId);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar alocações do membro');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          allocations: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [setLoading, setError],
  );

  const findByTask = useCallback(
    async (taskId: number): Promise<Allocation[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.allocation.findByTask(taskId);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar alocações da tarefa');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          allocations: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [setLoading, setError],
  );

  const findByPeriod = useCallback(
    async (startDate: Date, endDate: Date): Promise<Allocation[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.allocation.findByPeriod(
          startDate,
          endDate,
        );
        if (!response.success) {
          setError(response.error || 'Erro ao buscar alocações por período');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          allocations: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [setLoading, setError],
  );

  const getGanttData = useCallback(
    async (filters: GanttFilters): Promise<GanttData | null> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.allocation.getGanttData(filters);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar dados do Gantt');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          ganttData: response.data || null,
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [setLoading, setError],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearSelectedAllocation = useCallback(() => {
    setState((prev) => ({ ...prev, selectedAllocation: null }));
  }, []);

  const clearGanttData = useCallback(() => {
    setState((prev) => ({ ...prev, ganttData: null }));
  }, []);

  return {
    ...state,
    create,
    update,
    delete: deleteAllocation,
    findById,
    findByTeamMember,
    findByTask,
    findByPeriod,
    getGanttData,
    clearError,
    clearSelectedAllocation,
    clearGanttData,
  };
}
