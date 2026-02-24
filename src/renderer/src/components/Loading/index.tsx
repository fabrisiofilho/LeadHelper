import { CircularProgress } from '@mui/material';
import styled, { css } from 'styled-components';

type LoadingStyleProps = {
  loadingColor?: string;
};

export const Loading = styled(CircularProgress).withConfig({
  shouldForwardProp: (props) => props !== 'loadingColor',
})<LoadingStyleProps>`
  &.MuiCircularProgress-root {
    margin: 0 auto;
    color: ${({ theme }) => theme.COLORS.primary};

    ${({ loadingColor }) =>
      !!loadingColor &&
      css`
        color: ${loadingColor} !important;
      `}
  }
`;
