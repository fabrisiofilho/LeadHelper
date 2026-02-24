import styled from 'styled-components';
import { Box, Stack } from '@mui/material';
export const ChartContainer = styled(Box)<{ $maxHeight?: number }>`
  max-height: ${({ $maxHeight }) => ($maxHeight ? `${$maxHeight}px` : '300px')};
  overflow-y: auto;
  padding-right: 0.5rem;
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.COLORS.surfaceAlt};
    border-radius: 2px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.COLORS.grey_400};
    border-radius: 2px;
  }
`;
export const CategoryItem = styled(Box)`
  margin-bottom: 1rem;
  &:last-child {
    margin-bottom: 0;
  }
`;
export const CategoryBar = styled(Box)<{
  $percentage: number;
  $color?: string;
}>`
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  overflow: hidden;
  margin-top: 0.5rem;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $percentage }) => Math.min($percentage, 100)}%;
    background: ${({ $color, theme }) =>
      $color || theme.COLORS.primary_gradient};
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`;
export const CategoryInfo = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  gap: 1rem;
`;
export const CategoryColorIndicator = styled(Box)<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  flex-shrink: 0;
`;
export const CategoryItemWithColor = styled(Stack).attrs({
  direction: 'row',
  alignItems: 'center',
})`
  flex: 1;
  min-width: 0;
  gap: 0.5rem;
`;
export const BarChartContainer = styled(Box)`
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.COLORS.border};
  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
`;
export const HorizontalBar = styled(Box)<{
  $percentage: number;
  $color: string;
}>`
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  overflow: hidden;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $percentage }) => Math.min($percentage, 100)}%;
    background-color: ${({ $color }) => $color};
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`;
export const LegendContainer = styled(Stack).attrs({
  direction: 'row',
  flexWrap: 'wrap',
})`
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.COLORS.border};
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
export const EmptyChartState = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-radius: 0.5rem;
  min-height: 150px;
`;
export const PeriodHeader = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  margin-bottom: 0.5rem;
`;
export const ComparisonBarsContainer = styled(Stack)`
  gap: 0.375rem;
`;
export const ComparisonRow = styled(Stack).attrs({
  direction: 'row',
  alignItems: 'center',
})`
  gap: 0.5rem;
`;
export const ComparisonLabel = styled(Box)`
  width: 70px;
  flex-shrink: 0;
  padding-right: 0.5rem;
`;
export const ComparisonBarWrapper = styled(Box)`
  flex: 1;
  height: 8px;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-radius: 4px;
  overflow: hidden;
  min-width: 50px;
`;
export const ComparisonValue = styled(Box)`
  width: 100px;
  text-align: right;
  flex-shrink: 0;
  padding-left: 0.5rem;
`;
