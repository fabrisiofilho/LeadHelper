import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Paper,
  Collapse,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  AccountTree as HierarchyIcon,
  Assignment as TaskIcon,
  AssignmentTurnedIn as TaskTypeIcon,
  BugReport as BugIcon,
  EmojiEvents as FeatureIcon,
  Diamond as ImprovementIcon,
  LocalFireDepartment as TicketIcon,
  MenuBook as UserStoryIcon,
  MilitaryTech as EpicIcon,
  DirectionsCar as RoadmapIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import type { Task } from '@shared/interfaces/config/index.types';
import { getStatusColor } from '@shared/constants/status-colors';

interface TaskHierarchyProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
  level?: number;
  maxLevel?: number;
}

const typeConfigMap: Record<
  string,
  { label: string; color: string; icon: typeof TaskIcon }
> = {
  Epic: { label: 'Epic', color: '#ff8c00', icon: EpicIcon },
  Feature: { label: 'Feature', color: '#9c27b0', icon: FeatureIcon },
  Improvement: {
    label: 'Improvement',
    color: '#e91e63',
    icon: ImprovementIcon,
  },
  Rework: { label: 'Rework', color: '#d32f2f', icon: BugIcon },
  Bug: { label: 'Bug', color: '#d32f2f', icon: BugIcon },
  Roadmap: { label: 'Roadmap', color: '#424242', icon: RoadmapIcon },
  Task: { label: 'Task', color: '#c8a415', icon: TaskTypeIcon },
  Ticket: { label: 'Ticket', color: '#4caf50', icon: TicketIcon },
  'User Story': { label: 'User Story', color: '#2196f3', icon: UserStoryIcon },
};

function getTypeConfig(type?: string) {
  if (!type) return { label: 'Desconhecido', color: '#9e9e9e', icon: TaskIcon };
  return (
    typeConfigMap[type] || { label: type, color: '#2196f3', icon: TaskIcon }
  );
}

function TaskHierarchyItem({
  task,
  onTaskClick,
  level = 0,
  maxLevel = 5,
  currentTaskId,
}: TaskHierarchyProps & { currentTaskId?: number }) {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels

  const hasChildren = task.children && task.children.length > 0;
  const canExpand = hasChildren && level < maxLevel;
  const isCurrentTask = currentTaskId === task.id;

  const type = getTypeConfig(task.type);
  const TypeIcon = type.icon;
  const statusColor = getStatusColor(task.status);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onTaskClick) {
        onTaskClick(task);
      }
    },
    [task, onTaskClick],
  );

  const indentSize = level * 24;

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          ml: `${indentSize}px`,
          mb: 0.5,
          p: 1.5,
          cursor: onTaskClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          borderLeft: `4px solid ${type.color}`,
          bgcolor: isCurrentTask ? alpha(type.color, 0.1) : 'background.paper',
          borderColor: isCurrentTask ? type.color : 'divider',
          borderWidth: isCurrentTask ? 2 : 1,
          '&:hover': onTaskClick
            ? {
                bgcolor: alpha(type.color, 0.15),
                transform: 'translateX(4px)',
                boxShadow: 2,
              }
            : {},
        }}
        onClick={handleClick}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Expand/Collapse Button */}
          {canExpand ? (
            <IconButton
              size="small"
              onClick={handleToggle}
              sx={{
                p: 0.5,
                transition: 'transform 0.2s',
                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          ) : (
            <Box sx={{ width: 28 }} /> // Spacer for alignment
          )}

          {/* Type Icon */}
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: alpha(type.color, isCurrentTask ? 0.2 : 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: type.color,
              flexShrink: 0,
            }}
          >
            <TypeIcon fontSize="small" />
          </Box>

          {/* Task Info */}
          <Box flex={1} minWidth={0}>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
              <Typography
                variant="body2"
                fontWeight={isCurrentTask ? 700 : 600}
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.title}
              </Typography>
              {task.externalId && (
                <Chip
                  label={`#${task.externalId}`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: alpha(type.color, 0.1),
                    color: type.color,
                  }}
                />
              )}
              {isCurrentTask && (
                <Chip
                  label="Atual"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    bgcolor: type.color,
                    color: 'white',
                  }}
                />
              )}
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <Chip
                label={type.label}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: alpha(type.color, 0.1),
                  color: type.color,
                  fontWeight: 500,
                }}
              />
              <Chip
                label={task.status}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  bgcolor: statusColor,
                  color: '#fff',
                  fontWeight: 500,
                }}
              />
              {task.storyPoints !== undefined && task.storyPoints !== null && (
                <Chip
                  label={`${task.storyPoints} pts`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                  }}
                />
              )}
              {hasChildren && (
                <Chip
                  label={`${task.children!.length} ${task.children!.length === 1 ? 'filho' : 'filhos'}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                  }}
                />
              )}
              {task.assignedToName && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.7rem' }}
                >
                  {task.assignedToName}
                </Typography>
              )}
            </Stack>
          </Box>

          {/* Open Button */}
          {onTaskClick && !isCurrentTask && (
            <Tooltip title="Ver detalhes">
              <IconButton size="small" sx={{ flexShrink: 0 }}>
                <OpenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Paper>

      {/* Children */}
      {canExpand && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 0.5 }}>
            {task.children!.map((child) => (
              <TaskHierarchyItem
                key={child.id}
                task={child}
                onTaskClick={onTaskClick}
                level={level + 1}
                maxLevel={maxLevel}
                currentTaskId={currentTaskId}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

export function TaskHierarchy({
  task,
  onTaskClick,
  level = 0,
  maxLevel = 5,
}: TaskHierarchyProps) {
  // Check if task has parent or children
  const hasHierarchy =
    task.parent || (task.children && task.children.length > 0);

  if (!hasHierarchy) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          bgcolor: 'background.default',
          textAlign: 'center',
        }}
      >
        <Stack spacing={2} alignItems="center">
          <HierarchyIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary" fontStyle="italic">
            Esta tarefa não possui hierarquia (sem pai ou filhos)
          </Typography>
        </Stack>
      </Paper>
    );
  }

  // Find root task (walk up the parent chain)
  let rootTask = task;
  let depth = 0;
  while (rootTask.parent && depth < 10) {
    rootTask = rootTask.parent;
    depth++;
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <HierarchyIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={600} color="primary">
          Hierarquia Completa
        </Typography>
        {task.id !== rootTask.id && (
          <Chip
            label={`${depth} nível${depth > 1 ? 'is' : ''} acima`}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )}
      </Stack>

      <Box
        sx={{
          maxHeight: 500,
          overflowY: 'auto',
          overflowX: 'hidden',
          pr: 1,
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'background.default',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 4,
            '&:hover': {
              bgcolor: 'text.secondary',
            },
          },
        }}
      >
        <TaskHierarchyItem
          task={rootTask}
          onTaskClick={onTaskClick}
          level={0}
          maxLevel={maxLevel}
          currentTaskId={task.id}
        />
      </Box>

      {task.id !== rootTask.id && (
        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: alpha('#2196f3', 0.05),
            borderColor: 'primary.main',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <ChevronRightIcon fontSize="small" color="primary" />
            <Typography variant="caption" color="primary" fontWeight={600}>
              Você está visualizando: {task.title}
            </Typography>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

export default TaskHierarchy;
