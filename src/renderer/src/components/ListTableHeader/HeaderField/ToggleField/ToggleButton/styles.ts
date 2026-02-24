import { Button } from '@mui/material';
import styled, { css } from 'styled-components';

type CustomButtonProps = {
  active: boolean;
};

export const CustomButton = styled(Button).withConfig({
  shouldForwardProp: (prop) => prop !== 'active',
})<CustomButtonProps>`
  background-color: ${({ theme }) => theme.COLORS.grey_400} !important;
  color: ${({ theme }) => theme.COLORS.surface} !important;
  white-space: nowrap;
  border-radius: 1rem !important;
  gap: 0.313rem;

  & + & {
    margin-left: 1rem;
  }

  ${({ active, theme }) =>
    active &&
    css`
      background-color: ${theme.COLORS.secondary} !important;
    `}
`;
