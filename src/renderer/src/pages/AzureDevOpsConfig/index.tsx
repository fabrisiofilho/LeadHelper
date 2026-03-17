import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Skeleton,
  Alert,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CloudSync as SyncIcon,
} from '@mui/icons-material';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import { SyncProgressModal } from '@renderer/components/SyncProgressModal';
import { PageContainer } from './styles';
import { ConfigTab } from './components/ConfigTab';

export function AzureDevOpsConfigPage() {
  const {
    config,
    loading,
    error,
    isConnected,
    saveConfig,
    getConfig,
    testConnection,
    clearError,
  } = useAzureDevOps();

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const loadConfig = useCallback(
    async (includePat = false) => {
      await getConfig(includePat);
    },
    [getConfig],
  );

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleFullSync = useCallback(async () => {
    setSyncLoading(true);
    setSyncResult(null);
    setShowSyncModal(true);

    try {
      const response = await window.electronAPI.azureDevOps.fullSync();
      if (response.success && response.data) {
        const d = response.data;
        const failureInfo =
          d.failureCount > 0
            ? ` (${d.failureCount} falha(s))`
            : '';
        setSyncResult(
          `Sincronização concluída: ${d.sprints.total} sprints, ${d.teams.total} equipes, ${d.members.total} membros, ${d.tasks.total} tarefas.${failureInfo}`,
        );
      } else {
        setSyncResult(response.error || 'Erro ao sincronizar.');
      }
    } catch {
      setSyncResult('Erro de comunicação ao sincronizar.');
    } finally {
      setSyncLoading(false);
    }
  }, []);

  const handleCloseSyncModal = useCallback(() => {
    setShowSyncModal(false);
  }, []);

  if (loading && !config) {
    return (
      <PageContainer>
        <Stack spacing={2}>
          <Box>
            <Skeleton variant="text" width={280} height={40} />
            <Skeleton variant="text" width={400} height={20} />
          </Box>
          <Skeleton
            variant="rounded"
            height={120}
            sx={{ borderRadius: '1rem' }}
          />
          <Skeleton
            variant="rounded"
            height={300}
            sx={{ borderRadius: '1rem' }}
          />
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Integração Azure DevOps
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure credenciais e sincronize dados do Azure DevOps
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {isConnected && (
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={handleFullSync}
              disabled={syncLoading}
              size="small"
            >
              {syncLoading ? 'Sincronizando...' : 'Sincronizar Tudo'}
            </Button>
          )}
          <Tooltip title="Recarregar configuração">
            <IconButton onClick={loadConfig} size="small" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {syncResult && (
        <Alert
          severity={
            syncResult.startsWith('Erro')
              ? 'error'
              : syncResult.includes('falha')
                ? 'warning'
                : 'success'
          }
          onClose={() => setSyncResult(null)}
          sx={{ mb: 2 }}
        >
          {syncResult}
        </Alert>
      )}

      <ConfigTab
        config={config}
        loading={loading}
        error={error}
        isConnected={isConnected}
        onSaveConfig={saveConfig}
        onTestConnection={testConnection}
        onLoadConfig={loadConfig}
        onClearError={clearError}
      />

      <SyncProgressModal open={showSyncModal} onClose={handleCloseSyncModal} />
    </PageContainer>
  );
}

export default AzureDevOpsConfigPage;
