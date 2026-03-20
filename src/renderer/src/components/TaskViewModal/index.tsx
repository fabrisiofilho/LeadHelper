import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
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
  Person as PersonIcon,
  Label as LabelIcon,
  Speed as SpeedIcon,
  Flag as FlagIcon,
  CloudQueue as CloudIcon,
  Group as GroupIcon,
  AccountTree as SprintIcon,
  Description as DescriptionIcon,
  Assignment as TaskIcon,
  AssignmentTurnedIn as TaskTypeIcon,
  BugReport as BugIcon,
  EmojiEvents as FeatureIcon,
  Diamond as ImprovementIcon,
  LocalFireDepartment as TicketIcon,
  MenuBook as UserStoryIcon,
  MilitaryTech as EpicIcon,
  DirectionsCar as RoadmapIcon,
  OpenInNew as OpenInNewIcon,
  AccountTree as HierarchyIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task, BreadcrumbItem } from '@shared/interfaces/config/index.types';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import { TaskHierarchy } from '@renderer/components/TaskHierarchy';
import { getStatusColor } from '@shared/constants/status-colors';

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

const typeConfigMap: Record<string, { label: string; color: string; icon: typeof TaskIcon }> = {
  'Epic': { label: 'Epic', color: '#ff8c00', icon: EpicIcon },
  'Feature': { label: 'Feature', color: '#9c27b0', icon: FeatureIcon },
  'Improvement': { label: 'Improvement', color: '#e91e63', icon: ImprovementIcon },
  'Rework': { label: 'Rework', color: '#d32f2f', icon: BugIcon },
  'Bug': { label: 'Bug', color: '#d32f2f', icon: BugIcon },
  'Roadmap': { label: 'Roadmap', color: '#424242', icon: RoadmapIcon },
  'Task': { label: 'Task', color: '#c8a415', icon: TaskTypeIcon },
  'Ticket': { label: 'Ticket', color: '#4caf50', icon: TicketIcon },
  'User Story': { label: 'User Story', color: '#2196f3', icon: UserStoryIcon },
};

