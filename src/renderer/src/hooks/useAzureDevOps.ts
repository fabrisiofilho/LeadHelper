import { useState, useCallback } from 'react';
import { cloneIpcData } from '@renderer/utils/ipc';
import type {
  AzureDevOpsConfig,
  AzureDevOpsConfigInput,
  WorkItem,
  WorkItemFilters,
  SyncResult,
  Task,
  IterationNode,
  ReportData,
  ReportPeriod,
  DashboardMetrics,
  ExportResult,
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
        const data = cloneIpcData(response.data) || [];
        setState((prev) => ({ ...prev, loading: false, importedTasks: data }));
        return data;
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
      setState((prev) => ({ ...prev, loading: false }));
      return cloneIpcData(response.data) || null;
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
        const data = cloneIpcData(response.data) || null;
        setState((prev) => ({ ...prev, loading: false, syncResult: data }));
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    }, []);

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

  const getReportData = useCallback(
    async (period: ReportPeriod): Promise<ReportData | null> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.azureDevOps.getReportData(period);
        if (!response.success) {
          setError(response.error || 'Erro ao buscar dados do relatório');
          return null;
        }
        setState((prev) => ({ ...prev, loading: false }));
        return cloneIpcData(response.data) || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [],
  );

  const getDashboardMetrics =
    useCallback(async (): Promise<DashboardMetrics | null> => {
      setLoading(true);
      try {
        const response =
          await window.electronAPI.azureDevOps.getDashboardMetrics();
        if (!response.success) {
          setError(response.error || 'Erro ao buscar métricas do dashboard');
          return null;
        }
        setState((prev) => ({ ...prev, loading: false }));
        return cloneIpcData(response.data) || null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    }, []);

  const exportPdf = useCallback(
    async (period: ReportPeriod): Promise<ExportResult | null> => {
      setLoading(true);
      try {
        const response = await window.electronAPI.azureDevOps.exportPdf(period);
        if (!response.success) {
          setError(response.error || 'Erro ao exportar PDF');
          return null;
        }
        setState((prev) => ({ ...prev, loading: false }));
        return cloneIpcData(response.data) || null;
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
    fetchIterations,
    getReportData,
    getDashboardMetrics,
    exportPdf,
    clearError,
    clearWorkItems,
    clearSyncResult,
  };
}
