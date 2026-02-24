import { useState, useCallback } from 'react';
import type {
  TeamMemberAllocation,
  CreateTeamMemberAllocationInput,
  UpdateTeamMemberAllocationInput,
  TeamMemberAllocationFilters,
  TeamCapacitySummary,
} from '@shared/interfaces/config/index.types';

interface UseTeamMemberAllocationsState {
  loading: boolean;
  error: string | null;
  allocations: TeamMemberAllocation[];
  selectedAllocation: TeamMemberAllocation | null;
  teamCapacity: TeamCapacitySummary | null;
  memberAvailability: number | null;
}

export function useTeamMemberAllocations() {
  const [state, setState] = useState<UseTeamMemberAllocationsState>({
    loading: false,
    error: null,
    allocations: [],
    selectedAllocation: null,
    teamCapacity: null,
    memberAvailability: null,
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
    async (
      data: CreateTeamMemberAllocationInput,
    ): Promise<TeamMemberAllocation | null> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.teamMemberAllocation.create(data);
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
      data: UpdateTeamMemberAllocationInput,
    ): Promise<TeamMemberAllocation | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.teamMemberAllocation.update(
          id,
          data,
        );
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
      const response = await window.electronAPI.teamMemberAllocation.delete(id);
      if (!response.success) {
        setError(response.error || 'Erro ao excluir alocação');
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        allocations: prev.allocations.filter((a) => a.id !== id),
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return false;
    }
  }, []);

  const deactivate = useCallback(
    async (id: number): Promise<TeamMemberAllocation | null> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.teamMemberAllocation.deactivate(id);
        if (!response.success) {
          setError(response.error || 'Erro ao desativar alocação');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          allocations: prev.allocations.map((a) =>
            a.id === id && response.data ? response.data : a,
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

  const findById = useCallback(
    async (id: number): Promise<TeamMemberAllocation | null> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.teamMemberAllocation.findById(id);
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

  const findByTeam = useCallback(
    async (teamId: number): Promise<TeamMemberAllocation[]> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.teamMemberAllocation.findByTeam(teamId);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar alocações da equipe');
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

  const findByTeamMember = useCallback(
    async (teamMemberId: number): Promise<TeamMemberAllocation[]> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.teamMemberAllocation.findByTeamMember(
            teamMemberId,
          );
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

  const findActiveByTeam = useCallback(
    async (
      teamId: number,
      referenceDate?: Date,
    ): Promise<TeamMemberAllocation[]> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.teamMemberAllocation.findActiveByTeam(
            teamId,
            referenceDate,
          );
        if (!response.success) {
          setError(
            response.error || 'Erro ao buscar alocações ativas da equipe',
          );
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

  const findAll = useCallback(
    async (
      filters?: TeamMemberAllocationFilters,
    ): Promise<TeamMemberAllocation[]> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.teamMemberAllocation.findAll(filters);
        if (!response.success) {
          setError(response.error || 'Erro ao listar alocações');
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

  const getTeamCapacity = useCallback(
    async (
      teamId: number,
      referenceDate?: Date,
    ): Promise<TeamCapacitySummary | null> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.teamMemberAllocation.getTeamCapacity(
            teamId,
            referenceDate,
          );
        if (!response.success) {
          setError(response.error || 'Erro ao obter capacidade da equipe');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          teamCapacity: response.data || null,
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  const getMemberAvailability = useCallback(
    async (teamMemberId: number, referenceDate?: Date): Promise<number> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.teamMemberAllocation.getMemberAvailability(
            teamMemberId,
            referenceDate,
          );
        if (!response.success) {
          setError(response.error || 'Erro ao obter disponibilidade do membro');
          return 0;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          memberAvailability: response.data ?? null,
        }));
        return response.data ?? 0;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return 0;
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
    delete: deleteAllocation,
    deactivate,
    findById,
    findByTeam,
    findByTeamMember,
    findActiveByTeam,
    findAll,
    getTeamCapacity,
    getMemberAvailability,
    clearError,
  };
}
