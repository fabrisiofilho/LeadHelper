import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Alert,
  Button,
  Paper,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CloudSync as SyncIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cloud as CloudIcon,
  HelpOutline as UnknownIcon,
} from '@mui/icons-material';
import { useAzureDevOpsProjects } from '@renderer/hooks/useAzureDevOpsProjects';
import { useAzureProjects } from '@renderer/providers/AzureProjectsProvider';
import { SyncProgressModal } from '@renderer/components/SyncProgressModal';
import { Modal } from '@renderer/components/Modal';
import { PageContainer } from './styles';
import { ProjectFormModal } from './components/ProjectFormModal';
import type { AzureDevOpsProjectConfig } from '@shared/interfaces/config/index.types';

export function AzureDevOpsConfigPage() {
  const { reload } = useAzureProjects();
  const {
    projects,
    loading,
    error,
    listProjects,
    saveProject,
    deleteProject,
    testConnection,
    clearError,
  } = useAzureDevOpsProjects();

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] =
    useState<AzureDevOpsProjectConfig | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] =
    useState<AzureDevOpsProjectConfig | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Per-project connection test state
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<
    Map<number, boolean | 'error'>
  >(new Map());

  useEffect(() => {
    listProjects();
  }, [listProjects]);

  const handleFullSync = useCallback(async () => {
    setSyncLoading(true);
    setSyncResult(null);
    setShowSyncModal(true);
    try {
      const response = await window.electronAPI.azureDevOps.fullSync();
      if (response.success && response.data) {
        const d = response.data;
        const failureInfo =
          d.failureCount > 0 ? ` (${d.failureCount} falha(s))` : '';
        setSyncResult(
          `Sincronização concluída: ${d.sprints.total} sprints, ${d.teams.total} equipes, ${d.members.total} membros, ${d.tasks.total} tarefas.${failureInfo}`,
        );
        reload();
      } else {
        setSyncResult(response.error || 'Erro ao sincronizar.');
      }
    } catch {
      setSyncResult('Erro de comunicação ao sincronizar.');
    } finally {
      setSyncLoading(false);
    }
  }, [reload]);

  const handleTestConnection = useCallback(
    async (id: number) => {
      setTestingId(id);
      try {
        const ok = await testConnection(id);
        setTestResults((prev) => new Map(prev).set(id, ok));
      } catch {
        setTestResults((prev) => new Map(prev).set(id, 'error'));
      } finally {
        setTestingId(null);
      }
    },
    [testConnection],
  );

  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormError(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (project: AzureDevOpsProjectConfig) => {
    setEditingProject(project);
    setFormError(null);
    setFormOpen(true);
  };

  const handleFormSave = async (input: Parameters<typeof saveProject>[0]) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await saveProject(input);
      setFormOpen(false);
      setEditingProject(null);
      reload();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Erro ao salvar projeto',
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Erro ao remover projeto',
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasActiveProjects = projects.some((p) => p.isActive);

  if (loading && projects.length === 0) {
    return (
      <PageContainer>
        <Stack spacing={2}>
          <Box>
            <Skeleton variant="text" width={280} height={40} />
            <Skeleton variant="text" width={400} height={20} />
          </Box>
          {[1, 2].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={88}
              sx={{ borderRadius: '1rem' }}
            />
          ))}
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
          <Typography variant="h5" fontWeight={700}>
            Projetos Azure DevOps
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie os projetos integrados e sincronize os dados
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {hasActiveProjects && (
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
          <Tooltip title="Recarregar lista">
            <IconButton onClick={listProjects} size="small" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            size="small"
          >
            Adicionar Projeto
          </Button>
        </Stack>
      </Stack>

      {(error || syncResult) && (
        <Alert
          severity={
            syncResult
              ? syncResult.startsWith('Erro')
                ? 'error'
                : syncResult.includes('falha')
                  ? 'warning'
                  : 'success'
              : 'error'
          }
          onClose={() => {
            clearError();
            setSyncResult(null);
          }}
          sx={{ mb: 2 }}
        >
          {syncResult ?? error}
        </Alert>
      )}

      {projects.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            borderStyle: 'dashed',
          }}
        >
          <CloudIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum projeto configurado
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Adicione seu primeiro projeto Azure DevOps para começar a
            sincronizar dados.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
          >
            Adicionar Primeiro Projeto
          </Button>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {projects.map((project) => {
            const testResult = testResults.get(project.id);
            return (
              <Paper
                key={project.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  '&:hover': { boxShadow: 2 },
                  transition: 'box-shadow 0.2s',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  {/* Status icon */}
                  <Box sx={{ flexShrink: 0 }}>
                    {testResult === true ? (
                      <CheckCircleIcon color="success" />
                    ) : testResult === 'error' ? (
                      <ErrorIcon color="error" />
                    ) : (
                      <UnknownIcon color="disabled" />
                    )}
                  </Box>

                  {/* Project info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {project.displayName}
                      </Typography>
                      <Chip
                        label={project.isActive ? 'Ativo' : 'Inativo'}
                        size="small"
                        color={project.isActive ? 'success' : 'default'}
                        variant={project.isActive ? 'filled' : 'outlined'}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {project.organizationUrl} /{' '}
                      <strong>{project.projectName}</strong>
                    </Typography>
                    {(project.sustentacaoAreaPath ||
                      project.projetosAreaPath) && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        mt={0.5}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {project.sustentacaoAreaPath && (
                          <Chip
                            label={`Sustentação: ${project.sustentacaoAreaPath}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                        {project.projetosAreaPath && (
                          <Chip
                            label={`Projetos: ${project.projetosAreaPath}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Stack>
                    )}
                  </Box>

                  {/* Actions */}
                  <Stack direction="row" spacing={0.5} flexShrink={0}>
                    <Tooltip title="Testar Conexão">
                      <IconButton
                        size="small"
                        onClick={() => handleTestConnection(project.id)}
                        disabled={testingId === project.id}
                      >
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEdit(project)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(project)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Add/Edit modal */}
      <ProjectFormModal
        open={formOpen}
        project={editingProject}
        loading={formLoading}
        error={formError}
        onClose={() => {
          setFormOpen(false);
          setEditingProject(null);
          setFormError(null);
        }}
        onSave={handleFormSave}
      />

      {/* Delete confirmation */}
      <Modal
        variant="danger"
        open={!!deleteTarget}
        title="Remover Projeto"
        handleClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        handleConfirm={handleDeleteConfirm}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        loading={deleteLoading}
      >
        <Typography>
          Tem certeza que deseja remover o projeto{' '}
          <strong>{deleteTarget?.displayName}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          As tarefas sincronizadas deste projeto{' '}
          <strong>não serão excluídas</strong>, apenas desassociadas do projeto.
        </Typography>
        {deleteError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {deleteError}
          </Alert>
        )}
      </Modal>

      <SyncProgressModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />
    </PageContainer>
  );
}

export default AzureDevOpsConfigPage;
