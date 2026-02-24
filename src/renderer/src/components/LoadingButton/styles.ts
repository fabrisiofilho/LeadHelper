import styled from 'styled-components';

export const Content = styled.div`
  position: relative;
`;

type ChildrenContainerProps = {
  $hide: boolean;
};

export const ChildrenContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== '$hide',
})<ChildrenContainerProps>`
  opacity: ${({ $hide }) => ($hide ? 0 : 1)};

  display: flex;
  justify-content: center;
  align-items: center;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;
