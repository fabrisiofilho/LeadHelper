import { useState, useCallback } from 'react';
import type {
  Team,
  CreateTeamInput,
  UpdateTeamInput,
  TeamFilters,
} from '@shared/interfaces/config/index.types';

interface UseTeamsState {
  loading: boolean;
  error: string | null;
  teams: Team[];
  selectedTeam: Team | null;
}

export function useTeams() {
  const [state, setState] = useState<UseTeamsState>({
    loading: false,
    error: null,
    teams: [],
    selectedTeam: null,
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
    async (data: CreateTeamInput): Promise<Team | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.team.create(data);
        if (!response.success) {
          setError(response.error || 'Erro ao criar equipe');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          teams: response.data ? [...prev.teams, response.data] : prev.teams,
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
    async (id: number, data: UpdateTeamInput): Promise<Team | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.team.update(id, data);
        if (!response.success) {
          setError(response.error || 'Erro ao atualizar equipe');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          teams: prev.teams.map((t) =>
            t.id === id && response.data ? response.data : t,
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

  const deleteTeam = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.team.delete(id);
      if (!response.success) {
        setError(response.error || 'Erro ao excluir equipe');
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        teams: prev.teams.filter((t) => t.id !== id),
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return false;
    }
  }, []);

  const findAll = useCallback(
    async (filters?: TeamFilters): Promise<Team[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.team.findAll(filters);
        if (!response.success) {
          setError(response.error || 'Erro ao listar equipes');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          teams: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const findById = useCallback(async (id: number): Promise<Team | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.team.findById(id);
      if (!response.success) {
        setError(response.error || 'Erro ao buscar equipe');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        selectedTeam: response.data || null,
      }));
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const addMember = useCallback(
    async (teamId: number, memberId: number): Promise<boolean> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.team.addMember(
          teamId,
          memberId,
        );
        if (!response.success) {
          setError(response.error || 'Erro ao adicionar membro');
          return false;
        }
        setState((prev) => ({ ...prev, loading: false }));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return false;
      }
    },
    [],
  );

  const removeMember = useCallback(
    async (teamId: number, memberId: number): Promise<boolean> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.team.removeMember(
          teamId,
          memberId,
        );
        if (!response.success) {
          setError(response.error || 'Erro ao remover membro');
          return false;
        }
        setState((prev) => ({ ...prev, loading: false }));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return false;
      }
    },
    [],
  );

  const activate = useCallback(async (id: number): Promise<Team | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.team.activate(id);
      if (!response.success) {
        setError(response.error || 'Erro ao ativar equipe');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        teams: prev.teams.map((t) =>
          t.id === id && response.data ? response.data : t,
        ),
      }));
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const deactivate = useCallback(async (id: number): Promise<Team | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.team.deactivate(id);
      if (!response.success) {
        setError(response.error || 'Erro ao desativar equipe');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        teams: prev.teams.map((t) =>
          t.id === id && response.data ? response.data : t,
        ),
      }));
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    create,
    update,
    delete: deleteTeam,
    findAll,
    findById,
    addMember,
    removeMember,
    activate,
    deactivate,
    clearError,
  };
}
