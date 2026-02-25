import { useState, useCallback } from 'react';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskStatus,
} from '@shared/interfaces/task.interface';

interface UseTasksState {
  loading: boolean;
  error: string | null;
  tasks: Task[];
  selectedTask: Task | null;
}

export function useTasks() {
  const [state, setState] = useState<UseTasksState>({
    loading: false,
    error: null,
    tasks: [],
    selectedTask: null,
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
    async (data: CreateTaskInput): Promise<Task | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.task.create(data);
        if (!response.success) {
          setError(response.error || 'Erro ao criar tarefa');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          tasks: response.data ? [...prev.tasks, response.data] : prev.tasks,
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
    async (id: number, data: UpdateTaskInput): Promise<Task | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.task.update(id, data);
        if (!response.success) {
          setError(response.error || 'Erro ao atualizar tarefa');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          tasks: prev.tasks.map((t) =>
            t.id === id && response.data ? response.data : t,
          ),
          selectedTask:
            prev.selectedTask?.id === id
              ? response.data || null
              : prev.selectedTask,
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  const deleteTask = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.task.delete(id);
      if (!response.success) {
        setError(response.error || 'Erro ao excluir tarefa');
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        tasks: prev.tasks.filter((t) => t.id !== id),
        selectedTask: prev.selectedTask?.id === id ? null : prev.selectedTask,
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return false;
    }
  }, []);

  const findById = useCallback(async (id: number): Promise<Task | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.task.findById(id);
      if (!response.success) {
        setError(response.error || 'Erro ao buscar tarefa');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        selectedTask: response.data || null,
      }));
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const findAll = useCallback(
    async (filters?: TaskFilters): Promise<Task[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.task.findAll(filters);
        if (!response.success) {
          setError(response.error || 'Erro ao listar tarefas');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          tasks: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const findByStatus = useCallback(
    async (status: TaskStatus): Promise<Task[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.task.findByStatus(status);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar tarefas por status');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          tasks: response.data || [],
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
    async (startDate: Date, endDate: Date): Promise<Task[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.task.findByPeriod(
          startDate,
          endDate,
        );
        if (!response.success) {
          setError(response.error || 'Erro ao buscar tarefas por período');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          tasks: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const findBySprint = useCallback(
    async (sprintId: number): Promise<Task[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.task.findBySprint(sprintId);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar tarefas da sprint');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          tasks: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearSelectedTask = useCallback(() => {
    setState((prev) => ({ ...prev, selectedTask: null }));
  }, []);

  return {
    ...state,
    create,
    update,
    delete: deleteTask,
    findById,
    findAll,
    findByStatus,
    findByPeriod,
    findBySprint,
    clearError,
    clearSelectedTask,
  };
}
