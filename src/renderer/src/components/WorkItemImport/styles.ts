import styled from 'styled-components';
import { Box, Stack, TableRow } from '@mui/material';

export const ImportContainer = styled(Box)`
  background-color: ${({ theme }) => theme.COLORS.surface};
  border-radius: 1rem;
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  padding: 1.5rem;
`;

export const FiltersSection = styled(Stack).attrs({
  direction: 'row',
  spacing: 2,
  alignItems: 'center',
  flexWrap: 'wrap',
})`
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: ${({ theme }) => theme.COLORS.background};
  border-radius: 0.5rem;

  @media ${({ theme }) => theme.SIZES.xs} {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const WorkItemRow = styled(TableRow)`
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.COLORS.background};
  }

  &.Mui-selected {
    background-color: ${({ theme }) => theme.COLORS.primary_100};

    &:hover {
      background-color: ${({ theme }) => theme.COLORS.primary_100};
    }
  }
`;

export const WorkItemTypeIcon = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
`;
