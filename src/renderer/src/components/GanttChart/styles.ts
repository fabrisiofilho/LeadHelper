import styled from 'styled-components';
import { Box } from '@mui/material';

export const GanttContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: ${({ theme }) => theme.COLORS.surface};
  border-radius: 0.75rem;
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  overflow: hidden;
`;

export const GanttHeader = styled(Box)`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.COLORS.border};
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
`;

export const GanttContent = styled(Box)`
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  min-height: 200px;
`;

export const RowLabelsContainer = styled(Box)`
  flex-shrink: 0;
  min-width: 180px;
  max-width: 220px;
  border-right: 1px solid ${({ theme }) => theme.COLORS.border};
  background-color: ${({ theme }) => theme.COLORS.surface};
`;

export const RowLabelHeader = styled(Box)`
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: ${({ theme }) => theme.COLORS.textSecondary};
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-bottom: 1px solid ${({ theme }) => theme.COLORS.border};
`;

export const RowLabel = styled(Box)`
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.COLORS.text};
  border-bottom: 1px solid ${({ theme }) => theme.COLORS.border};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:last-child {
    border-bottom: none;
  }
`;

export const TimelineContainer = styled(Box)`
  flex: 1;
  overflow-x: auto;
  min-width: 0;
`;

export const TimelineHeader = styled(Box)`
  display: flex;
  height: 40px;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-bottom: 1px solid ${({ theme }) => theme.COLORS.border};
`;

export const TimelineCell = styled(Box)<{ $width: number; $isToday?: boolean }>`
  flex-shrink: 0;
  width: ${({ $width }) => $width}px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: ${({ $isToday }) => ($isToday ? 700 : 500)};
  color: ${({ theme, $isToday }) =>
    $isToday ? theme.COLORS.primary : theme.COLORS.textSecondary};
  border-right: 1px solid ${({ theme }) => theme.COLORS.border};
  background-color: ${({ theme, $isToday }) =>
    $isToday ? `${theme.COLORS.primary}15` : 'transparent'};

  &:last-child {
    border-right: none;
  }
`;

export const TimelineRow = styled(Box)`
  position: relative;
  height: 48px;
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.COLORS.border};

  &:last-child {
    border-bottom: none;
  }
`;

export const TimelineGridCell = styled(Box)<{
  $width: number;
  $isWeekend?: boolean;
  $isToday?: boolean;
}>`
  flex-shrink: 0;
  width: ${({ $width }) => $width}px;
  height: 100%;
  border-right: 1px solid ${({ theme }) => theme.COLORS.border};
  background-color: ${({ theme, $isWeekend, $isToday }) =>
    $isToday
      ? `${theme.COLORS.primary}10`
      : $isWeekend
        ? theme.COLORS.surfaceAlt
        : 'transparent'};
  ${({ theme, $isToday }) =>
    $isToday &&
    `
    border-left: 2px solid ${theme.COLORS.primary};
    border-right: 2px solid ${theme.COLORS.primary};
  `}

  &:last-child {
    border-right: none;
  }
`;

export const GanttBar = styled(Box)<{
  $color: string;
  $left: number;
  $width: number;
}>`
  position: absolute;
  top: 8px;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => Math.max($width, 20)}px;
  height: 32px;
  background-color: ${({ $color }) => $color};
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
  z-index: 1;
  overflow: hidden;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 2;
  }
`;

export const BarLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 8px;
`;

export const EmptyState = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;

export const TooltipContent = styled(Box)`
  padding: 0.5rem;
  font-size: 0.875rem;
`;

export const TooltipRow = styled(Box)`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.25rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const TooltipLabel = styled.span`
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;

export const TooltipValue = styled.span`
  font-weight: 500;
`;
