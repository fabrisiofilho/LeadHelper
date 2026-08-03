import { useEffect, useState } from 'react';
import {
  TextField,
  Stack,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Link as LinkIcon,
  FolderOpen as FolderIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Modal } from '@renderer/components/Modal';
import type {
  AzureDevOpsProjectConfig,
  AzureDevOpsProjectInput,
} from '@shared/interfaces/config/index.types';

interface ProjectFormData {
  displayName: string;
  organizationUrl: string;
  projectName: string;
  pat: string;
  sustentacaoAreaPath: string;
  projetosAreaPath: string;
}

interface ProjectFormModalProps {
  open: boolean;
  project: AzureDevOpsProjectConfig | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: AzureDevOpsProjectInput) => Promise<void>;
}

export function ProjectFormModal({
  open,
  project,
  loading,
  error,
  onClose,
  onSave,
}: ProjectFormModalProps) {
  const isEditing = !!project;
  const [showPat, setShowPat] = useState(false);
  const [patLoading, setPatLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    defaultValues: {
      displayName: '',
      organizationUrl: '',
      projectName: '',
      pat: '',
      sustentacaoAreaPath: '',
      projetosAreaPath: '',
    },
  });

  useEffect(() => {
    if (open) {
      setShowPat(false);
      setTestResult(null);
      if (project) {
        reset({
          displayName: project.displayName,
          organizationUrl: project.organizationUrl,
          projectName: project.projectName,
          pat: '',
          sustentacaoAreaPath: project.sustentacaoAreaPath ?? '',
          projetosAreaPath: project.projetosAreaPath ?? '',
        });
      } else {
        reset({
          displayName: '',
          organizationUrl: '',
          projectName: '',
          pat: '',
          sustentacaoAreaPath: '',
          projetosAreaPath: '',
        });
      }
    }
  }, [open, project, reset]);

  /**
   * When the user clicks the eye icon in edit mode:
   * - If the PAT field is still empty (hasn't been loaded yet), fetch the
   *   decrypted PAT from the backend and fill the field.
   * - Then toggle visibility.
   */
  const handleToggleShowPat = async () => {
    if (isEditing && project?.id && !showPat) {
      const currentPat = getValues('pat');
      if (!currentPat) {
        setPatLoading(true);
        try {
          const response = await window.electronAPI.azureDevOps.getProjectPat(
            project.id,
          );
          if (response.success && response.data) {
            setValue('pat', response.data, { shouldDirty: false });
          }
        } catch {
          // Non-critical — user can still type a new PAT
        } finally {
          setPatLoading(false);
        }
      }
    }
    setShowPat((v) => !v);
  };

  const handleTestInline = async () => {
    const values = getValues();
    if (!values.organizationUrl || !values.projectName) {
      setTestResult({
        ok: false,
        message: 'Preencha URL e nome do projeto antes de testar.',
      });
      return;
    }
    if (!isEditing && !values.pat) {
      setTestResult({ ok: false, message: 'Preencha o PAT antes de testar.' });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      // If editing and id exists, test by id; else we can't test before save — just validate url format
      if (isEditing && project?.id) {
        const response =
          await window.electronAPI.azureDevOps.testConnectionById(project.id);
        setTestResult({
          ok: !!response.data,
          message: response.data
            ? 'Conexão estabelecida com sucesso!'
            : (response.error ?? 'Falha na conexão'),
        });
      } else {
        setTestResult({
          ok: false,
          message: 'Salve o projeto primeiro para testar a conexão.',
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Erro ao testar conexão',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const onSubmit = async (data: ProjectFormData) => {
    await onSave({
      id: project?.id,
      displayName: data.displayName.trim(),
      organizationUrl: data.organizationUrl.trim(),
      projectName: data.projectName.trim(),
      pat: data.pat.trim() || undefined,
      sustentacaoAreaPath: data.sustentacaoAreaPath.trim() || undefined,
      projetosAreaPath: data.projetosAreaPath.trim() || undefined,
    });
  };

  return (
    <Modal
      variant="form"
      open={open}
      title={
        isEditing ? 'Editar Projeto Azure DevOps' : 'Novo Projeto Azure DevOps'
      }
      handleClose={onClose}
      handleConfirm={handleSubmit(onSubmit)}
      confirmLabel="Salvar"
      cancelLabel="Cancelar"
      loading={loading}
      setMaxWidth="520px"
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <Controller
          name="displayName"
          control={control}
          rules={{ required: 'Nome de exibição é obrigatório' }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Nome de Exibição"
              placeholder="Ex: Tribo SEIF"
              fullWidth
              required
              size="small"
              error={!!errors.displayName}
              helperText={
                errors.displayName?.message ||
                'Nome amigável para identificar o projeto no sistema'
              }
            />
          )}
        />

        <Controller
          name="organizationUrl"
          control={control}
          rules={{
            required: 'URL da organização é obrigatória',
            validate: (v) => {
              try {
                new URL(v);
                return true;
              } catch {
                return 'URL inválida';
              }
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="URL da Organização"
              placeholder="https://dev.azure.com/sua-organizacao"
              fullWidth
              required
              size="small"
              error={!!errors.organizationUrl}
              helperText={
                errors.organizationUrl?.message ||
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
              placeholder="Nome exato do projeto no Azure DevOps"
              fullWidth
              required
              size="small"
              error={!!errors.projectName}
              helperText={
                errors.projectName?.message ||
                'Nome exato conforme aparece no Azure DevOps'
              }
            />
          )}
        />

        <Controller
          name="pat"
          control={control}
          rules={{
            required: isEditing ? false : 'PAT é obrigatório',
            minLength: {
              value: 10,
              message: 'PAT deve ter ao menos 10 caracteres',
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Personal Access Token (PAT)"
              placeholder={
                isEditing
                  ? 'Deixe em branco para manter o atual'
                  : 'Cole seu PAT aqui'
              }
              fullWidth
              required={!isEditing}
              size="small"
              type={showPat ? 'text' : 'password'}
              error={!!errors.pat}
              helperText={
                errors.pat?.message ||
                (isEditing
                  ? 'Clique no olho para ver o token atual. Preencha apenas para atualizar.'
                  : 'Token com permissão de leitura de Work Items.')
              }
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleToggleShowPat}
                        edge="end"
                        disabled={patLoading}
                      >
                        {patLoading ? (
                          <CircularProgress size={16} />
                        ) : showPat ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        />

        {isEditing && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="body2"
              color="primary"
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={handleTestInline}
            >
              {testLoading ? 'Testando...' : 'Testar conexão atual'}
            </Typography>
            {testLoading && <CircularProgress size={14} />}
            {testResult &&
              (testResult.ok ? (
                <CheckCircleIcon color="success" fontSize="small" />
              ) : (
                <ErrorIcon color="error" fontSize="small" />
              ))}
            {testResult && (
              <Typography
                variant="caption"
                color={testResult.ok ? 'success.main' : 'error.main'}
              >
                {testResult.message}
              </Typography>
            )}
          </Stack>
        )}

        <Divider />
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
          Area Paths (opcional)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Configure os caminhos de área para filtrar os dashboards. Se não
          preenchido, usam os valores padrão.
        </Typography>

        <Controller
          name="sustentacaoAreaPath"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Area Path — Sustentação"
              placeholder="Ex: Tribo SEIF\Sustentação"
              fullWidth
              size="small"
              helperText="Filtro para Dashboard Sustentação (Tickets e Improvements)"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <FolderIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        />

        <Controller
          name="projetosAreaPath"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Area Path — Projetos"
              placeholder="Ex: Tribo SEIF\Projetos"
              fullWidth
              size="small"
              helperText="Filtro para Dashboard Projetos (User Stories, Features, Epics)"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <FolderIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        />
      </Stack>
    </Modal>
  );
}

export default ProjectFormModal;
