import { useState, useCallback } from 'react';
import type {
  TaskStatusConfig,
  CreateTaskStatusConfigInput,
  UpdateTaskStatusConfigInput,
} from '@shared/interfaces/config/index.types';

interface UseTaskStatusConfigState {
  loading: boolean;
  error: string | null;
  statuses: TaskStatusConfig[];
}

export function useTaskStatusConfig() {
  const [state, setState] = useState<UseTaskStatusConfigState>({
    loading: false,
    error: null,
    statuses: [],
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

  const findAll = useCallback(async (): Promise<TaskStatusConfig[]> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.taskStatusConfig.findAll();
      if (!response.success) {
        setError(response.error || 'Erro ao listar status');
        return [];
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        statuses: response.data || [],
      }));
      return response.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return [];
    }
  }, []);

  const findKanban = useCallback(async (): Promise<TaskStatusConfig[]> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.taskStatusConfig.findKanban();
      if (!response.success) {
        setError(response.error || 'Erro ao listar status do kanban');
        return [];
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        statuses: response.data || [],
      }));
      return response.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return [];
    }
  }, []);

  const create = useCallback(
    async (
      data: CreateTaskStatusConfigInput,
    ): Promise<TaskStatusConfig | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.taskStatusConfig.create(data);
        if (!response.success) {
          setError(response.error || 'Erro ao criar status');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          statuses: response.data
            ? [...prev.statuses, response.data]
            : prev.statuses,
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
      data: UpdateTaskStatusConfigInput,
    ): Promise<TaskStatusConfig | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.taskStatusConfig.update(
          id,
          data,
        );
        if (!response.success) {
          setError(response.error || 'Erro ao atualizar status');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          statuses: prev.statuses.map((s) =>
            s.id === id && response.data ? response.data : s,
          ),
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  const deleteStatus = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.taskStatusConfig.delete(id);
      if (!response.success) {
        setError(response.error || 'Erro ao excluir status');
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        statuses: prev.statuses.filter((s) => s.id !== id),
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    findAll,
    findKanban,
    create,
    update,
    delete: deleteStatus,
    clearError,
  };
}
