import styled from 'styled-components';
import { Box } from '@mui/material';

export const IconPickerContainer = styled(Box)`
  padding: 1rem;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
`;

export const IconGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
`;

export const IconItem = styled(Box)<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.COLORS.primary_100 : 'transparent'};
  border: 2px solid
    ${({ theme, $selected }) =>
      $selected ? theme.COLORS.primary : 'transparent'};

  &:hover {
    background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  }

  svg {
    font-size: 1.25rem;
    color: ${({ theme, $selected }) =>
      $selected ? theme.COLORS.primary : theme.COLORS.textSecondary};
  }
`;
