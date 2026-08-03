import styled from 'styled-components';
import { Box, Stack } from '@mui/material';
export type AccountTypeVariant =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'wallet';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAccountTypeColors = (theme: any, type: AccountTypeVariant) => {
  const colors = {
    checking: {
      bg: theme.COLORS.primary_100,
      icon: theme.COLORS.primary,
      border: theme.COLORS.primary_200,
    },
    savings: {
      bg: theme.COLORS.success_100,
      icon: theme.COLORS.success,
      border: theme.COLORS.success_200,
    },
    credit_card: {
      bg: theme.COLORS.secondary_100,
      icon: theme.COLORS.secondary,
      border: theme.COLORS.secondary_200,
    },
    wallet: {
      bg: theme.COLORS.warn_100,
      icon: theme.COLORS.warn,
      border: theme.COLORS.warn_200,
    },
  };
  return colors[type];
};
export const AccountCardContainer = styled(Box)<{ $type: AccountTypeVariant }>`
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  border-radius: 1rem;
  background-color: ${({ theme }) => theme.COLORS.surface};
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  border-left: 4px solid
    ${({ theme, $type }) => getAccountTypeColors(theme, $type).border};
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.SHADOWS.z_12};
  }
`;
export const AccountCardHeader = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
})`
  margin-bottom: 1rem;
`;
export const AccountTypeIcon = styled(Box)<{ $type: AccountTypeVariant }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background-color: ${({ theme, $type }) =>
    getAccountTypeColors(theme, $type).bg};
  svg {
    font-size: 1.25rem;
    color: ${({ theme, $type }) => getAccountTypeColors(theme, $type).icon};
  }
`;
export const AccountInfo = styled(Box)`
  flex: 1;
  margin-left: 0.75rem;
  min-width: 0;
`;
export const AccountName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: ${({ theme }) => theme.COLORS.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
export const AccountTypeLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.COLORS.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;
export const AccountActions = styled(Stack).attrs({
  direction: 'row',
  spacing: 0.5,
})`
  opacity: 0.7;
  transition: opacity 0.2s ease;
  ${AccountCardContainer}:hover & {
    opacity: 1;
  }
`;
export const BalanceSection = styled(Box)`
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.COLORS.border};
`;
export const BalanceValue = styled.p<{ $negative?: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: ${({ theme, $negative }) =>
    $negative ? theme.COLORS.error : theme.COLORS.text};
`;
export const BalanceLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;
export const CreditLimitInfo = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
`;
export const InfoLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;
export const InfoValue = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.COLORS.text};
`;
export const NegativeBalanceIndicator = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: ${({ theme }) => theme.COLORS.error_100};
  color: ${({ theme }) => theme.COLORS.error};
  font-size: 0.75rem;
  font-weight: 500;
`;
