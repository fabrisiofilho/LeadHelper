import { useState, useCallback } from 'react';
import type {
  TaskComment,
  CreateTaskCommentInput,
  UpdateTaskCommentInput,
} from '@shared/interfaces/config/index.types';

export function useTaskComments() {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findByTask = useCallback(async (taskId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.electronAPI.taskComment.findByTask(taskId);
      if (response.success && response.data) {
        setComments(response.data);
        return response.data;
      } else {
        setError(response.error || 'Erro ao carregar comentários');
        return [];
      }
    } catch {
      setError('Erro ao carregar comentários');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data: CreateTaskCommentInput) => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.electronAPI.taskComment.create(data);
      if (response.success && response.data) {
        setComments((prev) => [response.data!, ...prev]);
        return response.data;
      } else {
        setError(response.error || 'Erro ao criar comentário');
        return null;
      }
    } catch {
      setError('Erro ao criar comentário');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(
    async (id: number, data: UpdateTaskCommentInput) => {
      setError(null);
      try {
        const response = await window.electronAPI.taskComment.update(id, data);
        if (response.success && response.data) {
          setComments((prev) =>
            prev.map((c) => (c.id === id ? response.data! : c)),
          );
          return response.data;
        } else {
          setError(response.error || 'Erro ao atualizar comentário');
          return null;
        }
      } catch {
        setError('Erro ao atualizar comentário');
        return null;
      }
    },
    [],
  );

  const remove = useCallback(async (id: number) => {
    setError(null);
    try {
      const response = await window.electronAPI.taskComment.delete(id);
      if (response.success) {
        setComments((prev) => prev.filter((c) => c.id !== id));
        return true;
      } else {
        setError(response.error || 'Erro ao excluir comentário');
        return false;
      }
    } catch {
      setError('Erro ao excluir comentário');
      return false;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    comments,
    loading,
    error,
    findByTask,
    create,
    update,
    remove,
    clearError,
  };
}
