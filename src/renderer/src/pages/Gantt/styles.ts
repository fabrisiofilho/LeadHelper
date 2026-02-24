import styled from 'styled-components';
import { Box, Stack } from '@mui/material';

export const PageContainer = styled(Box)`
  padding: 1.5rem;
  min-height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  background-color: ${({ theme }) => theme.COLORS.background};

  @media ${({ theme }) => theme.SIZES.xs} {
    padding: 1rem;
  }
`;

export const PlaceholderContent = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background-color: ${({ theme }) => theme.COLORS.surface};
  border-radius: 1rem;
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
`;

export const FiltersContainer = styled(Stack).attrs({
  direction: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  useFlexGap: true,
})`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: ${({ theme }) => theme.COLORS.surface};
  border-radius: 0.75rem;
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  gap: 1rem;

  @media ${({ theme }) => theme.SIZES.md} {
    gap: 0.875rem;
  }

  @media ${({ theme }) => theme.SIZES.sm} {
    gap: 0.75rem;
  }

  @media ${({ theme }) => theme.SIZES.xs} {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  & > * {
    flex-shrink: 0;
  }
`;

export const GanttWrapper = styled(Box)`
  background-color: ${({ theme }) => theme.COLORS.surface};
  border-radius: 1rem;
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  padding: 1rem;
  overflow-x: auto;
`;

export const QuickNavContainer = styled(Stack).attrs({
  direction: 'row',
  spacing: 1,
})`
  @media ${({ theme }) => theme.SIZES.xs} {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;
