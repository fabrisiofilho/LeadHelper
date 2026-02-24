import styled, { css } from 'styled-components';

type DynamicWidthContainerProps = {
  compacted: boolean;
};

export const DynamicWidthContainer = styled.div.withConfig({
  shouldForwardProp: (propName) => propName !== 'compacted',
})<DynamicWidthContainerProps>`
  width: 17.5rem;
  overflow: visible;
  z-index: 100;
  background-color: ${({ theme }) => theme.COLORS.surface};
  position: relative;

  -webkit-transition: width 0.2s ease-in-out;
  -moz-transition: width 0.2s ease-in-out;
  -o-transition: width 0.2s ease-in-out;
  transition: width 0.2s ease-in-out;

  ${({ compacted }) =>
    compacted &&
    css`
      width: 5rem;
    `};
`;
