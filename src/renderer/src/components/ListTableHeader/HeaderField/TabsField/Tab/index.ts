import { Button } from '@mui/material';
import styled, { css } from 'styled-components';

type TabProps = {
  active: boolean;
};

export const Tab = styled(Button).withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<TabProps>`
  color: ${({ theme }) => theme.COLORS.textSecondary} !important;
  white-space: nowrap;

  & + & {
    margin-left: 1rem;
  }

  ${({ active, theme }) =>
    active &&
    css`
      background-color: ${theme.COLORS.primary_100} !important;
    `}
`;
