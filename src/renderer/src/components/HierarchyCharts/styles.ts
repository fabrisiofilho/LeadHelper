import styled from 'styled-components';
import { Box, Stack } from '@mui/material';

export const ChartsContainer = styled(Box)`
  width: 100%;
  margin-bottom: 1rem;
`;

export const ChartSection = styled(Box)`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ChartTitle = styled(Box)`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.COLORS.text};
  margin-bottom: 0.75rem;
`;

export const ChartWrapper = styled(Box)<{ $height?: number }>`
  width: 100%;
  height: ${({ $height }) => ($height ? `${$height}px` : '200px')};
`;

export const ProgressBarContainer = styled(Box)`
  width: 100%;
`;

export const ProgressBarWrapper = styled(Box)`
  width: 100%;
  height: 24px;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-radius: 12px;
  overflow: hidden;
  position: relative;
`;

export const ProgressBarFill = styled(Box)<{ $percentage: number }>`
  height: 100%;
  width: ${({ $percentage }) => Math.min($percentage, 100)}%;
  background: ${({ theme }) => theme.COLORS.success};
  border-radius: 12px;
  transition: width 0.3s ease;
`;

export const ProgressBarText = styled(Box)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.COLORS.text};
`;

export const ProgressStats = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  margin-top: 0.5rem;
`;

export const EmptyChartMessage = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-radius: 0.5rem;
  min-height: 100px;
  color: ${({ theme }) => theme.COLORS.grey_500};
  font-size: 0.875rem;
`;

export const LegendContainer = styled(Stack).attrs({
  direction: 'row',
  flexWrap: 'wrap',
})`
  margin-top: 0.75rem;
  gap: 1rem;
`;

export const LegendItem = styled(Stack).attrs({
  direction: 'row',
  alignItems: 'center',
})`
  gap: 0.375rem;
`;

export const LegendColorBox = styled(Box)<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background-color: ${({ $color }) => $color};
`;
