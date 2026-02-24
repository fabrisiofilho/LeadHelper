import { useState, useCallback } from 'react';
import type {
  TeamMember,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  TeamMemberFilters,
  TeamMemberRole,
} from '@shared/interfaces/team-member.interface';

interface UseTeamMembersState {
  loading: boolean;
  error: string | null;
  teamMembers: TeamMember[];
  selectedTeamMember: TeamMember | null;
}

export function useTeamMembers() {
  const [state, setState] = useState<UseTeamMembersState>({
    loading: false,
    error: null,
    teamMembers: [],
    selectedTeamMember: null,
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
    async (data: CreateTeamMemberInput): Promise<TeamMember | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.teamMember.create(data);
        if (!response.success) {
          setError(response.error || 'Erro ao criar membro da equipe');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          teamMembers: response.data
            ? [...prev.teamMembers, response.data]
            : prev.teamMembers,
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
      data: UpdateTeamMemberInput,
    ): Promise<TeamMember | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.teamMember.update(id, data);
        if (!response.success) {
          setError(response.error || 'Erro ao atualizar membro da equipe');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          teamMembers: prev.teamMembers.map((m) =>
            m.id === id && response.data ? response.data : m,
          ),
          selectedTeamMember:
            prev.selectedTeamMember?.id === id
              ? response.data || null
              : prev.selectedTeamMember,
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  const deactivate = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.teamMember.deactivate(id);
      if (!response.success) {
        setError(response.error || 'Erro ao desativar membro da equipe');
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        teamMembers: prev.teamMembers.map((m) =>
          m.id === id ? { ...m, isActive: false } : m,
        ),
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return false;
    }
  }, []);

  const activate = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.teamMember.activate(id);
      if (!response.success) {
        setError(response.error || 'Erro ao ativar membro da equipe');
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        teamMembers: prev.teamMembers.map((m) =>
          m.id === id ? { ...m, isActive: true } : m,
        ),
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return false;
    }
  }, []);

  const findById = useCallback(
    async (id: number): Promise<TeamMember | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.teamMember.findById(id);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar membro da equipe');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          selectedTeamMember: response.data || null,
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  const findAll = useCallback(
    async (filters?: TeamMemberFilters): Promise<TeamMember[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.teamMember.findAll(filters);
        if (!response.success) {
          setError(response.error || 'Erro ao listar membros da equipe');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          teamMembers: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const findByRole = useCallback(
    async (role: TeamMemberRole): Promise<TeamMember[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.teamMember.findByRole(role);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar membros por função');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          teamMembers: response.data || [],
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

  const clearSelectedTeamMember = useCallback(() => {
    setState((prev) => ({ ...prev, selectedTeamMember: null }));
  }, []);

  return {
    ...state,
    create,
    update,
    deactivate,
    activate,
    findById,
    findAll,
    findByRole,
    clearError,
    clearSelectedTeamMember,
  };
}
