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
  Epic: { color: '#EA580C', icon: <EpicIcon sx={ICON_SX} /> },
  Feature: { color: '#7C3AED', icon: <FeatureIcon sx={ICON_SX} /> },
  Improvement: { color: '#DB2777', icon: <ImprovementIcon sx={ICON_SX} /> },
  Rework: { color: '#DC2626', icon: <BugIcon sx={ICON_SX} /> },
  Bug: { color: '#DC2626', icon: <BugIcon sx={ICON_SX} /> },
  Roadmap: { color: '#475569', icon: <RoadmapIcon sx={ICON_SX} /> },
  Task: { color: '#CA8A04', icon: <TaskIcon sx={ICON_SX} /> },
  Ticket: { color: '#16A34A', icon: <TicketIcon sx={ICON_SX} /> },
  'User Story': { color: '#2563EB', icon: <UserStoryIcon sx={ICON_SX} /> },
};

const DEFAULT_CONFIG: TypeConfig = {
  color: '#64748B',
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
        bgcolor: config.color,
        color: '#fff',
        ...sx,
      }}
    />
  );
};
