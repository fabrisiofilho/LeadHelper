import styled from 'styled-components';
import { Box, Stack, LinearProgress } from '@mui/material';
export const GoalProgressContainer = styled(Box)<{ $compact?: boolean }>`
  padding: ${({ $compact }) => ($compact ? '0.75rem' : '1rem')};
  border-radius: ${({ $compact }) => ($compact ? '0.5rem' : '0.75rem')};
  background-color: ${({ theme }) => theme.COLORS.surface};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
`;
export const GoalHeader = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  margin-bottom: 0.5rem;
`;
export const GoalName = styled.h4<{ $compact?: boolean }>`
  font-size: ${({ $compact }) => ($compact ? '0.875rem' : '1rem')};
  font-weight: 600;
  margin: 0;
  color: ${({ theme }) => theme.COLORS.text};
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
export const PercentageBadge = styled.span<{ $percentage: number }>`
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: ${({ theme, $percentage }) =>
    $percentage >= 100
      ? theme.COLORS.success_100
      : $percentage >= 75
        ? theme.COLORS.primary_100
        : $percentage >= 50
          ? theme.COLORS.info_100
          : $percentage >= 25
            ? theme.COLORS.warn_100
            : theme.COLORS.surfaceAlt};
  color: ${({ theme, $percentage }) =>
    $percentage >= 100
      ? theme.COLORS.success_300
      : $percentage >= 75
        ? theme.COLORS.primary_300
        : $percentage >= 50
          ? theme.COLORS.info_300
          : $percentage >= 25
            ? theme.COLORS.warn_300
            : theme.COLORS.textSecondary};
`;
export const StyledProgressBar = styled(LinearProgress)<{
  $percentage: number;
}>`
  height: ${({ $percentage }) => ($percentage >= 100 ? '12px' : '10px')};
  border-radius: 6px;
  margin: 0.5rem 0;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  .MuiLinearProgress-bar {
    border-radius: 6px;
    background-color: ${({ theme, $percentage }) =>
      $percentage >= 100
        ? theme.COLORS.success
        : $percentage >= 75
          ? theme.COLORS.primary
          : $percentage >= 50
            ? theme.COLORS.info
            : $percentage >= 25
              ? theme.COLORS.warn
              : theme.COLORS.grey_500};
    transition: transform 0.4s ease;
  }
`;
export const ValuesContainer = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  margin-top: 0.5rem;
`;
export const ValueItem = styled(Box)<{ $align?: 'left' | 'right' | 'center' }>`
  text-align: ${({ $align }) => $align || 'left'};
`;
export const ValueLabel = styled.span<{ $compact?: boolean }>`
  font-size: ${({ $compact }) => ($compact ? '0.625rem' : '0.75rem')};
  font-weight: 500;
  color: ${({ theme }) => theme.COLORS.textSecondary};
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;
export const ValueAmount = styled.span<{
  $variant?: 'current' | 'target' | 'remaining';
  $compact?: boolean;
}>`
  font-size: ${({ $compact }) => ($compact ? '0.875rem' : '1rem')};
  font-weight: 600;
  color: ${({ theme, $variant }) =>
    $variant === 'current'
      ? theme.COLORS.primary
      : $variant === 'remaining'
        ? theme.COLORS.warn
        : theme.COLORS.text};
`;
export const RemainingContainer = styled(Box)<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-top: ${({ $compact }) => ($compact ? '0.5rem' : '0.75rem')};
  padding: ${({ $compact }) =>
    $compact ? '0.375rem 0.5rem' : '0.5rem 0.75rem'};
  border-radius: 0.5rem;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
`;
export const RemainingText = styled.span<{ $compact?: boolean }>`
  font-size: ${({ $compact }) => ($compact ? '0.75rem' : '0.875rem')};
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;
export const RemainingValue = styled.span<{ $compact?: boolean }>`
  font-size: ${({ $compact }) => ($compact ? '0.75rem' : '0.875rem')};
  font-weight: 600;
  color: ${({ theme }) => theme.COLORS.warn_300};
`;
export const CompletedBadge = styled(Box)<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-top: ${({ $compact }) => ($compact ? '0.5rem' : '0.75rem')};
  padding: ${({ $compact }) =>
    $compact ? '0.375rem 0.5rem' : '0.5rem 0.75rem'};
  border-radius: 0.5rem;
  background-color: ${({ theme }) => theme.COLORS.success_100};
  color: ${({ theme }) => theme.COLORS.success_300};
  font-size: ${({ $compact }) => ($compact ? '0.75rem' : '0.875rem')};
  font-weight: 600;
  svg {
    font-size: ${({ $compact }) => ($compact ? '0.875rem' : '1rem')};
  }
`;
export const DeadlineInfo = styled(Box)<{
  $urgent?: boolean;
  $compact?: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: ${({ $compact }) => ($compact ? '0.375rem' : '0.5rem')};
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: ${({ theme, $urgent }) =>
    $urgent ? theme.COLORS.warn_100 : theme.COLORS.info_100};
  color: ${({ theme, $urgent }) =>
    $urgent ? theme.COLORS.warn_300 : theme.COLORS.info_300};
  font-size: ${({ $compact }) => ($compact ? '0.625rem' : '0.75rem')};
  font-weight: 500;
  width: fit-content;
  svg {
    font-size: ${({ $compact }) => ($compact ? '0.75rem' : '0.875rem')};
  }
`;
