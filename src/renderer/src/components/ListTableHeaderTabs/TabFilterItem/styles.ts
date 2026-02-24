import { Typography } from '@mui/material';
import styled, { css } from 'styled-components';

type ContainerProps = {
  active?: boolean;
  borderColor: string;
};

type CustomTitleProps = {
  active?: boolean;
};

export const Container = styled.div.withConfig({
  shouldForwardProp: (prop) => !['active', 'borderColor'].includes(prop),
})<ContainerProps>`
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.875rem 0rem;
  cursor: pointer;

  & + & {
    margin-left: 2.5rem;
  }

  ${({ active, borderColor }) =>
    active &&
    css`
      ::after {
        content: '';
        height: 0.125rem;
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: ${borderColor};
      }
    `}
`;

export const CustomTitle = styled(Typography).withConfig({
  shouldForwardProp: (prop) => !['active'].includes(prop),
})<CustomTitleProps>`
  white-space: nowrap;

  ${({ active, theme }) =>
    active &&
    css`
      color: ${theme.COLORS.text} !important;
    `}
`;
