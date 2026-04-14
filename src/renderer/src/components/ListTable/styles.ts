import { Stack, TableContainer, TableRow } from '@mui/material';
import Table from '@mui/material/Table';
import styled, { css } from 'styled-components';

type Props = {
  scrollAtTop?: boolean;
};

type ContainerProps = {
  disableShadow: boolean | undefined;
  fullHeight?: boolean;
};

export const Container = styled.div<ContainerProps>`
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  background-color: ${({ theme }) => theme.COLORS.surface};
  border: 1px solid ${({ theme }) => theme.COLORS.border};

  ${({ disableShadow }) =>
    disableShadow &&
    css`
      box-shadow: none;
    `}

  ${({ fullHeight }) =>
    fullHeight &&
    css`
      height: 100%;
    `}
`;

export const CustomTable = styled(Table)<Props>`
  ${({ scrollAtTop }) =>
    scrollAtTop &&
    css`
      transform: rotateX(180deg);
      -webkit-transform: rotateX(180deg);
      -moz-transform: rotateX(180deg);
      -o-transform: rotateX(180deg);
      filter: blur(0px) !important;
    `}
`;

export const CustomTableHeader = styled(TableContainer)<Props>`
  border-radius: 0.5rem;
`;

type CustomTableContainerProps = Props & {
  hasFooter: boolean;
  fullHeight?: boolean;
};

export const CustomTableContainer = styled(TableContainer).withConfig({
  shouldForwardProp: (propName) => propName !== 'hasFooter',
})<CustomTableContainerProps>`
  ${({ fullHeight }) =>
    fullHeight &&
    css`
      flex: 1;
    `}

  ${({ hasFooter }) =>
    hasFooter
      ? css`
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
        `
      : css`
          border-radius: 0.5rem;
        `}

  ${({ scrollAtTop }) =>
    scrollAtTop &&
    css`
      transform: rotateX(180deg);
      -webkit-transform: rotateX(180deg);
      -moz-transform: rotateX(180deg);
      -o-transform: rotateX(180deg);
    `}

  @media ${({ theme }) => theme.SIZES.xs} {
    table-layout: auto;
  }
`;

type CustomStackProps = Props & {
  fullHeight?: boolean;
};

export const CustomStack = styled(Stack)<CustomStackProps>`
  ${({ fullHeight }) =>
    fullHeight &&
    css`
      height: 100%;
    `}

  ${({ scrollAtTop }) =>
    scrollAtTop &&
    css`
      transform: rotateX(180deg);
      -webkit-transform: rotateX(180deg);
      -moz-transform: rotateX(180deg);
      -o-transform: rotateX(180deg);
    `}
`;

export const CustomTableRow = styled(TableRow)`
  ${({ onClick, theme }) =>
    onClick &&
    css`
      &:hover {
        cursor: pointer;
        background-color: ${theme.COLORS.surfaceAlt};
      }
    `}
`;
