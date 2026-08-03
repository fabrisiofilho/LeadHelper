import { useState, useCallback } from 'react';
import type {
  SlaProjectConfig,
  SaveSlaRulesInput,
} from '@shared/interfaces/config/index.types';

interface UseSlaConfigState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  config: SlaProjectConfig | null;
}

export function useSlaConfig() {
  const [state, setState] = useState<UseSlaConfigState>({
    loading: false,
    saving: false,
    error: null,
    config: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading,
      error: loading ? null : prev.error,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, loading: false, saving: false }));
  }, []);

  const getByProject = useCallback(
    async (configId: number): Promise<SlaProjectConfig | null> => {
      setLoading(true);
      try {
        const res = await window.electronAPI.slaConfig.getByProject(configId);
        if (!res.success) {
          setError(res.error || 'Erro ao carregar configuração de SLA');
          return null;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          config: res.data ?? null,
        }));
        return res.data ?? null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [setLoading, setError],
  );

  const saveRules = useCallback(
    async (input: SaveSlaRulesInput): Promise<SlaProjectConfig | null> => {
      setState((prev) => ({ ...prev, saving: true, error: null }));
      try {
        const res = await window.electronAPI.slaConfig.saveRules(input);
        if (!res.success) {
          setError(res.error || 'Erro ao salvar regras de SLA');
          return null;
        }
        setState((prev) => ({
          ...prev,
          saving: false,
          config: res.data ?? null,
        }));
        return res.data ?? null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de comunicação');
        return null;
      }
    },
    [setError],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    getByProject,
    saveRules,
    clearError,
  };
}
