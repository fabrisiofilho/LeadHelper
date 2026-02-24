import styled from 'styled-components';
import { Box, Stack } from '@mui/material';
export const InvoiceContainer = styled(Box)`
  padding: 1rem;
  border-radius: 0.75rem;
  background-color: ${({ theme }) => theme.COLORS.surface};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
`;
export const InvoiceHeader = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  margin-bottom: 0.75rem;
`;
export const InvoiceTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  color: ${({ theme }) => theme.COLORS.text};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;
export const InvoiceStatusBadge = styled.span<{
  $status: 'open' | 'closed' | 'paid' | 'overdue';
}>`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
  background-color: ${({ theme, $status }) =>
    $status === 'paid'
      ? theme.COLORS.success_100
      : $status === 'closed'
        ? theme.COLORS.warn_100
        : $status === 'overdue'
          ? theme.COLORS.error_100
          : theme.COLORS.info_100};
  color: ${({ theme, $status }) =>
    $status === 'paid'
      ? theme.COLORS.success_300
      : $status === 'closed'
        ? theme.COLORS.warn_300
        : $status === 'overdue'
          ? theme.COLORS.error_300
          : theme.COLORS.info_300};
`;
export const InvoiceInfoSection = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
})`
  margin-top: 0.5rem;
`;
export const InvoiceAmount = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.COLORS.text};
`;
export const InvoiceDueDate = styled.span<{ $isOverdue?: boolean }>`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme, $isOverdue }) =>
    $isOverdue ? theme.COLORS.error : theme.COLORS.textSecondary};
`;
export const TransactionsList = styled(Box)`
  margin-top: 1rem;
  max-height: 250px;
  overflow-y: auto;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.COLORS.surfaceAlt};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.COLORS.grey_400};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.COLORS.grey_500};
  }
`;
export const TransactionItem = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  padding: 0.5rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.COLORS.border};
  &:last-child {
    border-bottom: none;
  }
`;
export const TransactionInfo = styled(Box)`
  flex: 1;
  min-width: 0;
`;
export const TransactionDescription = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.COLORS.text};
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
export const TransactionDate = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;
export const TransactionAmount = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.COLORS.error};
  margin-left: 1rem;
  white-space: nowrap;
`;
export const InvoiceActions = styled(Stack).attrs({
  direction: 'row',
  spacing: 1,
  justifyContent: 'flex-end',
})`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.COLORS.border};
`;
export const EmptyTransactionsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  text-align: center;
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;
export const InvoiceSummary = styled(Box)`
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  margin-bottom: 0.75rem;
`;
export const SummaryRow = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  &:not(:last-child) {
    margin-bottom: 0.5rem;
  }
`;
export const SummaryLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.COLORS.textSecondary};
`;
export const SummaryValue = styled.span<{ $highlight?: boolean }>`
  font-size: 0.875rem;
  font-weight: ${({ $highlight }) => ($highlight ? 700 : 500)};
  color: ${({ theme, $highlight }) =>
    $highlight ? theme.COLORS.text : theme.COLORS.text};
`;
