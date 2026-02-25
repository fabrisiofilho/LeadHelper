import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as ConfigIcon,
  Explore as ExploreIcon,
  CloudSync as ImportedIcon,
} from '@mui/icons-material';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import { PageContainer } from './styles';
import { ConfigTab } from './components/ConfigTab';
import { ExploreTab } from './components/ExploreTab';
import { ImportedTasksTab } from './components/ImportedTasksTab';

export function AzureDevOpsConfigPage() {
  const [activeTab, setActiveTab] = useState(0);

  const {
    config,
    loading,
    error,
    isConnected,
    workItems,
    saveConfig,
    getConfig,
    testConnection,
    fetchWorkItems,
    importWorkItems,
    syncTask,
    syncAllImportedTasks,
    clearError,
  } = useAzureDevOps();

  const loadConfig = useCallback(async () => {
    await getConfig();
  }, [getConfig]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (loading && !config) {
    return (
      <PageContainer>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando configuração...
          </Typography>
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
            Configure credenciais, explore work items e gerencie tarefas
            importadas
          </Typography>
        </Box>
        <Tooltip title="Recarregar configuração">
          <IconButton onClick={loadConfig} size="small" disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="standard"
        >
          <Tab
            icon={<ConfigIcon />}
            iconPosition="start"
            label="Configuração"
          />
          <Tab
            icon={<ExploreIcon />}
            iconPosition="start"
            label="Explorar Work Items"
            disabled={!isConnected}
          />
          <Tab
            icon={<ImportedIcon />}
            iconPosition="start"
            label="Tarefas Importadas"
            disabled={!isConnected}
          />
        </Tabs>
      </Box>

      {activeTab === 0 && (
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
      )}

      {activeTab === 1 && (
        <ExploreTab
          isConnected={isConnected}
          workItems={workItems}
          loading={loading}
          error={error}
          onFetchWorkItems={fetchWorkItems}
          onImportWorkItems={importWorkItems}
          onClearError={clearError}
        />
      )}

      {activeTab === 2 && (
        <ImportedTasksTab
          isConnected={isConnected}
          onSyncTask={syncTask}
          onSyncAll={syncAllImportedTasks}
        />
      )}
    </PageContainer>
  );
}

export default AzureDevOpsConfigPage;
