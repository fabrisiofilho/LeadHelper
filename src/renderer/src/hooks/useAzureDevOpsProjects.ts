import { useState, useCallback } from 'react';
import { cloneIpcData } from '@renderer/utils/ipc';
import type {
  AzureDevOpsProjectConfig,
  AzureDevOpsProjectInput,
} from '@shared/interfaces/config/index.types';

interface UseAzureDevOpsProjectsState {
  projects: AzureDevOpsProjectConfig[];
  loading: boolean;
  error: string | null;
}

export function useAzureDevOpsProjects() {
  const [state, setState] = useState<UseAzureDevOpsProjectsState>({
    projects: [],
    loading: false,
    error: null,
  });

  const listProjects = useCallback(async (): Promise<
    AzureDevOpsProjectConfig[]
  > => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await window.electronAPI.azureDevOps.listProjects();
      if (!response.success) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: response.error ?? 'Erro ao listar projetos',
        }));
        return [];
      }
      const data = cloneIpcData(response.data) ?? [];
      setState({ projects: data, loading: false, error: null });
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de comunicação';
      setState((prev) => ({ ...prev, loading: false, error: msg }));
      return [];
    }
  }, []);

  const saveProject = useCallback(
    async (
      input: AzureDevOpsProjectInput,
    ): Promise<AzureDevOpsProjectConfig | null> => {
      const response = await window.electronAPI.azureDevOps.saveProject(input);
      if (!response.success)
        throw new Error(response.error ?? 'Erro ao salvar projeto');
      const saved = cloneIpcData(response.data)!;
      setState((prev) => {
        const exists = prev.projects.some((p) => p.id === saved.id);
        return {
          ...prev,
          projects: exists
            ? prev.projects.map((p) => (p.id === saved.id ? saved : p))
            : [...prev.projects, saved],
        };
      });
      return saved;
    },
    [],
  );

  const deleteProject = useCallback(async (id: number): Promise<boolean> => {
    const response = await window.electronAPI.azureDevOps.deleteProject(id);
    if (!response.success)
      throw new Error(response.error ?? 'Erro ao remover projeto');
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
    return true;
  }, []);

  const testConnection = useCallback(async (id: number): Promise<boolean> => {
    const response =
      await window.electronAPI.azureDevOps.testConnectionById(id);
    if (!response.success)
      throw new Error(response.error ?? 'Erro ao testar conexão');
    return response.data ?? false;
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    listProjects,
    saveProject,
    deleteProject,
    testConnection,
    clearError,
  };
}
