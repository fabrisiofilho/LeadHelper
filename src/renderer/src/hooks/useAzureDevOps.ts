import { useState, useCallback } from 'react';
import { cloneIpcData } from '@renderer/utils/ipc';
import type {
  AzureDevOpsConfig,
  AzureDevOpsConfigInput,
  WorkItem,
  WorkItemFilters,
  IterationNode,
} from '@shared/interfaces/config/index.types';

interface UseAzureDevOpsState {
  loading: boolean;
  error: string | null;
  config: AzureDevOpsConfig | null;
  isConnected: boolean;
  workItems: WorkItem[];
}

export function useAzureDevOps() {
  const [state, setState] = useState<UseAzureDevOpsState>({
    loading: false,
    error: null,
    config: null,
    isConnected: false,
    workItems: [],
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading,
      error: loading ? null : prev.error,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, loading: false }));
  }, []);

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
      const data = cloneIpcData(response.data) || null;
      setState((prev) => ({
        ...prev,
        loading: false,
        config: data,
        isConnected: data?.isConfigured || false,
      }));
      return data;
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
      const connected = !!response.data;
      setState((prev) => ({ ...prev, loading: false, isConnected: connected }));
      return connected;
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
        const data = cloneIpcData(response.data) || [];
        setState((prev) => ({ ...prev, loading: false, workItems: data }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return [];
      }
    },
    [],
  );

  const fetchIterations = useCallback(async (): Promise<IterationNode[]> => {
    setLoading(true);
    try {
      const response = await window.electronAPI.azureDevOps.fetchIterations();
      if (!response.success) {
        setError(response.error || 'Erro ao buscar iterations');
        return [];
      }
      setState((prev) => ({ ...prev, loading: false }));
      return cloneIpcData(response.data) || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação');
      return [];
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearWorkItems = useCallback(() => {
    setState((prev) => ({ ...prev, workItems: [] }));
  }, []);

  return {
    ...state,
    saveConfig,
    getConfig,
    testConnection,
    fetchWorkItems,
    fetchIterations,
    clearError,
    clearWorkItems,
  };
}
