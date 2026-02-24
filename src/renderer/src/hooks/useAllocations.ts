import { useState, useCallback } from 'react';
import type {
  Allocation,
  CreateAllocationInput,
  UpdateAllocationInput,
} from '@shared/interfaces/allocation.interface';
import type {
  GanttData,
  GanttFilters,
} from '@shared/interfaces/config/index.types';

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
    [],
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
    [],
  );

  const deleteAllocation = useCallback(async (id: number): Promise<boolean> => {
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
  }, []);

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
    [],
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
    [],
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
    [],
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
    [],
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
    [],
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
