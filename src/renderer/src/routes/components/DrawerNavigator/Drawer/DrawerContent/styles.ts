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
  justify-content: center;
  align-items: center;
  align-self: stretch;

  position: relative;

  height: 5.5rem;
  padding: 0 0.5rem;

  background-color: ${({ theme }) => theme.COLORS.surface};
`;

type LogoImageProps = {
  compacted: boolean;
};

export const LogoImage = styled.img.withConfig({
  shouldForwardProp: (propName) => propName !== 'compacted',
})<Readonly<LogoImageProps>>`
  height: 4.2rem;
  max-width: 13rem;
  object-fit: contain;

  -webkit-transition:
    opacity 0.2s ease-in-out,
    height 0.2s ease-in-out;
  -moz-transition:
    opacity 0.2s ease-in-out,
    height 0.2s ease-in-out;
  -o-transition:
    opacity 0.2s ease-in-out,
    height 0.2s ease-in-out;
  transition:
    opacity 0.2s ease-in-out,
    height 0.2s ease-in-out;

  ${({ compacted }) =>
    compacted &&
    css`
      height: 2.5rem;
      max-width: 3rem;
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
