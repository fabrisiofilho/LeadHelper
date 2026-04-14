import { useState, useCallback } from 'react';
import type {
  NoteCard,
  CreateNoteCardInput,
  UpdateNoteCardInput,
} from '@shared/interfaces/config/index.types';

interface UseNoteCardsState {
  loading: boolean;
  error: string | null;
  noteCards: NoteCard[];
}

export function useNoteCards() {
  const [state, setState] = useState<UseNoteCardsState>({
    loading: false,
    error: null,
    noteCards: [],
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

  const findAllActive = useCallback(async (): Promise<NoteCard[]> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.noteCard.findAllActive();
      if (!response.success) {
        setError(response.error || 'Erro ao listar notas ativas');
        return [];
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        noteCards: response.data || [],
      }));
      return response.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return [];
    }
  }, []);

  const findAllCompleted = useCallback(async (): Promise<NoteCard[]> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.noteCard.findAllCompleted();
      if (!response.success) {
        setError(response.error || 'Erro ao listar notas concluídas');
        return [];
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        noteCards: response.data || [],
      }));
      return response.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return [];
    }
  }, []);

  const create = useCallback(
    async (data: CreateNoteCardInput): Promise<NoteCard | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.noteCard.create(data);
        if (!response.success) {
          setError(response.error || 'Erro ao criar nota');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          noteCards: response.data
            ? [...prev.noteCards, response.data]
            : prev.noteCards,
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
    async (id: number, data: UpdateNoteCardInput): Promise<NoteCard | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.noteCard.update(id, data);
        if (!response.success) {
          setError(response.error || 'Erro ao atualizar nota');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          noteCards: prev.noteCards.map((nc) =>
            nc.id === id && response.data ? response.data : nc,
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

  const complete = useCallback(async (id: number): Promise<NoteCard | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.noteCard.complete(id);
      if (!response.success) {
        setError(response.error || 'Erro ao concluir nota');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        noteCards: prev.noteCards.filter((nc) => nc.id !== id),
      }));
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const reactivate = useCallback(
    async (id: number): Promise<NoteCard | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.noteCard.reactivate(id);
        if (!response.success) {
          setError(response.error || 'Erro ao reativar nota');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          noteCards: prev.noteCards.filter((nc) => nc.id !== id),
        }));
        return response.data || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  const deleteNoteCard = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.noteCard.delete(id);
      if (!response.success) {
        setError(response.error || 'Erro ao excluir nota');
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        noteCards: prev.noteCards.filter((nc) => nc.id !== id),
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
    findAllActive,
    findAllCompleted,
    create,
    update,
    complete,
    reactivate,
    delete: deleteNoteCard,
    clearError,
  };
}
