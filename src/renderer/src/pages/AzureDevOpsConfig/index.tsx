import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  TextField,
  Alert,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Cloud as AzureIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import {
  PageContainer,
  ConfigCard,
  FormContainer,
  ConnectionStatus,
} from './styles';
import type { AzureDevOpsConfigInput } from '@shared/interfaces/config/index.types';

/**
 * Azure DevOps Configuration page
 * Allows configuration of Azure DevOps integration for importing work items
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

interface ConfigFormData {
  organizationUrl: string;
  projectName: string;
  pat: string;
}

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

  const [showPat, setShowPat] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ConfigFormData>({
    defaultValues: {
      organizationUrl: '',
      projectName: '',
      pat: '',
    },
  });

  const loadConfig = useCallback(async () => {
    const configData = await getConfig();
    if (configData) {
      reset({
        organizationUrl: configData.organizationUrl || '',
        projectName: configData.projectName || '',
        pat: '', // PAT is never returned for security
      });
    }
  }, [getConfig, reset]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSaveConfig = async (data: ConfigFormData) => {
    setFormLoading(true);
    setSaveSuccess(false);
    setTestResult(null);
    clearError();

    try {
      const configInput: AzureDevOpsConfigInput = {
        organizationUrl: data.organizationUrl.trim(),
        projectName: data.projectName.trim(),
        pat: data.pat,
      };

      const success = await saveConfig(configInput);
      if (success) {
        setSaveSuccess(true);
        reset({
          organizationUrl: data.organizationUrl.trim(),
          projectName: data.projectName.trim(),
          pat: '', // Clear PAT after save
        });
        // Auto-test connection after save
        await handleTestConnection();
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    clearError();

    try {
      const success = await testConnection();
      setTestResult({
        success,
        message: success
          ? 'Conexão estabelecida com sucesso!'
          : 'Falha na conexão. Verifique as credenciais.',
      });
    } catch {
      setTestResult({
        success: false,
        message: 'Erro ao testar conexão.',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const canTestConnection = config?.isConfigured && !isDirty;

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
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Configuração Azure DevOps
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure a integração com Azure DevOps para importar tarefas
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Recarregar configuração">
            <IconButton onClick={loadConfig} size="small" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Connection Status */}
      {config?.isConfigured && (
        <Box mb={3}>
          <ConnectionStatus $connected={isConnected}>
            {isConnected ? (
              <>
                <CheckCircleIcon fontSize="small" />
                <span>Conectado ao Azure DevOps</span>
              </>
            ) : (
              <>
                <ErrorIcon fontSize="small" />
                <span>Não conectado - Configure as credenciais abaixo</span>
              </>
            )}
          </ConnectionStatus>
        </Box>
      )}

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {saveSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSaveSuccess(false)}
        >
          Configuração salva com sucesso!
        </Alert>
      )}

      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          sx={{ mb: 3 }}
          onClose={() => setTestResult(null)}
        >
          {testResult.message}
        </Alert>
      )}

      {/* Configuration Form */}
      <ConfigCard>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <AzureIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Credenciais de Acesso
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" mb={3}>
          Insira as informações de conexão com sua organização Azure DevOps. O
          Personal Access Token (PAT) será armazenado de forma segura.
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <form onSubmit={handleSubmit(handleSaveConfig)}>
          <FormContainer>
            <Controller
              name="organizationUrl"
              control={control}
              rules={{
                required: 'URL da organização é obrigatória',
                pattern: {
                  value: /^https:\/\/dev\.azure\.com\/[\w-]+\/?$/i,
                  message:
                    'URL deve seguir o formato: https://dev.azure.com/sua-organizacao',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="URL da Organização"
                  placeholder="https://dev.azure.com/sua-organizacao"
                  fullWidth
                  required
                  error={!!errors.organizationUrl}
                  helperText={
                    errors.organizationUrl?.message ||
                    'Ex: https://dev.azure.com/minha-empresa'
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="projectName"
              control={control}
              rules={{
                required: 'Nome do projeto é obrigatório',
                minLength: {
                  value: 1,
                  message: 'Nome do projeto não pode estar vazio',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nome do Projeto"
                  placeholder="Nome do projeto no Azure DevOps"
                  fullWidth
                  required
                  error={!!errors.projectName}
                  helperText={
                    errors.projectName?.message ||
                    'Nome exato do projeto como aparece no Azure DevOps'
                  }
                />
              )}
            />

            <Controller
              name="pat"
              control={control}
              rules={{
                required: config?.isConfigured
                  ? false
                  : 'Personal Access Token é obrigatório',
                minLength: {
                  value: 10,
                  message: 'PAT deve ter pelo menos 10 caracteres',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Personal Access Token (PAT)"
                  placeholder={
                    config?.isConfigured
                      ? 'Deixe em branco para manter o atual'
                      : 'Cole seu PAT aqui'
                  }
                  fullWidth
                  required={!config?.isConfigured}
                  type={showPat ? 'text' : 'password'}
                  error={!!errors.pat}
                  helperText={
                    errors.pat?.message ||
                    (config?.isConfigured
                      ? 'Deixe em branco para manter o token atual'
                      : 'Token de acesso pessoal com permissão de leitura de Work Items')
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPat(!showPat)}
                          edge="end"
                          size="small"
                        >
                          {showPat ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'flex-end',
                mt: 2,
              }}
            >
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={!canTestConnection || testLoading || formLoading}
                startIcon={
                  testLoading ? <CircularProgress size={16} /> : <RefreshIcon />
                }
              >
                {testLoading ? 'Testando...' : 'Testar Conexão'}
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={formLoading || (!isDirty && config?.isConfigured)}
                startIcon={
                  formLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
              >
                {formLoading ? 'Salvando...' : 'Salvar Configuração'}
              </Button>
            </Box>
          </FormContainer>
        </form>

        {/* Help Section */}
        <Box mt={4} p={2} bgcolor="action.hover" borderRadius={1}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Como obter um Personal Access Token (PAT)?
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
              <li>Acesse o Azure DevOps e clique no ícone do seu perfil</li>
              <li>Selecione "Personal access tokens"</li>
              <li>Clique em "New Token"</li>
              <li>Defina um nome e selecione a organização</li>
              <li>Em "Scopes", selecione "Work Items" → "Read"</li>
              <li>Clique em "Create" e copie o token gerado</li>
            </ol>
          </Typography>
        </Box>
      </ConfigCard>
    </PageContainer>
  );
}

export default AzureDevOpsConfigPage;
