import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
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
import { ConfigCard, FormContainer, ConnectionStatus } from '../../styles';
import type { AzureDevOpsConfigInput } from '@shared/interfaces/config/index.types';

interface ConfigFormData {
  organizationUrl: string;
  projectName: string;
  pat: string;
}

interface ConfigTabProps {
  config: {
    organizationUrl: string;
    projectName: string;
    isConfigured: boolean;
  } | null;
  loading?: boolean;
  error: string | null;
  isConnected: boolean;
  onSaveConfig: (data: AzureDevOpsConfigInput) => Promise<boolean>;
  onTestConnection: () => Promise<boolean>;
  onLoadConfig?: () => Promise<void>;
  onClearError: () => void;
}

export function ConfigTab({
  config,
  error,
  isConnected,
  onSaveConfig,
  onTestConnection,
  onClearError,
}: ConfigTabProps) {
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
    formState: { errors: formErrors, isDirty },
  } = useForm<ConfigFormData>({
    defaultValues: { organizationUrl: '', projectName: '', pat: '' },
  });

  useEffect(() => {
    if (config) {
      reset({
        organizationUrl: config.organizationUrl || '',
        projectName: config.projectName || '',
        pat: '',
      });
    }
  }, [config, reset]);

  const handleSave = async (data: ConfigFormData) => {
    setFormLoading(true);
    setSaveSuccess(false);
    setTestResult(null);
    onClearError();
    try {
      const success = await onSaveConfig({
        organizationUrl: data.organizationUrl.trim(),
        projectName: data.projectName.trim(),
        pat: data.pat,
      });
      if (success) {
        setSaveSuccess(true);
        reset({
          organizationUrl: data.organizationUrl.trim(),
          projectName: data.projectName.trim(),
          pat: '',
        });
        await handleTest();
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    onClearError();
    try {
      const success = await onTestConnection();
      if (success) {
        setTestResult({
          success: true,
          message: 'Conexão estabelecida com sucesso!',
        });
      }
    } finally {
      setTestLoading(false);
    }
  };

  const canTestConnection = config?.isConfigured && !isDirty;

  return (
    <Box>
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
          {error}
        </Alert>
      )}
      {saveSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSaveSuccess(false)}
        >
          Configuração salva com sucesso!
        </Alert>
      )}
      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          sx={{ mb: 2 }}
          onClose={() => setTestResult(null)}
        >
          {testResult.message}
        </Alert>
      )}

      <ConfigCard>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <AzureIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Credenciais de Acesso
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Insira as informações de conexão com sua organização Azure DevOps.
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <form onSubmit={handleSubmit(handleSave)}>
          <FormContainer>
            <Controller
              name="organizationUrl"
              control={control}
              rules={{
                required: 'URL da organização é obrigatória',
                pattern: {
                  value: /^https:\/\/dev\.azure\.com\/[^\s/]+\/?$/i,
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
                  error={!!formErrors.organizationUrl}
                  helperText={
                    formErrors.organizationUrl?.message ||
                    'Ex: https://dev.azure.com/minha-empresa'
                  }
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LinkIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />
            <Controller
              name="projectName"
              control={control}
              rules={{ required: 'Nome do projeto é obrigatório' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nome do Projeto"
                  placeholder="Nome do projeto no Azure DevOps"
                  fullWidth
                  required
                  error={!!formErrors.projectName}
                  helperText={
                    formErrors.projectName?.message || 'Nome exato do projeto'
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
                  error={!!formErrors.pat}
                  helperText={
                    formErrors.pat?.message ||
                    (config?.isConfigured
                      ? 'Deixe em branco para manter o token atual'
                      : 'Token com permissão de leitura de Work Items')
                  }
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPat(!showPat)}
                            edge="end"
                            size="small"
                          >
                            {showPat ? (
                              <VisibilityOffIcon />
                            ) : (
                              <VisibilityIcon />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
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
                onClick={handleTest}
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
                {formLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </Box>
          </FormContainer>
        </form>
      </ConfigCard>
    </Box>
  );
}
