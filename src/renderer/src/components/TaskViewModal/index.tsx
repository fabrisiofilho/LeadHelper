import { useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Divider,
  Paper,
  Tooltip,
  Avatar,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Label as LabelIcon,
  Speed as SpeedIcon,
  Flag as FlagIcon,
  Category as CategoryIcon,
  CloudQueue as CloudIcon,
  Timer as TimerIcon,
  Group as GroupIcon,
  AccountTree as SprintIcon,
  Description as DescriptionIcon,
  Assignment as TaskIcon,
  BugReport as BugIcon,
  Star as FeatureIcon,
  Build as ImprovementIcon,
  Support as SupportIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task } from '@shared/interfaces/config/index.types';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';

interface TaskViewModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
}

const priorityConfig = {
  low: { label: 'Baixa', color: '#4caf50' },
  medium: { label: 'Média', color: '#ff9800' },
  high: { label: 'Alta', color: '#f44336' },
  critical: { label: 'Crítica', color: '#d32f2f' },
};

const statusConfig = {
  pending: { label: 'Pendente', color: '#9e9e9e' },
  in_progress: { label: 'Em Progresso', color: '#2196f3' },
  completed: { label: 'Concluída', color: '#4caf50' },
  cancelled: { label: 'Cancelada', color: '#f44336' },
};

const typeConfig = {
  task: { label: 'Tarefa', color: '#2196f3', icon: TaskIcon },
  bug: { label: 'Bug', color: '#f44336', icon: BugIcon },
  feature: { label: 'Feature', color: '#9c27b0', icon: FeatureIcon },
  improvement: { label: 'Melhoria', color: '#ff9800', icon: ImprovementIcon },
  support: { label: 'Suporte', color: '#00bcd4', icon: SupportIcon },
};

