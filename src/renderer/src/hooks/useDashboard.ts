import { useState, useCallback } from 'react';
import type {
  DashboardPeriod,
  DashboardSummary,
  TeamMemberWorkload,
  TeamMember,
} from '@shared/interfaces/config/index.types';

interface UseDashboardState {
  loading: boolean;
  error: string | null;
  summary: DashboardSummary | null;
  activeMembers: number | null;
  tasksInProgress: number | null;
  membersWithHighWorkload: TeamMemberWorkload[];
  membersWithoutAllocation: TeamMember[];
}

export function useDashboard() {
  const [state, setState] = useState<UseDashboardState>({
    loading: false,
    error: null,
    summary: null,
    activeMembers: null,
    tasksInProgress: null,
    membersWithHighWorkload: [],
    membersWithoutAllocation: [],
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

  const getSummary = useCallback(
    async (period: DashboardPeriod): Promise<DashboardSummary | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.dashboard.getSummary(period);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar resumo do dashboard');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          summary: response.data || null,
          activeMembers: response.data?.activeMembers ?? null,
          tasksInProgress: response.data?.tasksInProgress ?? null,
          membersWithHighWorkload: response.data?.membersWithHighWorkload || [],
          membersWithoutAllocation:
            response.data?.membersWithoutAllocation || [],
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  const getActiveMembers = useCallback(async (): Promise<number | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.dashboard.getActiveMembers();
      if (!response.success) {
        setError(response.error || 'Erro ao buscar membros ativos');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        activeMembers: response.data ?? null,
      }));
      return response.data ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const getTasksInProgress = useCallback(async (): Promise<number | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.dashboard.getTasksInProgress();
      if (!response.success) {
        setError(response.error || 'Erro ao buscar tarefas em andamento');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        tasksInProgress: response.data ?? null,
      }));
      return response.data ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const getMembersWithHighWorkload = useCallback(
    async (period: DashboardPeriod): Promise<TeamMemberWorkload[]> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.dashboard.getMembersWithHighWorkload(period);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar membros com alta carga');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          membersWithHighWorkload: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const getMembersWithoutAllocation = useCallback(
    async (period: DashboardPeriod): Promise<TeamMember[]> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.dashboard.getMembersWithoutAllocation(
            period,
          );
        if (!response.success) {
          setError(response.error || 'Erro ao buscar membros sem alocação');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          membersWithoutAllocation: response.data || [],
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

  const clearSummary = useCallback(() => {
    setState((prev) => ({
      ...prev,
      summary: null,
      activeMembers: null,
      tasksInProgress: null,
      membersWithHighWorkload: [],
      membersWithoutAllocation: [],
    }));
  }, []);

  return {
    ...state,
    getSummary,
    getActiveMembers,
    getTasksInProgress,
    getMembersWithHighWorkload,
    getMembersWithoutAllocation,
    clearError,
    clearSummary,
  };
}
