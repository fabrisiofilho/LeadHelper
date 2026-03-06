import { useMemo, useEffect, useState, useCallback } from 'react';
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
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
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
  AccountTree as HierarchyIcon,
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task, BreadcrumbItem } from '@shared/interfaces/config/index.types';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import { TaskHierarchy } from '@renderer/components/TaskHierarchy';
import { useTasks } from '@renderer/hooks/useTasks';

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
  const { findById } = useTasks();
  const [activeTab, setActiveTab] = useState(0);
  const [taskWithHierarchy, setTaskWithHierarchy] = useState<Task | null>(null);
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[]>([]);

  // Load Azure DevOps config when modal opens
  useEffect(() => {
    if (open && task?.origin === 'azure_devops' && !config) {
      getConfig();
    }
  }, [open, task, config, getConfig]);

  // Load task with full hierarchy and breadcrumb when modal opens
  useEffect(() => {
    const loadTaskWithHierarchy = async () => {
      if (open && task) {
        try {
          console.log('[TaskViewModal] Loading task with hierarchy:', task.id);
          const response = await window.electronAPI.task.findById(task.id);
          console.log('[TaskViewModal] Response:', response);
          if (response.success && response.data) {
            console.log('[TaskViewModal] Task data:', {
              id: response.data.id,
              title: response.data.title,
              hasParent: !!response.data.parent,
              hasChildren:
                !!response.data.children && response.data.children.length > 0,
              parentId: response.data.parentId,
              childrenCount: response.data.children?.length || 0,
            });
            setTaskWithHierarchy(response.data);
            
            // Load breadcrumb for navigation
            const breadcrumbResponse = await window.electronAPI.hierarchy.buildBreadcrumb(task.id);
            if (breadcrumbResponse.success && breadcrumbResponse.data) {
              setBreadcrumbItems(breadcrumbResponse.data);
            }
          } else {
            console.log(
              '[TaskViewModal] Using original task (no data in response)',
            );
            setTaskWithHierarchy(task);
          }
        } catch (error) {
          console.error('Error loading task hierarchy:', error);
          setTaskWithHierarchy(task);
        }
      }
    };

    loadTaskWithHierarchy();
  }, [open, task]);

  // Reset tab when modal closes
  useEffect(() => {
    if (!open) {
      setActiveTab(0);
      setTaskWithHierarchy(null);
      setBreadcrumbItems([]);
    }
  }, [open]);

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setActiveTab(newValue);
    },
    [],
  );

  const handleHierarchyTaskClick = useCallback(async (clickedTask: Task) => {
    // Load full task data and update modal
    try {
      console.log('[TaskViewModal] Loading clicked task:', clickedTask.id);
      const response = await window.electronAPI.task.findById(clickedTask.id);
      console.log('[TaskViewModal] Clicked task response:', response);
      if (response.success && response.data) {
        console.log('[TaskViewModal] Updating modal with new task:', {
          id: response.data.id,
          title: response.data.title,
          hasParent: !!response.data.parent,
          hasChildren:
            !!response.data.children && response.data.children.length > 0,
        });
        setTaskWithHierarchy(response.data);
        setActiveTab(0); // Switch back to details tab
        
        // Update breadcrumb for the new task
        const breadcrumbResponse = await window.electronAPI.hierarchy.buildBreadcrumb(clickedTask.id);
        if (breadcrumbResponse.success && breadcrumbResponse.data) {
          setBreadcrumbItems(breadcrumbResponse.data);
        }
      }
    } catch (error) {
      console.error('[TaskViewModal] Error loading clicked task:', error);
    }
  }, []);

  const handleBreadcrumbClick = useCallback(async (taskId: number) => {
    // Navigate to a task from breadcrumb
    try {
      console.log('[TaskViewModal] Breadcrumb navigation to task:', taskId);
      const response = await window.electronAPI.task.findById(taskId);
      if (response.success && response.data) {
        setTaskWithHierarchy(response.data);
        
        // Update breadcrumb for the new task
        const breadcrumbResponse = await window.electronAPI.hierarchy.buildBreadcrumb(taskId);
        if (breadcrumbResponse.success && breadcrumbResponse.data) {
          setBreadcrumbItems(breadcrumbResponse.data);
        }
      }
    } catch (error) {
      console.error('[TaskViewModal] Error navigating via breadcrumb:', error);
    }
  }, []);

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

  // Define displayTask before using it in useMemo
  const displayTask = taskWithHierarchy || task;

  const tags = useMemo(() => {
    if (!displayTask?.tags) return [];
    return displayTask.tags
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [displayTask]);

  // Build Azure DevOps work item URL
  const azureDevOpsUrl = useMemo(() => {
    if (
      !displayTask ||
      displayTask.origin !== 'azure_devops' ||
      !displayTask.externalId ||
      !config
    ) {
      return null;
    }

    const baseUrl = config.organizationUrl.replace(/\/$/, '');
    const projectName = encodeURIComponent(config.projectName);
    const workItemId = displayTask.externalId;

    return `${baseUrl}/${projectName}/_workitems/edit/${workItemId}`;
  }, [displayTask, config]);

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

  const hasHierarchy =
    displayTask.parent ||
    (displayTask.children && displayTask.children.length > 0);

  console.log('[TaskViewModal] Render check:', {
    taskId: displayTask.id,
    taskTitle: displayTask.title,
    hasParent: !!displayTask.parent,
    hasChildren: !!displayTask.children && displayTask.children.length > 0,
    childrenCount: displayTask.children?.length || 0,
    hasHierarchy,
  });

  const priority =
    priorityConfig[displayTask.priority] || priorityConfig.medium;
  const status = statusConfig[
    displayTask.status as keyof typeof statusConfig
  ] || {
    label: displayTask.status,
    color: '#9e9e9e',
  };
  const type = typeConfig[displayTask.type as keyof typeof typeConfig] || {
    label: displayTask.type,
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
                {displayTask.origin === 'azure_devops'
                  ? 'Azure DevOps'
                  : 'Manual'}
                {displayTask.externalId && ` #${displayTask.externalId}`}
              </Typography>
              {displayTask.origin === 'azure_devops' && (
                <Chip
                  icon={<CloudIcon />}
                  label="Somente Leitura"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
              {hasHierarchy && (
                <Chip
                  icon={<HierarchyIcon />}
                  label="Com Hierarquia"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
            </Stack>
            <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>
              {displayTask.title}
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

      {/* Breadcrumb Navigation */}
      {breadcrumbItems.length > 1 && (
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />} 
            aria-label="navegação hierárquica"
            sx={{ '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}
          >
            {breadcrumbItems.slice(0, -1).map((item) => (
              <Link
                key={item.id}
                component="button"
                variant="body2"
                onClick={() => handleBreadcrumbClick(item.id)}
                sx={{ 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
                title={item.title}
              >
                {item.truncatedTitle}
              </Link>
            ))}
            <Typography variant="body2" color="text.primary">
              {breadcrumbItems[breadcrumbItems.length - 1]?.truncatedTitle}
            </Typography>
          </Breadcrumbs>
        </Box>
      )}

      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 80px)',
        }}
      >
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Detalhes" />
            {hasHierarchy && (
              <Tab
                label="Hierarquia"
                icon={<HierarchyIcon />}
                iconPosition="start"
              />
            )}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {/* Details Tab */}
          {activeTab === 0 && (
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1.5}
                    >
                      <DescriptionIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Descrição
                      </Typography>
                    </Stack>
                    {displayTask.description ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: 'background.default',
                          '& p': { margin: '0.5em 0' },
                          '& ul, & ol': {
                            paddingLeft: '1.5em',
                            margin: '0.5em 0',
                          },
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
                          dangerouslySetInnerHTML={renderDescription(
                            displayTask.description,
                          )}
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1.5}
                    >
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
                          {formatDate(displayTask.startDate)}
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
                          {formatDate(displayTask.endDate)}
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
                  {displayTask.origin === 'azure_devops' && (
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
                          {displayTask.areaPath && (
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
                                {displayTask.areaPath}
                              </Typography>
                            </Paper>
                          )}
                          {displayTask.iterationPath && (
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
                                {displayTask.iterationPath}
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1.5}
                    >
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
                          {formatDateTime(displayTask.createdAt)}
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
                          {formatDateTime(displayTask.updatedAt)}
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1}
                    >
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1}
                    >
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1}
                    >
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1}
                    >
                      <PersonIcon fontSize="small" color="action" />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        RESPONSÁVEL
                      </Typography>
                    </Stack>
                    {displayTask.assignedToName ? (
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'primary.main',
                            fontSize: '0.875rem',
                          }}
                        >
                          {getInitials(displayTask.assignedToName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {displayTask.assignedToName}
                          </Typography>
                          {displayTask.assignedToEmail && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {displayTask.assignedToEmail}
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1}
                    >
                      <SprintIcon fontSize="small" color="action" />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        SPRINT
                      </Typography>
                    </Stack>
                    {displayTask.sprint ? (
                      <Tooltip
                        title={`${formatDate(displayTask.sprint.startDate)} - ${formatDate(displayTask.sprint.endDate)}`}
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
                            {displayTask.sprint.name}
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
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      mb={1}
                    >
                      <GroupIcon fontSize="small" color="action" />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        EQUIPE
                      </Typography>
                    </Stack>
                    {displayTask.team ? (
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
                              bgcolor:
                                (displayTask.team as any).color || '#2196f3',
                            }}
                          />
                          <Typography variant="body2" fontWeight={500}>
                            {displayTask.team.name}
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
                  {displayTask.storyPoints !== undefined &&
                    displayTask.storyPoints !== null && (
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
                            <Typography
                              variant="h5"
                              fontWeight={700}
                              color="primary"
                            >
                              {displayTask.storyPoints}
                            </Typography>
                          </Paper>
                        </Box>
                        <Divider />
                      </>
                    )}
                </Stack>
              </Box>
            </Box>
          )}

          {/* Hierarchy Tab */}
          {activeTab === 1 && hasHierarchy && (
            <Box
              sx={{
                p: 3,
                height: '100%',
                overflowY: 'auto',
              }}
            >
              <TaskHierarchy
                task={displayTask}
                onTaskClick={handleHierarchyTaskClick}
                maxLevel={10}
              />
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
