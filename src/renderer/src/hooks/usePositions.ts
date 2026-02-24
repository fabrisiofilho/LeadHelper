import { useState, useCallback } from 'react';
import type {
  Position,
  CreatePositionInput,
  UpdatePositionInput,
  PositionFilters,
} from '@shared/interfaces/config/index.types';

interface UsePositionsState {
  loading: boolean;
  error: string | null;
  positions: Position[];
  selectedPosition: Position | null;
}

export function usePositions() {
  const [state, setState] = useState<UsePositionsState>({
    loading: false,
    error: null,
    positions: [],
    selectedPosition: null,
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
    async (data: CreatePositionInput): Promise<Position | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.position.create(data);
        if (!response.success) {
          setError(response.error || 'Erro ao criar cargo');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          positions: response.data
            ? [...prev.positions, response.data]
            : prev.positions,
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
    async (id: number, data: UpdatePositionInput): Promise<Position | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.position.update(id, data);
        if (!response.success) {
          setError(response.error || 'Erro ao atualizar cargo');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          positions: prev.positions.map((p) =>
            p.id === id && response.data ? response.data : p,
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

  const deletePosition = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.position.delete(id);
      if (!response.success) {
        setError(response.error || 'Erro ao excluir cargo');
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        positions: prev.positions.filter((p) => p.id !== id),
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return false;
    }
  }, []);

  const findAll = useCallback(
    async (filters?: PositionFilters): Promise<Position[]> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.position.findAll(filters);
        if (!response.success) {
          setError(response.error || 'Erro ao listar cargos');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          positions: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const activate = useCallback(async (id: number): Promise<Position | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.position.activate(id);
      if (!response.success) {
        setError(response.error || 'Erro ao ativar cargo');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        positions: prev.positions.map((p) =>
          p.id === id && response.data ? response.data : p,
        ),
      }));
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const deactivate = useCallback(
    async (id: number): Promise<Position | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.position.deactivate(id);
        if (!response.success) {
          setError(response.error || 'Erro ao desativar cargo');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          positions: prev.positions.map((p) =>
            p.id === id && response.data ? response.data : p,
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

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    create,
    update,
    delete: deletePosition,
    findAll,
    activate,
    deactivate,
    clearError,
  };
}
