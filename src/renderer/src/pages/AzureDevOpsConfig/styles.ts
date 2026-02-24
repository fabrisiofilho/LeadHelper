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

export const ConfigCard = styled(Box)`
  background-color: ${({ theme }) => theme.COLORS.surface};
  border-radius: 1rem;
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  padding: 1.5rem;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
`;

export const FormContainer = styled(Stack).attrs({
  spacing: 2,
})`
  padding: 0.5rem 0;
`;

export const ConnectionStatus = styled(Box)<{ $connected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: ${({ theme, $connected }) =>
    $connected ? theme.COLORS.success_100 : theme.COLORS.warn_100};
  color: ${({ theme, $connected }) =>
    $connected ? theme.COLORS.success : theme.COLORS.warn};
  font-size: 0.875rem;
  font-weight: 500;
`;