export function TaskViewModal({ open, task, onClose }: TaskViewModalProps) {
  const { config, getConfig } = useAzureDevOps();

  // Load Azure DevOps config when modal opens
  useEffect(() => {
    if (open && task?.origin === 'azure_devops' && !config) {
      getConfig();
    }
  }, [open, task, config, getConfig]);

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatDateTime = (date?: Date) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const tags = useMemo(() => {
    if (!task?.tags) return [];
    return task.tags
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [task]);

  // Build Azure DevOps work item URL
  const azureDevOpsUrl = useMemo(() => {
    if (!task || task.origin !== 'azure_devops' || !task.externalId || !config) {
      return null;
    }

    const baseUrl = config.organizationUrl.replace(/\/$/, '');
    const projectName = encodeURIComponent(config.projectName);
    const workItemId = task.externalId;

    return `${baseUrl}/${projectName}/_workitems/edit/${workItemId}`;
  }, [task, config]);

  const handleOpenInAzure = () => {
    if (azureDevOpsUrl) {
      window.electronAPI.openExternalUrl(azureDevOpsUrl);
    }
  };

  // Sanitize and render HTML description
  const renderDescription = (description?: string) => {
    if (!description) return { __html: '' };
    
    // Basic HTML sanitization - remove script tags and dangerous attributes
    const sanitized = description
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+='[^']*'/g, '');
    
    return { __html: sanitized };
  };

  if (!task) return null;

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const status = statusConfig[task.status as keyof typeof statusConfig] || {
    label: task.status,
    color: '#9e9e9e',
  };
  const type = typeConfig[task.type as keyof typeof typeConfig] || {
    label: task.type,
    color: '#2196f3',
    icon: TaskIcon,
  };

  const TypeIcon = type.icon;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '900px',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.default',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" flex={1}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: type.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <TypeIcon />
          </Box>
          <Box flex={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {task.origin === 'azure_devops' ? 'Azure DevOps' : 'Manual'}
                {task.externalId && ` #${task.externalId}`}
              </Typography>
              {task.origin === 'azure_devops' && (
                <Chip
                  icon={<CloudIcon />}
                  label="Somente Leitura"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
            </Stack>
            <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>
              {task.title}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {azureDevOpsUrl && (
            <Tooltip title="Abrir no Azure DevOps">
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={handleOpenInAzure}
                sx={{ mr: 1 }}
              >
                Abrir no Azure
              </Button>
            </Tooltip>
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent
        sx={{ p: 0, display: 'flex', height: 'calc(100% - 80px)' }}
      >
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            height: '100%',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* Main Content - Left Side */}
          <Box
            sx={{
              flex: { xs: '1 1 auto', md: '1 1 66%' },
              p: 3,
              overflowY: 'auto',
              borderRight: { md: '1px solid' },
              borderColor: { md: 'divider' },
            }}
          >
            <Stack spacing={3}>
              {/* Description */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                  <DescriptionIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Descrição
                  </Typography>
                </Stack>
                {task.description ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: 'background.default',
                      '& p': { margin: '0.5em 0' },
                      '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
                      '& li': { margin: '0.25em 0' },
                      '& h1, & h2, & h3, & h4, & h5, & h6': { 
                        margin: '0.75em 0 0.5em 0',
                        fontWeight: 600,
                      },
                      '& pre': {
                        bgcolor: 'rgba(0,0,0,0.05)',
                        p: 1,
                        borderRadius: 1,
                        overflow: 'auto',
                      },
                      '& code': {
                        bgcolor: 'rgba(0,0,0,0.05)',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontFamily: 'monospace',
                        fontSize: '0.9em',
                      },
                      '& a': {
                        color: 'primary.main',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      },
                      '& img': {
                        maxWidth: '100%',
                        height: 'auto',
                      },
                    }}
                  >
                    <Box
                      dangerouslySetInnerHTML={renderDescription(task.description)}
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                      }}
                    />
                  </Paper>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    Sem descrição
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Dates */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                  <CalendarIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Período
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: 'background.default', flex: 1 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Data de Início
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ mt: 0.5 }}
                    >
                      {formatDate(task.startDate)}
                    </Typography>
                  </Paper>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: 'background.default', flex: 1 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Data de Término
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ mt: 0.5 }}
                    >
                      {formatDate(task.endDate)}
                    </Typography>
                  </Paper>
                </Box>
              </Box>

              <Divider />

              {/* Tags */}
              {tags.length > 0 && (
                <>
                  <Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1.5}
                    >
                      <LabelIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Tags
                      </Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {tags.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                  <Divider />
                </>
              )}

              {/* Azure DevOps Info */}
              {task.origin === 'azure_devops' && (
                <>
                  <Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1.5}
                    >
                      <CloudIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Informações do Azure DevOps
                      </Typography>
                    </Stack>
                    <Stack spacing={2}>
                      {task.areaPath && (
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, bgcolor: 'background.default' }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Area Path
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            sx={{
                              mt: 0.5,
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                            }}
                          >
                            {task.areaPath}
                          </Typography>
                        </Paper>
                      )}
                      {task.iterationPath && (
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, bgcolor: 'background.default' }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Iteration Path
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            sx={{
                              mt: 0.5,
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                            }}
                          >
                            {task.iterationPath}
                          </Typography>
                        </Paper>
                      )}
                      {task.originalWorkItemType && (
                        <Paper
                          variant="outlined"
                          sx={{ p: 2, bgcolor: 'background.default' }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Tipo Original do Work Item
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            sx={{ mt: 0.5 }}
                          >
                            {task.originalWorkItemType}
                          </Typography>
                        </Paper>
                      )}
                    </Stack>
                  </Box>
                  <Divider />
                </>
              )}

              {/* Metadata */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                  <TimerIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Metadados
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: 'background.default', flex: 1 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Criado em
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ mt: 0.5 }}
                    >
                      {formatDateTime(task.createdAt)}
                    </Typography>
                  </Paper>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: 'background.default', flex: 1 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Atualizado em
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      sx={{ mt: 0.5 }}
                    >
                      {formatDateTime(task.updatedAt)}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </Stack>
          </Box>

          {/* Sidebar - Right Side */}
          <Box
            sx={{
              flex: { xs: '1 1 auto', md: '0 0 34%' },
              p: 3,
              bgcolor: 'background.default',
              overflowY: 'auto',
            }}
          >
            <Stack spacing={3}>
              {/* Status */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <CategoryIcon fontSize="small" color="action" />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    STATUS
                  </Typography>
                </Stack>
                <Chip
                  label={status.label}
                  sx={{
                    bgcolor: status.color,
                    color: 'white',
                    fontWeight: 600,
                    width: '100%',
                    justifyContent: 'flex-start',
                  }}
                />
              </Box>

              <Divider />

              {/* Priority */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <FlagIcon fontSize="small" color="action" />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    PRIORIDADE
                  </Typography>
                </Stack>
                <Chip
                  label={priority.label}
                  sx={{
                    bgcolor: priority.color,
                    color: 'white',
                    fontWeight: 600,
                    width: '100%',
                    justifyContent: 'flex-start',
                  }}
                />
              </Box>

              <Divider />

              {/* Type */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <CategoryIcon fontSize="small" color="action" />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    TIPO
                  </Typography>
                </Stack>
                <Chip
                  icon={<TypeIcon sx={{ color: 'white !important' }} />}
                  label={type.label}
                  sx={{
                    bgcolor: type.color,
                    color: 'white',
                    fontWeight: 600,
                    width: '100%',
                    justifyContent: 'flex-start',
                  }}
                />
              </Box>

              <Divider />

              {/* Assignee */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    RESPONSÁVEL
                  </Typography>
                </Stack>
                {task.assignedToName ? (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: 'primary.main',
                        fontSize: '0.875rem',
                      }}
                    >
                      {getInitials(task.assignedToName)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {task.assignedToName}
                      </Typography>
                      {task.assignedToEmail && (
                        <Typography variant="caption" color="text.secondary">
                          {task.assignedToEmail}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    Não atribuído
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Sprint */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <SprintIcon fontSize="small" color="action" />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    SPRINT
                  </Typography>
                </Stack>
                {task.sprint ? (
                  <Tooltip
                    title={`${formatDate(task.sprint.startDate)} - ${formatDate(task.sprint.endDate)}`}
                  >
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.paper',
                        cursor: 'help',
                      }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {task.sprint.name}
                      </Typography>
                    </Paper>
                  </Tooltip>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    Sem sprint
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Team */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <GroupIcon fontSize="small" color="action" />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    EQUIPE
                  </Typography>
                </Stack>
                {task.team ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: (task.team as any).color || '#2196f3',
                        }}
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {task.team.name}
                      </Typography>
                    </Stack>
                  </Paper>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    Sem equipe
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Story Points */}
              {task.storyPoints !== undefined && task.storyPoints !== null && (
                <>
                  <Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1}
                    >
                      <SpeedIcon fontSize="small" color="action" />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        STORY POINTS
                      </Typography>
                    </Stack>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.paper',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h5" fontWeight={700} color="primary">
                        {task.storyPoints}
                      </Typography>
                    </Paper>
                  </Box>
                  <Divider />
                </>
              )}
            </Stack>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
