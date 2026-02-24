import { useState, useCallback } from 'react';
import type {
  AzureDevOpsConfig,
  AzureDevOpsConfigInput,
  WorkItem,
  WorkItemFilters,
  SyncResult,
  Task,
} from '@shared/interfaces/config/index.types';

interface UseAzureDevOpsState {
  loading: boolean;
  error: string | null;
  config: AzureDevOpsConfig | null;
  isConnected: boolean;
  workItems: WorkItem[];
  importedTasks: Task[];
  syncResult: SyncResult | null;
}

export function useAzureDevOps() {
  const [state, setState] = useState<UseAzureDevOpsState>({
    loading: false,
    error: null,
    config: null,
    isConnected: false,
    workItems: [],
    importedTasks: [],
    syncResult: null,
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

  const saveConfig = useCallback(
    async (config: AzureDevOpsConfigInput): Promise<boolean> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.azureDevOps.saveConfig(config);
        if (!response.success) {
          setError(
            response.error || 'Erro ao salvar configuração do Azure DevOps',
          );
          return false;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          config: {
            organizationUrl: config.organizationUrl,
            projectName: config.projectName,
            isConfigured: true,
          },
        }));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return false;
      }
    },
    [],
  );

  const getConfig = useCallback(async (): Promise<AzureDevOpsConfig | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.azureDevOps.getConfig();
      if (!response.success) {
        setError(
          response.error || 'Erro ao buscar configuração do Azure DevOps',
        );
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        config: response.data || null,
        isConnected: response.data?.isConfigured || false,
      }));
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.azureDevOps.testConnection();
      if (!response.success) {
        setError(response.error || 'Falha na conexão com Azure DevOps');
        setState((prev) => ({ ...prev, loading: false, isConnected: false }));
        return false;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        isConnected: response.data || false,
      }));
      return response.data || false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      setState((prev) => ({ ...prev, isConnected: false }));
      return false;
    }
  }, []);

  const fetchWorkItems = useCallback(
    async (filters?: WorkItemFilters): Promise<WorkItem[]> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.azureDevOps.fetchWorkItems(filters);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar work items');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          workItems: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const importWorkItems = useCallback(
    async (workItemIds: number[]): Promise<Task[]> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.azureDevOps.importWorkItems(workItemIds);
        if (!response.success) {
          setError(response.error || 'Erro ao importar work items');
          return [];
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          importedTasks: response.data || [],
        }));
        return response.data || [];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const syncTask = useCallback(async (taskId: number): Promise<Task | null> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.azureDevOps.syncTask(taskId);
      if (!response.success) {
        setError(response.error || 'Erro ao sincronizar tarefa');
        return null;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
      return response.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return null;
    }
  }, []);

  const syncAllImportedTasks =
    useCallback(async (): Promise<SyncResult | null> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.azureDevOps.syncAllImportedTasks();
        if (!response.success) {
          setError(response.error || 'Erro ao sincronizar tarefas');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          syncResult: response.data || null,
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

  const clearWorkItems = useCallback(() => {
    setState((prev) => ({ ...prev, workItems: [] }));
  }, []);

  const clearSyncResult = useCallback(() => {
    setState((prev) => ({ ...prev, syncResult: null }));
  }, []);

  return {
    ...state,
    saveConfig,
    getConfig,
    testConnection,
    fetchWorkItems,
    importWorkItems,
    syncTask,
    syncAllImportedTasks,
    clearError,
    clearWorkItems,
    clearSyncResult,
  };
}
