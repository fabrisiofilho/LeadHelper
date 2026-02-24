import styled from 'styled-components';
import { Box, Stack, ToggleButtonGroup } from '@mui/material';
export const FormContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
`;
export const FormSection = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;
export const SectionTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.COLORS.text};
  margin-bottom: 0.25rem;
`;
export const FormGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  @media ${({ theme }) => theme.SIZES.xs} {
    grid-template-columns: 1fr;
  }
`;
export const FullWidthField = styled(Box)`
  grid-column: 1 / -1;
`;
export const TransactionTypeToggle = styled(ToggleButtonGroup)`
  width: 100%;
  margin-bottom: 0.5rem;
  .MuiToggleButton-root {
    flex: 1;
    padding: 0.75rem 1rem;
    font-weight: 600;
    text-transform: none;
    border-radius: 0.5rem;
    border: 2px solid ${({ theme }) => theme.COLORS.border};
    transition: all 0.2s ease;
    &:first-of-type {
      border-radius: 0.5rem 0 0 0.5rem;
    }
    &:last-of-type {
      border-radius: 0 0.5rem 0.5rem 0;
    }
    &.Mui-selected {
      border-color: transparent;
    }
  }
`;
export const IncomeButton = styled(Box)<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: ${({ theme, $selected }) =>
    $selected ? theme.COLORS.success_300 : theme.COLORS.textSecondary};
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.COLORS.success_100 : 'transparent'};
  svg {
    font-size: 1.25rem;
  }
`;
export const ExpenseButton = styled(Box)<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: ${({ theme, $selected }) =>
    $selected ? theme.COLORS.error_300 : theme.COLORS.textSecondary};
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.COLORS.error_100 : 'transparent'};
  svg {
    font-size: 1.25rem;
  }
`;
export const AdditionalOptionsContainer = styled(Stack).attrs({
  direction: 'row',
  spacing: 2,
  alignItems: 'center',
})`
  padding: 1rem;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-radius: 0.5rem;
  border: 1px solid ${({ theme }) => theme.COLORS.border};
`;
export const OptionLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.COLORS.text};
`;
export const InstallmentsContainer = styled(Box)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;
export const InstallmentText = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.COLORS.textSecondary};
  white-space: nowrap;
`;
export const InstallmentPreview = styled(Box)`
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.COLORS.primary_100};
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.COLORS.primary_300};
`;
export const FormDivider = styled(Box)`
  height: 1px;
  background-color: ${({ theme }) => theme.COLORS.border};
  margin: 0.5rem 0;
`;
export const ErrorContainer = styled(Box)`
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) => theme.COLORS.error_100};
  border-radius: 0.5rem;
  border: 1px solid ${({ theme }) => theme.COLORS.error_200};
  color: ${({ theme }) => theme.COLORS.error_300};
  font-size: 0.875rem;
`;
