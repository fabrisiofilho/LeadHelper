import { type FC } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import GroupIcon from '@mui/icons-material/Group';
import styled from 'styled-components';
import { rgba } from 'polished';
import { Task } from '@shared/interfaces/config/index.types';

/**
 * Props for the SimplifiedCard component.
 *
 * Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */
export interface SimplifiedCardProps {
  task: Task;
  childrenCount?: number;
  parentTitle?: string;
  showEnterButton?: boolean;
  showBackButton?: boolean;
  onEnter?: (taskId: number) => void;
  onBack?: () => void;
  onCardClick?: (task: Task) => void;
}

// Work item type color mapping (Property 35)
type WorkItemType =
  | 'Bug'
  | 'Task'
  | 'User Story'
  | 'Feature'
  | 'Improvement'
  | 'Ticket'
  | 'Epic'
  | string;

const getTypeColor = (type: WorkItemType): string => {
  const typeColors: Record<string, string> = {
    Bug: '#FF5630', // red
    Task: '#135bec', // blue
    'User Story': '#36B37E', // green
    Feature: '#8C65E2', // purple
    Improvement: '#FFAB00', // orange
    Ticket: '#FFAB00', // orange
    Epic: '#8C65E2', // purple
  };
  return typeColors[type] || '#919EAB'; // default grey
};

// Status color mapping (Property 36)
type StatusType =
  | 'New'
  | 'To Do'
  | 'Active'
  | 'In Progress'
  | 'Resolved'
  | 'Done'
  | 'Closed'
  | string;

const getStatusColor = (status: StatusType): { bg: string; text: string } => {
  const normalizedStatus = status?.toLowerCase() || '';

  if (normalizedStatus === 'new' || normalizedStatus === 'to do') {
    return { bg: '#919EAB', text: '#FFFFFF' }; // grey
  }
  if (normalizedStatus === 'active' || normalizedStatus === 'in progress') {
    return { bg: '#135bec', text: '#FFFFFF' }; // blue
  }
  if (normalizedStatus === 'resolved' || normalizedStatus === 'done') {
    return { bg: '#36B37E', text: '#FFFFFF' }; // green
  }
  if (normalizedStatus === 'closed') {
    return { bg: '#4c669a', text: '#FFFFFF' }; // dark grey
  }
  return { bg: '#919EAB', text: '#FFFFFF' }; // default grey
};

// Styled components
const CardContainer = styled.div<{ $typeColor: string }>`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: ${({ theme }) => theme.COLORS.surface};
  border-left: 4px solid ${({ $typeColor }) => $typeColor};
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    box-shadow: ${({ theme }) => theme.SHADOWS.z_08};
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.COLORS.text};
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const CardId = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.COLORS.textSecondary};
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const StatusBadge = styled.span<{ $bgColor: string; $textColor: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  background-color: ${({ $bgColor }) => $bgColor};
  color: ${({ $textColor }) => $textColor};
`;

const AssigneeName = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;

const ParentBreadcrumb = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.COLORS.grey_500};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
`;

const ChildrenBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  background-color: ${({ theme }) => rgba(theme.COLORS.primary, 0.12)};
  color: ${({ theme }) => theme.COLORS.primary};

  svg {
    font-size: 0.875rem;
  }
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
`;

const ActionButton = styled(IconButton)`
  padding: 0.375rem;

  &:hover {
    background-color: ${({ theme }) => theme.COLORS.primary_100};
  }

  svg {
    font-size: 1.125rem;
  }
`;

const TypeBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  background-color: ${({ $color }) => rgba($color, 0.12)};
  color: ${({ $color }) => $color};
`;

/**
 * Truncates a title to a maximum length with ellipsis.
 */
const truncateTitle = (title: string, maxLength: number = 30): string => {
  if (title.length <= maxLength) return title;
  return `${title.substring(0, maxLength - 3)}...`;
};

/**
 * SimplifiedCard component for displaying work items in a compact format.
 *
 * Features:
 * - Displays title, ID, status, assignee and parent breadcrumb
 * - Shows children count badge when item has children (Property 6)
 * - Shows "Entrar" button when item has children (Property 34)
 * - Shows "Subir" button when viewing children (Property 34)
 * - Color coding by work item type (Property 35)
 * - Color coding by status (Property 36)
 *
 * Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */
export const SimplifiedCard: FC<Readonly<SimplifiedCardProps>> = ({
  task,
  childrenCount = 0,
  parentTitle,
  showEnterButton = false,
  showBackButton = false,
  onEnter,
  onBack,
  onCardClick,
}) => {
  const workItemType = task.type || 'Task';
  const typeColor = getTypeColor(workItemType);
  const statusColors = getStatusColor(task.status);
  const hasChildren = childrenCount > 0;

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(task);
    }
  };

  const handleEnterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEnter) {
      onEnter(task.id);
    }
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBack) {
      onBack();
    }
  };

  return (
    <CardContainer
      $typeColor={typeColor}
      onClick={handleCardClick}
      role="article"
      aria-label={`Work item: ${task.title}`}
    >
      <CardHeader>
        <CardInfo>
          {task.externalId && <CardId>#{task.externalId}</CardId>}
          <CardTitle title={task.title}>{task.title}</CardTitle>
          {parentTitle && (
            <ParentBreadcrumb title={parentTitle}>
              ↳ {truncateTitle(parentTitle)}
            </ParentBreadcrumb>
          )}
        </CardInfo>

        <CardActions>
          {/* Property 34: Show "Subir" button when viewing children */}
          {showBackButton && (
            <Tooltip title="Subir" arrow>
              <ActionButton
                onClick={handleBackClick}
                aria-label="Voltar para o item pai"
                size="small"
              >
                <ArrowUpwardIcon />
              </ActionButton>
            </Tooltip>
          )}

          {/* Property 34: Show "Entrar" button when item has children */}
          {showEnterButton && hasChildren && (
            <Tooltip title="Entrar" arrow>
              <ActionButton
                onClick={handleEnterClick}
                aria-label={`Ver ${childrenCount} itens filhos`}
                size="small"
              >
                <LoginIcon />
              </ActionButton>
            </Tooltip>
          )}
        </CardActions>
      </CardHeader>

      <CardMeta>
        {/* Property 35: Type badge with color coding */}
        <TypeBadge $color={typeColor}>{workItemType}</TypeBadge>

        {/* Property 36: Status badge with color coding */}
        <StatusBadge $bgColor={statusColors.bg} $textColor={statusColors.text}>
          {task.status}
        </StatusBadge>

        {/* Assignee name */}
        {task.assignedToName && (
          <AssigneeName title={task.assignedToName}>
            {task.assignedToName}
          </AssigneeName>
        )}

        {/* Property 6: Children count badge */}
        {hasChildren && (
          <ChildrenBadge title={`${childrenCount} itens filhos`}>
            <GroupIcon />
            {childrenCount}
          </ChildrenBadge>
        )}
      </CardMeta>
    </CardContainer>
  );
};

export default SimplifiedCard;
