import { useState, useCallback } from 'react';
import type {
  Sprint,
  CreateSprintInput,
  UpdateSprintInput,
  SprintFilters,
} from '@shared/interfaces/config/index.types';

interface UseSprintsState {
  loading: boolean;
  error: string | null;
  sprints: Sprint[];
  selectedSprint: Sprint | null;
  currentSprint: Sprint | null;
  upcomingSprints: Sprint[];
}

export function useSprints() {
  const [state, setState] = useState<UseSprintsState>({
    loading: false,
    error: null,
    sprints: [],
    selectedSprint: null,
    currentSprint: null,
    upcomingSprints: [],
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
    async (data: CreateSprintInput): Promise<Sprint | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.sprint.create(data);
        if (!response.success) {
          setError(response.error || 'Erro ao criar sprint');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          sprints: response.data
            ? [...prev.sprints, response.data]
            : prev.sprints,
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
    async (id: number, data: UpdateSprintInput): Promise<Sprint | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.sprint.update(id, data);
        if (!response.success) {
          setError(response.error || 'Erro ao atualizar sprint');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          sprints: prev.sprints.map((s) =>
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

  const deleteSprint = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.sprint.delete(id);
      if (!response.success) {
        setError(response.error || 'Erro ao excluir sprint');
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        sprints: prev.sprints.filter((s) => s.id !== id),
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return false;
    }
  }, []);

  const findAll = useCallback(
    async (filters?: SprintFilters): Promise<Sprint[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.sprint.findAll(filters);
        if (!response.success) {
          setError(response.error || 'Erro ao listar sprints');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          sprints: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const findById = useCallback(async (id: number): Promise<Sprint | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.sprint.findById(id);
      if (!response.success) {
        setError(response.error || 'Erro ao buscar sprint');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        selectedSprint: response.data || null,
      }));
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const findByTeam = useCallback(async (teamId: number): Promise<Sprint[]> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.sprint.findByTeam(teamId);
      if (!response.success) {
        setError(response.error || 'Erro ao buscar sprints da equipe');
        return [];
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        sprints: response.data || [],
      }));
      return response.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return [];
    }
  }, []);

  const findCurrent = useCallback(
    async (teamId?: number): Promise<Sprint | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.sprint.findCurrent(teamId);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar sprint atual');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          currentSprint: response.data || null,
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  const findUpcoming = useCallback(
    async (teamId?: number, limit?: number): Promise<Sprint[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.sprint.findUpcoming(
          teamId,
          limit,
        );
        if (!response.success) {
          setError(response.error || 'Erro ao buscar próximas sprints');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          upcomingSprints: response.data || [],
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

  return {
    ...state,
    create,
    update,
    delete: deleteSprint,
    findAll,
    findById,
    findByTeam,
    findCurrent,
    findUpcoming,
    clearError,
  };
}
