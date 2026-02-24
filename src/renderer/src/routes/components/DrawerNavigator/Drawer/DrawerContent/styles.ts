import { rgba } from 'polished';
import styled, { css } from 'styled-components';

type ContainerProps = {
  compacted: boolean;
};

export const Container = styled.nav.withConfig({
  shouldForwardProp: (propName) => propName !== 'compacted',
})<Readonly<ContainerProps>>`
  width: 17.5rem;
  height: 100vh;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;

  overflow: hidden;
  white-space: nowrap;

  background-color: ${({ theme }) => theme.COLORS.surface};
  border-right: ${({ theme }) => theme.BORDERS.b_01};

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

export const LogoContainer = styled('div')`
  display: flex;
  justify-content: space-between;
  align-items: center;
  align-self: stretch;

  position: relative;

  height: 5.5rem;
  padding-left: 1rem;

  background-color: ${({ theme }) => theme.COLORS.surface};
`;

type LogoTextProps = {
  compacted: boolean;
};

export const LogoText = styled.span.withConfig({
  shouldForwardProp: (propName) => propName !== 'compacted',
})<Readonly<LogoTextProps>>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.COLORS.primary};

  -webkit-transition: opacity 0.2s ease-in-out;
  -moz-transition: opacity 0.2s ease-in-out;
  -o-transition: opacity 0.2s ease-in-out;
  transition: opacity 0.2s ease-in-out;

  ${({ compacted }) =>
    compacted &&
    css`
      opacity: 0;
    `}
`;

export const Content = styled.div`
  flex: 1;
  align-self: stretch;

  overflow-x: hidden;
  overflow-y: auto;

  ::-webkit-scrollbar {
    width: 0.3rem;
    background-color: none;
  }
  ::-webkit-scrollbar-track {
    background-color: none;
  }
  ::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => rgba(theme.COLORS.grey_500, 0.48)};
    border-radius: 1rem;
  }
`;
