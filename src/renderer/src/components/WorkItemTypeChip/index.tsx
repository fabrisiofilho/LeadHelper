import { type FC } from 'react';
import { Chip, type SxProps, type Theme } from '@mui/material';
import {
  AssignmentTurnedIn as TaskIcon,
  BugReport as BugIcon,
  EmojiEvents as FeatureIcon,
  MenuBook as UserStoryIcon,
  Diamond as ImprovementIcon,
  LocalFireDepartment as TicketIcon,
  MilitaryTech as EpicIcon,
  DirectionsCar as RoadmapIcon,
} from '@mui/icons-material';

interface TypeConfig {
  color: string;
  icon: React.ReactElement;
}

const ICON_SX = { fontSize: 14, color: '#fff !important' } as const;

const TYPE_CONFIG: Record<string, TypeConfig> = {
  Epic: { color: '#ff8c00', icon: <EpicIcon sx={ICON_SX} /> },
  Feature: { color: '#9c27b0', icon: <FeatureIcon sx={ICON_SX} /> },
  Improvement: { color: '#e91e63', icon: <ImprovementIcon sx={ICON_SX} /> },
  Rework: { color: '#d32f2f', icon: <BugIcon sx={ICON_SX} /> },
  Bug: { color: '#d32f2f', icon: <BugIcon sx={ICON_SX} /> },
  Roadmap: { color: '#424242', icon: <RoadmapIcon sx={ICON_SX} /> },
  Task: { color: '#c8a415', icon: <TaskIcon sx={ICON_SX} /> },
  Ticket: { color: '#4caf50', icon: <TicketIcon sx={ICON_SX} /> },
  'User Story': { color: '#2196f3', icon: <UserStoryIcon sx={ICON_SX} /> },
};

const DEFAULT_CONFIG: TypeConfig = {
  color: '#757575',
  icon: <TaskIcon sx={ICON_SX} />,
};

export function getWorkItemTypeConfig(type: string): TypeConfig {
  return TYPE_CONFIG[type] ?? DEFAULT_CONFIG;
}

interface WorkItemTypeChipProps {
  type: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export const WorkItemTypeChip: FC<WorkItemTypeChipProps> = ({
  type,
  size = 'small',
  sx,
}) => {
  const config = TYPE_CONFIG[type] ?? DEFAULT_CONFIG;
  return (
    <Chip
      icon={config.icon}
      label={type}
      size={size}
      sx={{
        fontWeight: 600,
        fontSize: '0.65rem',
        height: 20,
        bgcolor: config.color,
        color: '#fff',
        ...sx,
      }}
    />
  );
};