export function TaskViewModal({ open, task, onClose }: TaskViewModalProps) {
  const { config, getConfig } = useAzureDevOps();
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
          const response = await window.electronAPI.task.findById(task.id);
          if (response.success && response.data) {
            setTaskWithHierarchy(response.data);
            
            // Load breadcrumb for navigation
            const breadcrumbResponse = await window.electronAPI.hierarchy.buildBreadcrumb(task.id);
            if (breadcrumbResponse.success && breadcrumbResponse.data) {
              setBreadcrumbItems(breadcrumbResponse.data);
            }
          } else {
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
    try {
      const response = await window.electronAPI.task.findById(clickedTask.id);
      if (response.success && response.data) {
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
    try {
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

  // Proxy external images through main process (adds Azure DevOps auth)
  const descriptionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = descriptionRef.current;
    if (!container || !open) return;

    const imgs = container.querySelectorAll<HTMLImageElement>('img[src^="https://"]');
    imgs.forEach((img) => {
      const originalSrc = img.getAttribute('src');
      if (!originalSrc) return;
      // Skip already-proxied data URIs
      if (originalSrc.startsWith('data:')) return;

      img.alt = img.alt || 'image';
      img.style.opacity = '0.4';

      window.electronAPI.azureDevOps
        .proxyImage(originalSrc)
        .then((res) => {
          if (res.success && res.data) {
            img.src = res.data;
            img.style.opacity = '1';
          }
        })
        .catch(() => {
          // Keep original src — CSP may block it but nothing else we can do
          img.style.opacity = '1';
        });
    });
  }, [open, displayTask?.description]);

  if (!task) return null;

  const hasHierarchy =
    displayTask.parent ||
    (displayTask.children && displayTask.children.length > 0);

  const priority =
    priorityConfig[displayTask.priority] || priorityConfig.medium;
  const status = {
    label: displayTask.status,
    color: getStatusColor(displayTask.status),
  };
  const type = typeConfigMap[displayTask.type] || {
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
                          ref={descriptionRef}
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
                  {displayTask.origin === 'azure_devops' && (displayTask.areaPath || displayTask.iterationPath) && (
                    <>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <CloudIcon fontSize="small" color="action" />
                          <Typography variant="subtitle2" fontWeight={600}>
                            Azure DevOps
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={2}>
                          {displayTask.areaPath && (
                            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', flex: 1 }}>
                              <Typography variant="caption" color="text.secondary" display="block">Area Path</Typography>
                              <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {displayTask.areaPath}
                              </Typography>
                            </Paper>
                          )}
                          {displayTask.iterationPath && (
                            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default', flex: 1 }}>
                              <Typography variant="caption" color="text.secondary" display="block">Iteration Path</Typography>
                              <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                {displayTask.iterationPath}
                              </Typography>
                            </Paper>
                          )}
                        </Stack>
                      </Box>
                      <Divider />
                    </>
                  )}

                </Stack>
              </Box>

              {/* Sidebar - Right Side */}
              <Box
                sx={{
                  flex: { xs: '1 1 auto', md: '0 0 34%' },
                  p: 2.5,
                  bgcolor: 'background.default',
                  overflowY: 'auto',
                }}
              >
                <Stack spacing={2}>
                  {/* Status + Priority + Type row */}
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        STATUS
                      </Typography>
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
                    <Stack direction="row" spacing={1}>
                      <Box flex={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                          TIPO
                        </Typography>
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
                      <Box flex={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                          PRIORIDADE
                        </Typography>
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
                    </Stack>
                  </Stack>

                  <Divider />

                  {/* Assignee */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                      RESPONSÁVEL
                    </Typography>
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
                            <Typography variant="caption" color="text.secondary">
                              {displayTask.assignedToEmail}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Não atribuído
                      </Typography>
                    )}
                  </Box>

                  <Divider />

                  {/* Sprint + Team row */}
                  <Stack direction="row" spacing={2}>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        SPRINT
                      </Typography>
                      {displayTask.sprint ? (
                        <Tooltip title={`${formatDate(displayTask.sprint.startDate)} - ${formatDate(displayTask.sprint.endDate)}`}>
                          <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.paper', cursor: 'help' }}>
                            <Typography variant="body2" fontWeight={500} noWrap>
                              {displayTask.sprint.name}
                            </Typography>
                          </Paper>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">Sem sprint</Typography>
                      )}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        EQUIPE
                      </Typography>
                      {displayTask.team ? (
                        <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.paper' }}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {displayTask.team.name}
                          </Typography>
                        </Paper>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">Sem equipe</Typography>
                      )}
                    </Box>
                  </Stack>

                  {/* Story Points */}
                  {displayTask.storyPoints !== undefined && displayTask.storyPoints !== null && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                          STORY POINTS
                        </Typography>
                        <Typography variant="h5" fontWeight={700} color="primary">
                          {displayTask.storyPoints}
                        </Typography>
                      </Box>
                    </>
                  )}

                  <Divider />

                  {/* Período */}
                  <Stack direction="row" spacing={2}>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        INÍCIO
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatDate(displayTask.startDate)}
                      </Typography>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        TÉRMINO
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatDate(displayTask.endDate)}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider />

                  {/* Datas Azure DevOps */}
                  {displayTask.origin === 'azure_devops' && (
                    <Stack direction="row" spacing={2}>
                      <Box flex={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                          CRIADO (AZURE)
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDateTime(displayTask.azureCreatedDate)}
                        </Typography>
                      </Box>
                      <Box flex={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                          ATUALIZADO (AZURE)
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDateTime(displayTask.azureChangedDate)}
                        </Typography>
                      </Box>
                    </Stack>
                  )}

                  {/* Datas locais */}
                  <Stack direction="row" spacing={2} sx={{ opacity: displayTask.origin === 'azure_devops' ? 0.5 : 1 }}>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        CRIADO (LOCAL)
                      </Typography>
                      <Typography variant="body2">
                        {formatDateTime(displayTask.createdAt)}
                      </Typography>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        ATUALIZADO (LOCAL)
                      </Typography>
                      <Typography variant="body2">
                        {formatDateTime(displayTask.updatedAt)}
                      </Typography>
                    </Box>
                  </Stack>
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
