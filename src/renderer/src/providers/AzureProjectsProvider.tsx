import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type PropsWithChildren,
} from 'react';
import { cloneIpcData } from '@renderer/utils/ipc';
import type { AzureDevOpsProjectConfig } from '@shared/interfaces/config/index.types';

interface AzureProjectsContextValue {
  projects: AzureDevOpsProjectConfig[];
  loading: boolean;
  reload: () => Promise<void>;
}

const AzureProjectsContext = createContext<AzureProjectsContextValue>({
  projects: [],
  loading: true,
  reload: async () => {},
});

/**
 * Loads the list of Azure DevOps projects once at app start and
 * makes it available to all components via `useAzureProjects()`.
 * Reloads after each sync cycle completes.
 */
export function AzureProjectsProvider({ children }: PropsWithChildren) {
  const [projects, setProjects] = useState<AzureDevOpsProjectConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const response = await window.electronAPI.azureDevOps.listProjects();
      if (response.success && response.data) {
        setProjects(cloneIpcData(response.data) ?? []);
      }
    } catch {
      // Non-critical — keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    reload();
  }, [reload]);

  // Reload after every sync cycle
  useEffect(() => {
    const unsub = window.electronAPI.onSyncCompleted(() => {
      reload();
    });
    return unsub;
  }, [reload]);

  return (
    <AzureProjectsContext.Provider value={{ projects, loading, reload }}>
      {children}
    </AzureProjectsContext.Provider>
  );
}

export function useAzureProjects(): AzureProjectsContextValue {
  return useContext(AzureProjectsContext);
}
