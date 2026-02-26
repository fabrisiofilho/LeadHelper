import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Tab,
  Tabs,
  Button,
  Skeleton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as ConfigIcon,
  Explore as ExploreIcon,
  CloudSync as ImportedIcon,
  CloudOff as CloudOffIcon,
} from '@mui/icons-material';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import { PageContainer, PlaceholderContent } from './styles';
import { ConfigTab } from './components/ConfigTab';
import { ExploreTab } from './components/ExploreTab';
import { ImportedTasksTab } from './components/ImportedTasksTab';
import { DashboardSection } from '@renderer/components/DashboardSection';

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
        <Stack spacing={2}>
          <Box>
            <Skeleton variant="text" width={280} height={40} />
            <Skeleton variant="text" width={400} height={20} />
          </Box>
          <Skeleton variant="rounded" height={120} sx={{ borderRadius: '1rem' }} />
          <Skeleton variant="rounded" height={48} sx={{ borderRadius: '0.5rem' }} />
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: '1rem' }} />
        </Stack>
      </PageContainer>
    );
  }

  const isConfigDefined = config?.isConfigured;

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

      {config && <DashboardSection />}

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

      {activeTab === 1 && !isConfigDefined && (
        <PlaceholderContent>
          <CloudOffIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Configuração do Azure DevOps não encontrada
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Configure suas credenciais de acesso para explorar work items do Azure DevOps.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ConfigIcon />}
            onClick={() => setActiveTab(0)}
          >
            Ir para Configuração
          </Button>
        </PlaceholderContent>
      )}

      {activeTab === 1 && isConfigDefined && (
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

      {activeTab === 2 && !isConfigDefined && (
        <PlaceholderContent>
          <CloudOffIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Configuração do Azure DevOps não encontrada
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Configure suas credenciais de acesso para gerenciar tarefas importadas.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ConfigIcon />}
            onClick={() => setActiveTab(0)}
          >
            Ir para Configuração
          </Button>
        </PlaceholderContent>
      )}

      {activeTab === 2 && isConfigDefined && (
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
