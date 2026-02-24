import styled from 'styled-components';

export const Container = styled.div`
  width: 100%;
  overflow: hidden;

  flex: 1;
  display: flex;
`;

export const DrawerContent = styled.aside``;

export const MainContainer = styled.div`
  width: 100%;
  overflow: hidden;
  background-color: ${({ theme }) => theme.COLORS.surface};
`;

export const MainContent = styled.main`
  height: calc(100vh - 6rem);
  overflow-y: auto;

  background-color: ${({ theme }) => theme.COLORS.background};
`;
